import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import { HistoryPane } from './HistoryPane';
import './StatsPane.css';

interface Props { user: User; refreshKey?: number }

/* ============================================================
   Period definition — calendar-month-aligned.
   months = 0  → "1 week" (last 7 days, single row)
   months = N  → N full calendar months ending at end-of-this-month
   ============================================================ */
interface Period { label: string; months: number }

const PERIODS: Period[] = [
  { label: '1 week',   months: 0  },
  { label: '1 month',  months: 1  },
  { label: '2 months', months: 2  },
  { label: '3 months', months: 3  },
  { label: '4 months', months: 4  },
  { label: '6 months', months: 6  },
  { label: '1 year',   months: 12 },
];

const DOW_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const GAP        = 2;
const MONTH_GAP  = 10;
const CELL_MIN   = 7;
const CELL_MAX   = 18;

/* ---- Date helpers ---- */

/** YYYY-MM-DD of today − N days (in local time). */
function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Add `n` calendar days to a date. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/**
 * First day of the calendar month that is `monthsBack` months before the
 * current month.  monthsBack=0 → first day of THIS month.
 */
function firstOfMonthsAgo(monthsBack: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsBack);
  return ymd(d);
}

/** Last day of the current calendar month. */
function lastOfThisMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);   // day 0 of next month = last day of this month
  return ymd(d);
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function intensityBucket(ms: number): 0|1|2|3|4 {
  if (ms <= 0) return 0;
  const m = ms / 60000;
  if (m < 30)  return 1;
  if (m < 90)  return 2;
  if (m < 180) return 3;
  return 4;
}

interface HeatCell { date: string; ms: number; bucket: 0|1|2|3|4; isToday: boolean; isFuture: boolean }
interface TooltipState { date: string; ms: number; x: number; y: number; below: boolean }

function animateScroll(
  el: HTMLElement, from: number, to: number, dur: number, onDone?: () => void,
): () => void {
  let raf = 0;
  const t0 = performance.now();
  const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
  const step = (now: number) => {
    const p = Math.min((now - t0) / dur, 1);
    el.scrollLeft = from + (to - from) * ease(p);
    if (p < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* ---- Custom dropdown ---- */
function PeriodDropdown({ options, value, onChange }: {
  options: Period[]; value: number; onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc   = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown',   esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className={`period-dd${open ? ' is-open' : ''}`}>
      <button type="button" className="period-dd__trigger" onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox" aria-expanded={open}>
        {options[value]!.label}
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" aria-hidden className="period-dd__chevron">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <ul className="period-dd__list" role="listbox">
          {options.map((opt, i) => (
            <li key={i}>
              <button type="button" role="option" aria-selected={i === value}
                className={`period-dd__item${i === value ? ' is-active' : ''}`}
                onClick={() => { onChange(i); setOpen(false); }}>
                {opt.label}
                {i === value && (
                  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor"
                    strokeWidth={2.5} strokeLinecap="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const isTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

/* =========================================================================
   Main component
   ========================================================================= */
export function StatsPane({ user, refreshKey }: Props) {
  const [rows,      setRows]      = useState<SessionRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  // Default: 3 months (index 3 in PERIODS)
  const [periodIdx, setPeriodIdx] = useState(3);
  const [cWidth,    setCWidth]    = useState(0);
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null);

  const paneRef    = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const period = PERIODS[periodIdx]!;
  const isWeek = period.months === 0;

  /* ---- Calendar-aligned date range ----
   *
   * Week view : startStr = 6 days ago,  endStr = today,          DAYS = 7
   * Month view: startStr = 1st of (N-1) months ago,
   *             endStr   = last day of current month,
   *             DAYS     = calendar span (includes future cells for rest of month)
   *
   * WHY include future cells:
   *   Shows a complete month-grid shape (e.g. all 30 June cells)
   *   even when today is June 4. Future cells just render with bucket=0.
   *   This is the same behaviour as GitHub's contribution calendar.
   */
  const { startStr, DAYS } = useMemo(() => {
    if (isWeek) {
      const s = dateNDaysAgo(6);
      const e = dateNDaysAgo(0);
      return { startStr: s, endStr: e, DAYS: 7 };
    }
    const s = firstOfMonthsAgo(period.months - 1);
    const e = lastOfThisMonth();
    const days = Math.round(
      (new Date(e + 'T00:00:00').getTime() - new Date(s + 'T00:00:00').getTime()) / 86400000
    ) + 1;
    return { startStr: s, DAYS: days };
  }, [isWeek, period.months]);

  /* Always use month-block layout for month views.
     Simple single-row grid only for the 1-week view. */
  const useMonthLayout = !isWeek;
  const ROWS = isWeek ? 1 : 7;

  /* oldest weekday — needed to compute which column each date falls in. */
  const oldestWeekday = isWeek
    ? 0
    : new Date(startStr + 'T00:00:00').getDay();

  /* COLS — same formula as before; accounts for weekday offset. */
  const COLS = isWeek ? 7 : Math.ceil((DAYS + oldestWeekday) / 7);

  /* ResizeObserver */
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setCWidth(el.clientWidth);
    const ro = new ResizeObserver(es => setCWidth(es[0]!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Fetch
   * We always fetch from max(startStr, 364 days ago) so that the streak
   * counter has at least a year's worth of data regardless of which period
   * is displayed in the heatmap.
   */
  const fetchStart = useMemo(() => {
    const yearAgo = dateNDaysAgo(364);
    return startStr < yearAgo ? startStr : yearAgo;
  }, [startStr]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessionsByDateRange(user.id, fetchStart, dateNDaysAgo(0))
      .then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user.id, refreshKey, fetchStart]);

  const totalsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
      m.set(r.date_local, (m.get(r.date_local) ?? 0) + Math.max(0, ms));
    }
    return m;
  }, [rows]);

  /* Build cell array — iterate forward from startStr to endStr.
   * Future cells (date > today) render with bucket=0 and no data. */
  const cells = useMemo<HeatCell[]>(() => {
    const today = dateNDaysAgo(0);
    return Array.from({ length: DAYS }, (_, i) => {
      const date = addDays(startStr, i);
      const isFuture = date > today;
      const ms = isFuture ? 0 : (totalsByDate.get(date) ?? 0);
      return { date, ms, bucket: isFuture ? 0 : intensityBucket(ms), isToday: date === today, isFuture };
    });
  }, [totalsByDate, DAYS, startStr]);

  /* Pre-index cells by absolute column for month-block layout */
  const cellsByAbsCol = useMemo(() => {
    const map = new Map<number, Array<{ cell: HeatCell; row: number }>>();
    cells.forEach((cell, i) => {
      const col = Math.floor((i + oldestWeekday) / 7);
      const row = (i + oldestWeekday) % 7;
      if (!map.has(col)) map.set(col, []);
      map.get(col)!.push({ cell, row });
    });
    return map;
  }, [cells, oldestWeekday]);

  /* Month blocks */
  const monthBlocks = useMemo(() => {
    if (!useMonthLayout || cells.length === 0) return [];
    const blocks: Array<{ key: string; label: string; firstAbsCol: number; numCols: number }> = [];
    let lastKey = '';
    for (let col = 0; col < COLS; col++) {
      const idx = Math.max(0, col * 7 - oldestWeekday);
      if (idx >= cells.length) break;
      const d = new Date(cells[idx]!.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== lastKey) {
        blocks.push({
          key,
          label: d.toLocaleDateString(undefined, { month: 'short' }),
          firstAbsCol: col,
          numCols: 1,
        });
        lastKey = key;
      } else {
        blocks[blocks.length - 1]!.numCols++;
      }
    }
    return blocks;
  }, [cells, COLS, oldestWeekday, useMonthLayout]);

  const numMonths = monthBlocks.length;

  const cellSize = cWidth > 0 ? CELL_MAX : CELL_MIN;

  const needsScroll = useMemo(() => {
    if (cWidth <= 0) return false;
    const total = useMonthLayout && numMonths > 1
      ? COLS * CELL_MAX + (COLS-1)*GAP + numMonths*MONTH_GAP
      : COLS * CELL_MAX + (COLS-1)*GAP;
    return total > cWidth;
  }, [cWidth, COLS, useMonthLayout, numMonths]);

  /* Auto-scroll to right (newest data) then hint left */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !needsScroll) return;
    const raf = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });
    let cancelNudge: (() => void) | null = null; let t2 = 0;
    const t1 = window.setTimeout(() => {
      const startPos = el.scrollLeft || el.scrollWidth - el.clientWidth;
      cancelNudge = animateScroll(el, startPos, startPos - 48, 700, () => {
        t2 = window.setTimeout(() => {
          cancelNudge = animateScroll(el, startPos - 48, startPos, 550);
        }, 650);
      });
    }, 600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelNudge?.();
    };
  }, [needsScroll, periodIdx]);

  /* Streak + window total (always uses full totalsByDate, so streak is accurate
   * even when the heatmap shows fewer months than a year). */
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) { if ((totalsByDate.get(dateNDaysAgo(i)) ?? 0) > 0) s++; else break; }
    return s;
  }, [totalsByDate]);

  const windowTotalMs = useMemo(() => {
    // Only sum dates within the displayed period (not the extra 365-day fetch)
    let t = 0;
    for (const cell of cells) {
      if (!cell.isFuture) t += cell.ms;
    }
    return t;
  }, [cells]);

  /* Col labels for week view only */
  const colLabels = useMemo<string[]>(() => {
    if (!isWeek) return [];
    return cells.map(c => DOW_SHORT[new Date(c.date + 'T00:00:00').getDay()]!);
  }, [cells, isWeek]);

  /* Tooltip */
  const showTooltip = (cell: HeatCell, e: React.MouseEvent | React.TouchEvent) => {
    const pane = paneRef.current;
    if (!pane) return;
    const pr = pane.getBoundingClientRect();
    const cr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = cr.left - pr.left + cr.width / 2;
    const cyTop = cr.top - pr.top;
    const below = cyTop < pr.height * 0.42;
    setTooltip({ date: cell.date, ms: cell.ms, x: cx, y: below ? cyTop + cr.height : cyTop, below });
  };
  const hideTooltip = () => setTooltip(null);
  const toggleTooltip = (cell: HeatCell, e: React.MouseEvent) => {
    if (tooltip?.date === cell.date) hideTooltip(); else showTooltip(cell, e);
  };

  const cellHandlers = (cell: HeatCell) => isTouch
    ? { onClick: (e: React.MouseEvent) => toggleTooltip(cell, e) }
    : { onMouseEnter: (e: React.MouseEvent) => showTooltip(cell, e), onMouseLeave: hideTooltip };

  const fmtDate = (d: string) => new Date(d+'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const cs = cellSize;
  // week-view grid strings
  const gridCols = `repeat(${COLS}, ${cs}px)`;
  const gridRows = `repeat(${ROWS}, ${cs}px)`;

  return (
    <div className="stats-pane" ref={paneRef}>
      {/* Header */}
      <div className="stats-pane__top">
        <h3>Stats</h3>
        <PeriodDropdown options={PERIODS} value={periodIdx}
          onChange={(i) => { setPeriodIdx(i); setTooltip(null); }} />
      </div>

      {/* Stat cards */}
      <div className="stats-row">
        <div className="stats-card">
          <div className="stats-card__label">Current streak</div>
          <div className="stats-card__value">
            {streak}<span className="stats-card__unit"> day{streak === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card__label">{period.label} total</div>
          <div className="stats-card__value stats-card__value--mono">{fmtDuration(windowTotalMs)}</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="stats-heatmap-section">
        <div ref={measureRef} className="stats-heatmap-measure">
          {loading && <p className="stats-loading">Loading…</p>}

          {!loading && (
            <div
              ref={scrollRef}
              className={`stats-heatmap-scroll${needsScroll ? ' is-scrollable' : ''}`}
            >
              {/* Month-block layout — used for ALL month periods */}
              {useMonthLayout && (
                <div className="stats-months-row">
                  {monthBlocks.map(block => {
                    const blockCells: Array<{ cell: HeatCell; col: number; row: number }> = [];
                    for (let ac = block.firstAbsCol; ac < block.firstAbsCol + block.numCols; ac++) {
                      for (const { cell, row } of (cellsByAbsCol.get(ac) ?? [])) {
                        blockCells.push({ cell, col: ac - block.firstAbsCol, row });
                      }
                    }
                    return (
                      <div key={block.key} className="stats-month-block">
                        <div
                          className="stats-month-grid"
                          style={{
                            gridTemplateColumns: `repeat(${block.numCols}, ${cs}px)`,
                            gridTemplateRows:    `repeat(7, ${cs}px)`,
                            gap: `${GAP}px`,
                          }}
                          aria-label={block.label}
                        >
                          {blockCells.map(({ cell, col, row }) => (
                            <span
                              key={cell.date}
                              className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}${cell.isFuture ? ' is-future' : ''}`}
                              style={{ gridColumn: col+1, gridRow: row+1, width: cs, height: cs }}
                              {...cellHandlers(cell)}
                            />
                          ))}
                        </div>
                        <div className="stats-month-name">{block.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Simple single-row grid — week view only */}
              {!useMonthLayout && (
                <>
                  <div
                    className="stats-heatmap"
                    style={{ gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
                    role="img"
                    aria-label="7-day focus"
                  >
                    {cells.map((cell, i) => (
                      <span key={cell.date}
                        className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}`}
                        style={{ gridColumn: i+1, gridRow: 1, width: cs, height: cs }}
                        {...cellHandlers(cell)}
                      />
                    ))}
                  </div>
                  {colLabels.some(Boolean) && (
                    <div className="stats-xlabel">
                      {colLabels.map((lbl, col) => (
                        <span key={col} className="stats-xlabel__cell" style={{ width: cs }}>{lbl}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        {!loading && (
          <div className="stats-legend" aria-hidden>
            <span>Less</span>
            {([0,1,2,3,4] as const).map(b => <span key={b} className={`stats-legend__cell b${b}`} />)}
            <span>More</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className={`stats-tooltip${tooltip.below ? ' is-below' : ''}`}
          style={{ left: tooltip.x, top: tooltip.y }} aria-hidden>
          <span className="stats-tooltip__date">{fmtDate(tooltip.date)}</span>
          <span className="stats-tooltip__val">{fmtDuration(tooltip.ms)}</span>
        </div>
      )}

      {/* Inline history below the heatmap */}
      <div className="stats-history-divider" aria-hidden />
      <HistoryPane user={user} refreshKey={refreshKey} embedded />
    </div>
  );
}
