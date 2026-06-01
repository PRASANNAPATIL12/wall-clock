import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import './StatsPane.css';

interface Props { user: User; refreshKey?: number }

interface Period { label: string; days: number }

const PERIODS: Period[] = [
  { label: '1 week',   days: 7   },
  { label: '1 month',  days: 30  },
  { label: '2 months', days: 60  },
  { label: '3 months', days: 90  },
  { label: '4 months', days: 120 },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
];

const DOW_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_SINGLE = ['S','M','T','W','T','F','S'];
const GAP        = 2;   // px between cells within a block
const MONTH_GAP  = 10;  // px between month blocks
const CELL_MIN   = 7;   // minimum cell px before horizontal scroll
const CELL_MAX   = 18;  // maximum cell px (never over-inflate)

/* ---- Helpers ---- */

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

interface HeatCell { date: string; ms: number; bucket: 0|1|2|3|4; isToday: boolean }
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

/* =========================================================================
   Main component
   ========================================================================= */

const isTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

export function StatsPane({ user, refreshKey }: Props) {
  const [rows,      setRows]      = useState<SessionRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [periodIdx, setPeriodIdx] = useState(1);
  const [cWidth,    setCWidth]    = useState(0);
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null);

  const paneRef    = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const period = PERIODS[periodIdx]!;
  const DAYS   = period.days;
  const isWeek = DAYS === 7;

  /* Use month-block layout for 2M+ views */
  const useMonthLayout = DAYS >= 60;

  const ROWS = isWeek ? 1 : 7;
  const COLS = isWeek ? 7 : Math.ceil(DAYS / 7);

  /* ResizeObserver — start at CELL_MIN to avoid initial overflow */
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setCWidth(el.clientWidth);
    const ro = new ResizeObserver(es => setCWidth(es[0]!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Fetch */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessionsByDateRange(user.id, dateNDaysAgo(DAYS-1), dateNDaysAgo(0))
      .then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user.id, refreshKey, DAYS]);

  const totalsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
      m.set(r.date_local, (m.get(r.date_local) ?? 0) + Math.max(0, ms));
    }
    return m;
  }, [rows]);

  const cells = useMemo<HeatCell[]>(() => {
    const today = dateNDaysAgo(0);
    return Array.from({ length: DAYS }, (_, i) => {
      const date = dateNDaysAgo(DAYS - 1 - i);
      const ms   = totalsByDate.get(date) ?? 0;
      return { date, ms, bucket: intensityBucket(ms), isToday: date === today };
    });
  }, [totalsByDate, DAYS]);

  const oldestWeekday = useMemo(
    () => cells.length > 0 ? new Date(cells[0]!.date + 'T00:00:00').getDay() : 0,
    [cells],
  );

  /* Pre-index cells by absolute column for O(1) block lookup */
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

  /* Month blocks — one entry per calendar month that appears in the window */
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
          label: d.toLocaleDateString(undefined, { month: DAYS <= 90 ? 'short' : 'narrow' }),
          firstAbsCol: col,
          numCols: 1,
        });
        lastKey = key;
      } else {
        blocks[blocks.length - 1]!.numCols++;
      }
    }
    return blocks;
  }, [cells, COLS, oldestWeekday, DAYS, useMonthLayout]);

  const numMonths = monthBlocks.length;

  /* Cell size: account for month gaps in month-block layout */
  const cellSize = useMemo(() => {
    if (cWidth <= 0) return CELL_MIN; // safe until measured
    if (useMonthLayout && numMonths > 1) {
      const available = cWidth - numMonths * MONTH_GAP - (COLS - 1) * GAP;
      return Math.min(CELL_MAX, Math.max(CELL_MIN, Math.floor(available / COLS)));
    }
    return Math.min(CELL_MAX, Math.max(CELL_MIN, Math.floor((cWidth - (COLS-1)*GAP) / COLS)));
  }, [cWidth, COLS, useMonthLayout, numMonths]);

  /* Need scroll when total width would exceed container */
  const needsScroll = useMemo(() => {
    if (cWidth <= 0) return false;
    const total = useMonthLayout && numMonths > 1
      ? COLS * cellSize + (COLS-1)*GAP + numMonths*MONTH_GAP
      : COLS * cellSize + (COLS-1)*GAP;
    return total > cWidth;
  }, [cWidth, COLS, cellSize, useMonthLayout, numMonths]);

  /* Scroll hint */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !needsScroll) return;
    let cancel: (() => void) | null = null; let t2 = 0;
    const t1 = window.setTimeout(() => {
      cancel = animateScroll(el, 0, 40, 750, () => {
        t2 = window.setTimeout(() => { cancel = animateScroll(el, 40, 0, 550); }, 650);
      });
    }, 350);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); cancel?.(); };
  }, [needsScroll, periodIdx]);

  /* Streak + total */
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) { if ((totalsByDate.get(dateNDaysAgo(i)) ?? 0) > 0) s++; else break; }
    return s;
  }, [totalsByDate]);

  const windowTotalMs = useMemo(() => { let t = 0; for (const v of totalsByDate.values()) t += v; return t; }, [totalsByDate]);

  /* Col labels for simple grid */
  const colLabels = useMemo<string[]>(() => {
    if (isWeek) return cells.map(c => DOW_SHORT[new Date(c.date + 'T00:00:00').getDay()]!);
    const labels = Array<string>(COLS).fill('');
    if (!useMonthLayout && DAYS <= 31) {
      for (let col = 0; col < COLS; col++) {
        const idx = Math.max(0, col*7 - oldestWeekday);
        if (idx < cells.length) labels[col] = String(new Date(cells[idx]!.date + 'T00:00:00').getDate());
      }
    }
    return labels;
  }, [cells, COLS, oldestWeekday, DAYS, isWeek, useMonthLayout]);

  const showRowLabels = !isWeek && DAYS <= 60 && !useMonthLayout;
  const colOffset = showRowLabels ? 1 : 0;
  const gridCols = showRowLabels ? `14px repeat(${COLS}, ${cellSize}px)` : `repeat(${COLS}, ${cellSize}px)`;
  const gridRows = `repeat(${ROWS}, ${cellSize}px)`;

  /* Tooltip flip */
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

  return (
    <div className="stats-pane" ref={paneRef}>
      {/* Header */}
      <div className="stats-pane__top">
        <h3>Stats</h3>
        <PeriodDropdown options={PERIODS} value={periodIdx}
          onChange={(i) => { setPeriodIdx(i); setTooltip(null); }} />
      </div>

      {/* Stat cards — NEVER scroll */}
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

      {/* -------- Heatmap section (only this scrolls) -------- */}
      <div className="stats-heatmap-section">
        <div ref={measureRef} className="stats-heatmap-measure">
          {loading && <p className="stats-loading">Loading…</p>}

          {!loading && (
            /* Scroll container — ONLY the grid moves, never the cards above */
            <div
              ref={scrollRef}
              className={`stats-heatmap-scroll${needsScroll ? ' is-scrollable' : ''}`}
            >
              {/* ---- Month-block layout (2M, 3M … 1Y) ---- */}
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
                            gridTemplateRows: `repeat(7, ${cs}px)`,
                            gap: `${GAP}px`,
                          }}
                          aria-label={block.label}
                        >
                          {blockCells.map(({ cell, col, row }) => (
                            <span
                              key={cell.date}
                              className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}`}
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

              {/* ---- Simple grid layout (1W, 1M) ---- */}
              {!useMonthLayout && (
                <>
                  <div
                    className="stats-heatmap"
                    style={{ gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
                    role="img"
                    aria-label={`${DAYS}-day focus heatmap`}
                  >
                    {showRowLabels && DOW_SINGLE.map((d, i) => (
                      <span key={`r${i}`} className="stats-yaxis-label"
                        style={{ gridColumn: 1, gridRow: i+1, height: cs, lineHeight: `${cs}px` }}>
                        {d}
                      </span>
                    ))}

                    {cells.map((cell, i) => {
                      let col: number, row: number;
                      if (isWeek) { col = i; row = 0; }
                      else { col = Math.floor((i + oldestWeekday) / 7); row = (i + oldestWeekday) % 7; }
                      return (
                        <span key={cell.date}
                          className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}`}
                          style={{ gridColumn: col + colOffset + 1, gridRow: row+1, width: cs, height: cs }}
                          {...cellHandlers(cell)}
                        />
                      );
                    })}
                  </div>

                  {(colLabels.some(Boolean)) && (
                    <div className="stats-xlabel"
                      style={{ paddingLeft: showRowLabels ? `${14 + GAP}px` : undefined }}>
                      {showRowLabels && <span />}
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

        {/* Legend — NEVER scrolls */}
        {!loading && (
          <div className="stats-legend" aria-hidden>
            <span>Less</span>
            {([0,1,2,3,4] as const).map(b => <span key={b} className={`stats-legend__cell b${b}`} />)}
            <span>More</span>
          </div>
        )}
      </div>

      {/* Tooltip — absolute to .stats-pane */}
      {tooltip && (
        <div className={`stats-tooltip${tooltip.below ? ' is-below' : ''}`}
          style={{ left: tooltip.x, top: tooltip.y }} aria-hidden>
          <span className="stats-tooltip__date">{fmtDate(tooltip.date)}</span>
          <span className="stats-tooltip__val">{fmtDuration(tooltip.ms)}</span>
        </div>
      )}
    </div>
  );
}
