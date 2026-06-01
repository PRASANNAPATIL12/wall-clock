import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import './StatsPane.css';

interface Props { user: User; refreshKey?: number }

/* ---- Periods ---- */
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

const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_SINGLE = ['S','M','T','W','T','F','S'];

// Grid constants
const GAP = 2;          // px gap between cells
const CELL_MIN = 7;     // below this → horizontal scroll kicks in
const CELL_MAX = 18;    // cells never grow larger than this

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

/** Hand-crafted easeInOutCubic animation for scrollLeft.
 *  Reused from TagPicker for the same scroll-hint gesture. */
function animateScroll(
  el: HTMLElement, from: number, to: number, dur: number, onDone?: () => void,
): () => void {
  let raf = 0;
  const t0 = performance.now();
  const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  const step = (now: number) => {
    const p = Math.min((now - t0) / dur, 1);
    el.scrollLeft = from + (to - from) * ease(p);
    if (p < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* ---- Custom glass dropdown ---- */

function PeriodDropdown({
  options, value, onChange,
}: { options: Period[]; value: number; onChange: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const closeOnEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOnClick);
    document.addEventListener('keydown', closeOnEsc);
    return () => {
      document.removeEventListener('mousedown', closeOnClick);
      document.removeEventListener('keydown', closeOnEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className={`period-dd${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="period-dd__trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {options[value]!.label}
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className="period-dd__chevron">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <ul className="period-dd__list" role="listbox">
          {options.map((opt, i) => (
            <li key={i}>
              <button
                type="button"
                role="option"
                aria-selected={i === value}
                className={`period-dd__item${i === value ? ' is-active' : ''}`}
                onClick={() => { onChange(i); setOpen(false); }}
              >
                {opt.label}
                {i === value && (
                  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
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
   StatsPane
   ========================================================================= */

const isTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

export function StatsPane({ user, refreshKey }: Props) {
  const [rows,      setRows]      = useState<SessionRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [periodIdx, setPeriodIdx] = useState(1); // default: 1 month
  const [cWidth,    setCWidth]    = useState(0); // measured container width
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null);

  const paneRef      = useRef<HTMLDivElement>(null);   // tooltip anchor
  const measureRef   = useRef<HTMLDivElement>(null);   // ResizeObserver target
  const scrollRef    = useRef<HTMLDivElement>(null);   // horizontal scroll container

  const period = PERIODS[periodIdx]!;
  const DAYS   = period.days;

  /* Is this the special 1-week single-row layout? */
  const isWeek = DAYS === 7;

  /* Grid dimensions */
  const ROWS = isWeek ? 1 : 7;
  const COLS = isWeek ? 7 : Math.ceil(DAYS / 7);

  /* Compute optimal square cell size from container width */
  const cellSize = useMemo(() => {
    if (cWidth <= 0) return CELL_MAX;
    const ideal = Math.floor((cWidth - (COLS - 1) * GAP) / COLS);
    return Math.min(CELL_MAX, Math.max(CELL_MIN, ideal));
  }, [cWidth, COLS]);

  /* When cells would be smaller than CELL_MIN → allow horizontal scroll */
  const needsScroll = useMemo(() => {
    if (cWidth <= 0) return false;
    return COLS * CELL_MIN + (COLS - 1) * GAP > cWidth;
  }, [cWidth, COLS]);

  /* The effective cell size when scrolling (fixed at CELL_MIN) */
  const scrollCellSize = needsScroll ? CELL_MIN : cellSize;

  /* Measure container width via ResizeObserver */
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setCWidth(el.clientWidth);
    const ro = new ResizeObserver(es => setCWidth(es[0]!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Fetch sessions for the selected period */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessionsByDateRange(user.id, dateNDaysAgo(DAYS - 1), dateNDaysAgo(0))
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

  /* Build cell array: oldest first (index 0 = DAYS-1 ago) */
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

  /* Which grid columns start a new month (for visual separator) */
  const monthStartCols = useMemo(() => {
    if (isWeek || DAYS < 60 || cells.length === 0) return new Set<number>();
    const set = new Set<number>();
    let lastMonth = new Date(cells[0]!.date + 'T00:00:00').getMonth();
    for (let col = 1; col < COLS; col++) {
      const idx = Math.max(0, col * 7 - oldestWeekday);
      if (idx < cells.length) {
        const month = new Date(cells[idx]!.date + 'T00:00:00').getMonth();
        if (month !== lastMonth) { set.add(col); lastMonth = month; }
      }
    }
    return set;
  }, [cells, COLS, oldestWeekday, isWeek, DAYS]);

  /* Column labels: dates for 1M, day abbrevs for 1W, month names for 2M+ */
  const colLabels = useMemo<string[]>(() => {
    if (isWeek) {
      return cells.map(c =>
        DOW_SHORT[new Date(c.date + 'T00:00:00').getDay()]!,
      );
    }
    const labels = Array<string>(COLS).fill('');
    if (DAYS <= 31) {
      // 1 month: date number at start of each week column
      for (let col = 0; col < COLS; col++) {
        const idx = Math.max(0, col * 7 - oldestWeekday);
        if (idx < cells.length)
          labels[col] = String(new Date(cells[idx]!.date + 'T00:00:00').getDate());
      }
    } else {
      // Multi-month: month name at first column of each new month
      let lastMonth = -1;
      for (let col = 0; col < COLS; col++) {
        const idx = Math.max(0, col * 7 - oldestWeekday);
        if (idx < cells.length) {
          const d = new Date(cells[idx]!.date + 'T00:00:00');
          const month = d.getMonth();
          if (month !== lastMonth) {
            labels[col] = d.toLocaleDateString(undefined, {
              month: DAYS <= 90 ? 'short' : 'narrow',
            });
            lastMonth = month;
          }
        }
      }
    }
    return labels;
  }, [cells, COLS, oldestWeekday, DAYS, isWeek]);

  /* Streak + window total */
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      if ((totalsByDate.get(dateNDaysAgo(i)) ?? 0) > 0) s++;
      else break;
    }
    return s;
  }, [totalsByDate]);

  const windowTotalMs = useMemo(() => {
    let t = 0;
    for (const v of totalsByDate.values()) t += v;
    return t;
  }, [totalsByDate]);

  /* Scroll hint when period changes and scroll is needed */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !needsScroll) return;
    let cancel: (() => void) | null = null;
    let t2 = 0;
    const t1 = window.setTimeout(() => {
      cancel = animateScroll(el, 0, 40, 750, () => {
        t2 = window.setTimeout(() => { cancel = animateScroll(el, 40, 0, 550); }, 650);
      });
    }, 350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancel?.();
    };
  }, [needsScroll, periodIdx]);

  /* Tooltip — flip below when cell is in upper portion of pane */
  const showTooltip = (cell: HeatCell, e: React.MouseEvent | React.TouchEvent) => {
    const pane = paneRef.current;
    if (!pane) return;
    const pr = pane.getBoundingClientRect();
    const cr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = cr.left - pr.left + cr.width / 2;
    // Relative Y of the cell's top within the pane
    const cyTop = cr.top - pr.top;
    // Flip tooltip below when too close to the top (would overlap stat cards)
    const below = cyTop < pr.height * 0.42;
    setTooltip({
      date: cell.date, ms: cell.ms,
      x: cx,
      y: below ? cyTop + cr.height : cyTop,
      below,
    });
  };
  const hideTooltip = () => setTooltip(null);

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });

  /* ----- Render ----- */

  const cs = scrollCellSize; // shorthand

  /* For 1-week: cells get col = dayIndex, row = 1 */
  /* For standard: col = floor((i+dow)/7), row = (i+dow)%7 + 1 */
  const showRowLabels = !isWeek && DAYS <= 60;
  const colOffset = showRowLabels ? 1 : 0; // row-label occupies col 1

  // Grid template
  const gridCols = showRowLabels
    ? `14px repeat(${COLS}, ${cs}px)`
    : `repeat(${COLS}, ${cs}px)`;
  const gridRows = `repeat(${ROWS}, ${cs}px)`;

  return (
    <div className="stats-pane" ref={paneRef}>
      {/* Header */}
      <div className="stats-pane__top">
        <h3>Stats</h3>
        <PeriodDropdown
          options={PERIODS}
          value={periodIdx}
          onChange={(i) => { setPeriodIdx(i); setTooltip(null); }}
        />
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

      {/* Heatmap section */}
      <div className="stats-heatmap-section">
        {loading && <p className="stats-loading">Loading…</p>}

        {!loading && (
          /* Outer measure div — always full container width */
          <div ref={measureRef} className="stats-heatmap-measure">
            {/* Horizontal scroll container (visible scroll only when needed) */}
            <div
              ref={scrollRef}
              className={`stats-heatmap-scroll${needsScroll ? ' is-scrollable' : ''}`}
            >
              {/* The actual grid */}
              <div
                className="stats-heatmap"
                style={{ gridTemplateColumns: gridCols, gridTemplateRows: gridRows }}
                role="img"
                aria-label={`${DAYS}-day focus heatmap`}
              >
                {/* Inline row labels for ≤ 2-month views */}
                {showRowLabels && DOW_SINGLE.map((d, i) => (
                  <span key={`r${i}`} className="stats-yaxis-label"
                    style={{ gridColumn: 1, gridRow: i + 1, height: cs, lineHeight: `${cs}px` }}>
                    {d}
                  </span>
                ))}

                {/* Data cells */}
                {cells.map((cell, i) => {
                  let col: number, row: number;
                  if (isWeek) {
                    col = i; row = 0;
                  } else {
                    col = Math.floor((i + oldestWeekday) / 7);
                    row = (i + oldestWeekday) % 7;
                  }
                  const gridCol = col + colOffset + 1;
                  const gridRow = row + 1;
                  const isMS = monthStartCols.has(col);
                  return (
                    <span
                      key={cell.date}
                      className={[
                        'stats-heatmap__cell',
                        `b${cell.bucket}`,
                        cell.isToday  ? 'is-today'       : '',
                        isMS          ? 'month-start'    : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        gridColumn: gridCol, gridRow,
                        width: cs, height: cs,
                      }}
                      {...(isTouch ? {
                        onClick: (e) => {
                          if (tooltip?.date === cell.date) hideTooltip();
                          else showTooltip(cell, e);
                        },
                      } : {
                        onMouseEnter: (e) => showTooltip(cell, e),
                        onMouseLeave: hideTooltip,
                      })}
                    />
                  );
                })}
              </div>

              {/* Column labels (dates / month names / day abbrevs for 1 week) */}
              {colLabels.some(Boolean) && (
                <div
                  className="stats-xlabel"
                  style={{
                    gridTemplateColumns: gridCols,
                    paddingLeft: showRowLabels ? `${14 + GAP}px` : undefined,
                  }}
                >
                  {showRowLabels && <span />}
                  {colLabels.map((lbl, col) => (
                    <span
                      key={col}
                      className="stats-xlabel__cell"
                      style={{ width: cs, textAlign: 'center' }}
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        {!loading && (
          <div className="stats-legend" aria-hidden>
            <span>Less</span>
            {([0,1,2,3,4] as const).map(b => (
              <span key={b} className={`stats-legend__cell b${b}`} />
            ))}
            <span>More</span>
          </div>
        )}
      </div>

      {/* Glassmorphic tooltip — absolute relative to .stats-pane */}
      {tooltip && (
        <div
          className={`stats-tooltip${tooltip.below ? ' is-below' : ''}`}
          style={{ left: tooltip.x, top: tooltip.y }}
          aria-hidden
        >
          <span className="stats-tooltip__date">{fmtDate(tooltip.date)}</span>
          <span className="stats-tooltip__val">{fmtDuration(tooltip.ms)}</span>
        </div>
      )}
    </div>
  );
}
