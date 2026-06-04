import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import { HistoryPane } from './HistoryPane';
import './StatsPane.css';

interface Props {
  user: User;
  refreshKey?: number;
  /**
   * Pre-computed streak passed from App (already fresh from the last
   * session save). Shown immediately while the heatmap data loads so
   * the user never sees a blank streak card.
   */
  initialStreak?: number;
}

/* ---- Period definition — calendar-month aligned ----
 * months=0 → "1 week" (last 7 days, single row)
 * months=N → last N full calendar months ending at end-of-this-month
 * Default: index 3 = "3 months"                                         */
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

const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const GAP       = 2;
const MONTH_GAP = 10;
const CELL_MIN  = 7;
const CELL_MAX  = 18;

/* ---- Date helpers ---- */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateNDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return ymd(d);
}
/** 1st of the calendar month that is `back` months before now (back=0 = this month). */
function firstOfMonthsAgo(back: number): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back); return ymd(d);
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

/* ---- Per-month block (replaces the old flat-cell approach) ----
 * Each month is completely self-contained: its own columns and rows
 * are computed independently from that month's first weekday.
 * This eliminates the "column sharing" bug where e.g. May 31 and
 * June 1 ended up in the same column, causing June data to appear
 * inside the May block.                                            */
interface MonthCell {
  date: string;
  col: number;   // column within THIS month's grid (0-based)
  row: number;   // day-of-week row (0=Sun … 6=Sat)
  bucket: 0|1|2|3|4;
  isToday: boolean;
  isFuture: boolean;
  ms: number;
}
interface MonthBlock {
  key: string;
  label: string;
  numCols: number;
  cells: MonthCell[];
}

interface WeekCell {
  date: string; ms: number; bucket: 0|1|2|3|4; isToday: boolean;
}
interface TooltipState { date: string; ms: number; x: number; y: number; below: boolean }

function animateScroll(
  el: HTMLElement, from: number, to: number, dur: number, onDone?: () => void,
): () => void {
  let raf = 0;
  const t0 = performance.now();
  const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const step = (now: number) => {
    const p = Math.min((now-t0)/dur,1);
    el.scrollLeft = from+(to-from)*ease(p);
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
    const esc   = (e: KeyboardEvent) => { if (e.key==='Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown',close); document.removeEventListener('keydown',esc); };
  }, [open]);
  return (
    <div ref={ref} className={`period-dd${open?' is-open':''}`}>
      <button type="button" className="period-dd__trigger" onClick={()=>setOpen(o=>!o)}
        aria-haspopup="listbox" aria-expanded={open}>
        {options[value]!.label}
        <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" aria-hidden className="period-dd__chevron">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <ul className="period-dd__list" role="listbox">
          {options.map((opt,i) => (
            <li key={i}>
              <button type="button" role="option" aria-selected={i===value}
                className={`period-dd__item${i===value?' is-active':''}`}
                onClick={()=>{ onChange(i); setOpen(false); }}>
                {opt.label}
                {i===value && (
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
export function StatsPane({ user, refreshKey, initialStreak = 0 }: Props) {
  const [rows,      setRows]      = useState<SessionRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [periodIdx, setPeriodIdx] = useState(3);          // default: 3 months
  const [cWidth,    setCWidth]    = useState(0);
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null);

  const paneRef    = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const period  = PERIODS[periodIdx]!;
  const isWeek  = period.months === 0;

  /* fetchStart = exactly the displayed period's start date.
   * No longer extending to 365 days — initialStreak (pre-computed in App)
   * handles streak accuracy instantly without any extra DB fetch. */
  const startStr   = isWeek ? dateNDaysAgo(6) : firstOfMonthsAgo(period.months - 1);
  const fetchStart = startStr;

  /* ResizeObserver */
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setCWidth(el.clientWidth);
    const ro = new ResizeObserver(es => setCWidth(es[0]!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Fetch — always covers at least 1 year so streak is accurate */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessionsByDateRange(user.id, fetchStart, dateNDaysAgo(0))
      .then(r => { if (!cancelled) { setRows(r); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, refreshKey, startStr]);

  const totalsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
      m.set(r.date_local, (m.get(r.date_local) ?? 0) + Math.max(0, ms));
    }
    return m;
  }, [rows]);

  /* ---- Week cells (only used when isWeek) ---- */
  const weekCells = useMemo<WeekCell[]>(() => {
    if (!isWeek) return [];
    const today = dateNDaysAgo(0);
    return Array.from({ length: 7 }, (_, i) => {
      const date = dateNDaysAgo(6 - i);
      const ms   = totalsByDate.get(date) ?? 0;
      return { date, ms, bucket: intensityBucket(ms), isToday: date === today };
    });
  }, [isWeek, totalsByDate]);

  /* ---- Month blocks — each month is FULLY INDEPENDENT ----
   *
   * The old approach derived month blocks from a flat global cell array,
   * where multiple months could share the same column (e.g. May 31 and
   * June 1 both fall in column 9 of a 3-month grid). That caused June
   * data to "bleed" into the May block.
   *
   * New approach: each month computes its own columns/rows from scratch,
   * using THAT MONTH's first weekday as the offset. Months never share
   * columns — completely isolated grids, rendered side by side.         */
  const monthBlocks = useMemo<MonthBlock[]>(() => {
    if (isWeek) return [];
    const today = dateNDaysAgo(0);
    const blocks: MonthBlock[] = [];

    for (let mBack = period.months - 1; mBack >= 0; mBack--) {
      // Reference date for this month
      const ref = new Date();
      ref.setDate(1);
      ref.setMonth(ref.getMonth() - mBack);

      const year     = ref.getFullYear();
      const monthIdx = ref.getMonth();                        // 0-11
      const numDays  = new Date(year, monthIdx + 1, 0).getDate();
      const firstWD  = new Date(year, monthIdx, 1).getDay(); // 0=Sun, 1=Mon …
      const numCols  = Math.ceil((numDays + firstWD) / 7);
      const label    = ref.toLocaleDateString(undefined, { month: 'short' });
      const key      = `${year}-${monthIdx}`;

      const cells: MonthCell[] = [];
      for (let d = 0; d < numDays; d++) {
        const dateObj  = new Date(year, monthIdx, d + 1);
        const date     = ymd(dateObj);
        const isFuture = date > today;
        const ms       = isFuture ? 0 : (totalsByDate.get(date) ?? 0);
        cells.push({
          date,
          col: Math.floor((d + firstWD) / 7),
          row: (d + firstWD) % 7,
          bucket: (isFuture ? 0 : intensityBucket(ms)) as 0|1|2|3|4,
          isToday: date === today,
          isFuture,
          ms,
        });
      }
      blocks.push({ key, label, numCols, cells });
    }
    return blocks;
  }, [isWeek, period.months, totalsByDate]);

  const cellSize = cWidth > 0 ? CELL_MAX : CELL_MIN;
  const cs = cellSize;

  /* needsScroll — sum each month's pixel width */
  const needsScroll = useMemo(() => {
    if (cWidth <= 0) return false;
    if (isWeek) return 7 * CELL_MAX + 6 * GAP > cWidth;
    const totalW = monthBlocks.reduce((sum, blk, i) => {
      return sum + blk.numCols * CELL_MAX + (blk.numCols - 1) * GAP + (i > 0 ? MONTH_GAP : 0);
    }, 0);
    return totalW > cWidth;
  }, [cWidth, isWeek, monthBlocks]);

  /* Auto-scroll newest → hint left */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !needsScroll) return;
    const raf = requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth - el.clientWidth; });
    let cancelNudge: (()=>void)|null = null; let t2 = 0;
    const t1 = window.setTimeout(() => {
      const sp = el.scrollLeft || el.scrollWidth - el.clientWidth;
      cancelNudge = animateScroll(el, sp, sp-48, 700, () => {
        t2 = window.setTimeout(() => { cancelNudge = animateScroll(el, sp-48, sp, 550); }, 650);
      });
    }, 600);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t1); window.clearTimeout(t2); cancelNudge?.(); };
  }, [needsScroll, periodIdx]);

  /* Streak:
   * · While loading: use initialStreak (pre-computed in App, shows instantly)
   * · After load:    recompute from fetched data (matches the displayed period)
   * initialStreak is computed over 365 days in useTodayStats, so it's
   * accurate even if the current period is shorter than the actual streak. */
  const computedStreak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) { if ((totalsByDate.get(dateNDaysAgo(i))??0) > 0) s++; else break; }
    return s;
  }, [totalsByDate]);
  const streak = loading ? initialStreak : computedStreak;

  /* Window total — sum displayed period only */
  const windowTotalMs = useMemo(() => {
    if (isWeek) return weekCells.reduce((s,c) => s+c.ms, 0);
    return monthBlocks.reduce((s, blk) =>
      s + blk.cells.reduce((bs,c) => bs + (!c.isFuture ? c.ms : 0), 0), 0);
  }, [isWeek, weekCells, monthBlocks]);

  /* Tooltip */
  const showTooltip = (date: string, ms: number, e: React.MouseEvent | React.TouchEvent) => {
    const pane = paneRef.current;
    if (!pane) return;
    const pr = pane.getBoundingClientRect();
    const cr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = cr.left - pr.left + cr.width / 2;
    const cyTop = cr.top - pr.top;
    const below = cyTop < pr.height * 0.42;
    setTooltip({ date, ms, x: cx, y: below ? cyTop + cr.height : cyTop, below });
  };
  const hideTooltip = () => setTooltip(null);
  const toggleTip   = (date: string, ms: number, e: React.MouseEvent) => {
    if (tooltip?.date === date) hideTooltip(); else showTooltip(date, ms, e);
  };
  const cellHandlers = (date: string, ms: number) => isTouch
    ? { onClick: (e: React.MouseEvent) => toggleTip(date, ms, e) }
    : { onMouseEnter: (e: React.MouseEvent) => showTooltip(date, ms, e), onMouseLeave: hideTooltip };

  const fmtDate = (d: string) => new Date(d+'T00:00:00').toLocaleDateString(undefined,{
    weekday:'short', month:'short', day:'numeric',
  });

  /* Week view grid */
  const weekGridCols = `repeat(7, ${cs}px)`;

  return (
    <div className="stats-pane" ref={paneRef}>
      {/* Header */}
      <div className="stats-pane__top">
        <h3>Stats</h3>
        <PeriodDropdown options={PERIODS} value={periodIdx}
          onChange={i => { setPeriodIdx(i); setTooltip(null); }} />
      </div>

      {/* Stat cards */}
      <div className="stats-row">
        <div className="stats-card">
          <div className="stats-card__label">Current streak</div>
          <div className="stats-card__value">
            {streak}<span className="stats-card__unit"> day{streak===1?'':'s'}</span>
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
            <div ref={scrollRef}
              className={`stats-heatmap-scroll${needsScroll?' is-scrollable':''}`}>

              {/* Month-block layout — ALL month periods
                  Each block is a self-contained grid; no shared columns. */}
              {!isWeek && (
                <div className="stats-months-row">
                  {monthBlocks.map(block => (
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
                        {block.cells.map(({ date, col, row, bucket, isToday, isFuture, ms }) => (
                          <span
                            key={date}
                            className={`stats-heatmap__cell b${bucket}${isToday?' is-today':''}${isFuture?' is-future':''}`}
                            style={{ gridColumn: col+1, gridRow: row+1, width: cs, height: cs }}
                            {...cellHandlers(date, ms)}
                          />
                        ))}
                      </div>
                      <div className="stats-month-name">{block.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Week view — single row, day-name column labels */}
              {isWeek && (
                <>
                  <div
                    className="stats-heatmap"
                    style={{ gridTemplateColumns: weekGridCols, gridTemplateRows: `${cs}px` }}
                    role="img" aria-label="7-day focus"
                  >
                    {weekCells.map((c, i) => (
                      <span key={c.date}
                        className={`stats-heatmap__cell b${c.bucket}${c.isToday?' is-today':''}`}
                        style={{ gridColumn: i+1, gridRow: 1, width: cs, height: cs }}
                        {...cellHandlers(c.date, c.ms)}
                      />
                    ))}
                  </div>
                  <div className="stats-xlabel">
                    {weekCells.map((c,i) => (
                      <span key={i} className="stats-xlabel__cell" style={{width:cs}}>
                        {DOW_SHORT[new Date(c.date+'T00:00:00').getDay()]}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

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
        <div className={`stats-tooltip${tooltip.below?' is-below':''}`}
          style={{left:tooltip.x, top:tooltip.y}} aria-hidden>
          <span className="stats-tooltip__date">{fmtDate(tooltip.date)}</span>
          <span className="stats-tooltip__val">{fmtDuration(tooltip.ms)}</span>
        </div>
      )}

      {/* Inline history */}
      <div className="stats-history-divider" aria-hidden />
      <HistoryPane user={user} refreshKey={refreshKey} embedded />
    </div>
  );
}
