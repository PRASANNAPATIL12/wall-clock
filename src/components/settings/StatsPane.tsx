import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import './StatsPane.css';

interface Props { user: User; refreshKey?: number }

interface Period { label: string; days: number }

const PERIODS: Period[] = [
  { label: '1 month',  days: 30  },
  { label: '2 months', days: 60  },
  { label: '3 months', days: 90  },
  { label: '4 months', days: 120 },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
];

// Day-of-week abbreviations: Sun=0 … Sat=6
const DOW = ['S','M','T','W','T','F','S'];

function dateNDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function intensityBucket(ms: number): number {
  if (ms <= 0) return 0;
  const min = ms / 60000;
  if (min < 30)  return 1;
  if (min < 90)  return 2;
  if (min < 180) return 3;
  return 4;
}

interface HeatCell { date: string; ms: number; bucket: number; isToday: boolean }

/**
 * Compute per-column labels.
 *
 * Each grid column = one ISO week (7 rows). Column 0 = oldest week.
 * For 1-month: show numeric date of the week's first visible day.
 * For multi-month: show month abbreviation where a new month begins.
 */
function buildColLabels(
  cells: HeatCell[],
  COLS: number,
  oldestWeekday: number,
  days: number,
): string[] {
  const labels: string[] = Array(COLS).fill('');
  let lastMonth = -1;

  for (let col = 0; col < COLS; col++) {
    // Index of the first cell that lives in this column.
    // Column `col` holds day-indices where Math.floor((i + oldestWeekday) / 7) === col.
    // Minimum i: col*7 - oldestWeekday (may be < 0 for col=0).
    const firstCellIdx = Math.max(0, col * 7 - oldestWeekday);
    if (firstCellIdx >= cells.length) break;

    const d = new Date(cells[firstCellIdx]!.date + 'T00:00:00');

    if (days <= 31) {
      // 1-month: show numeric date (e.g. "1", "8", "15", "22")
      labels[col] = String(d.getDate());
    } else {
      const month = d.getMonth();
      if (month !== lastMonth) {
        if (days <= 90) {
          labels[col] = d.toLocaleDateString(undefined, { month: 'short' }); // "Jun"
        } else {
          labels[col] = d.toLocaleDateString(undefined, { month: 'narrow' }); // "J"
        }
        lastMonth = month;
      }
    }
  }
  return labels;
}

interface Tooltip { date: string; ms: number; x: number; y: number }

/** Detect touch-primary device — use click instead of hover for tooltip. */
const isTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

export function StatsPane({ user, refreshKey }: Props) {
  const [rows,      setRows]      = useState<SessionRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [tooltip,   setTooltip]   = useState<Tooltip | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const period = PERIODS[periodIdx]!;
  const DAYS   = period.days;
  const COLS   = Math.ceil(DAYS / 7);

  // Show day-of-week row labels for short windows (≤ 2 months).
  const showRowLabels = DAYS <= 60;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessionsByDateRange(user.id, dateNDaysAgo(DAYS - 1), dateNDaysAgo(0)).then(r => {
      if (cancelled) return;
      setRows(r);
      setLoading(false);
    });
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

  const oldestWeekday = cells.length > 0
    ? new Date(cells[0]!.date + 'T00:00:00').getDay()
    : 0;

  const colLabels = useMemo(
    () => buildColLabels(cells, COLS, oldestWeekday, DAYS),
    [cells, COLS, oldestWeekday, DAYS],
  );

  /** Position tooltip relative to the heatmap section (position:relative),
   *  avoiding the backdrop-filter containing-block issue with position:fixed. */
  const showTooltip = (cell: HeatCell, e: React.MouseEvent | React.TouchEvent) => {
    const section = sectionRef.current;
    if (!section) return;
    const sr  = section.getBoundingClientRect();
    const cr  = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      date: cell.date,
      ms:   cell.ms,
      x:    cr.left - sr.left + cr.width  / 2,
      y:    cr.top  - sr.top  + cr.height / 2,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const fmtTooltipDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });

  // Extra column offset when row-labels are shown (they occupy grid column 1).
  const colOffset = showRowLabels ? 1 : 0;

  // Grid column template: optional label col + N data cols.
  const gridCols = showRowLabels
    ? `16px repeat(${COLS}, 1fr)`
    : `repeat(${COLS}, 1fr)`;

  return (
    <div className="stats-pane">
      {/* ---- Top: title + period dropdown ---- */}
      <div className="stats-pane__top">
        <h3>Stats</h3>
        <div className="stats-period-select">
          <select
            value={periodIdx}
            onChange={e => { setPeriodIdx(Number(e.target.value)); setTooltip(null); }}
            aria-label="Select time period"
          >
            {PERIODS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
          <svg className="stats-period-select__chevron" viewBox="0 0 24 24" width={10} height={10}
            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* ---- Stat cards ---- */}
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

      {/* ---- Heatmap section (fills remaining height, non-scrollable) ---- */}
      <div className="stats-heatmap-section" ref={sectionRef}>
        {loading && <p className="stats-loading">Loading…</p>}

        {!loading && (
          <>
            {/* Heatmap grid — inline row labels occupy column 1 when shown */}
            <div
              className="stats-heatmap"
              style={{ gridTemplateColumns: gridCols }}
              role="img"
              aria-label={`${DAYS}-day focus heatmap`}
            >
              {/* Row labels (day-of-week) — only for short views */}
              {showRowLabels && DOW.map((d, i) => (
                <span
                  key={`dow${i}`}
                  className="stats-yaxis-label"
                  style={{ gridColumn: 1, gridRow: i + 1 }}
                  aria-hidden
                >
                  {d}
                </span>
              ))}

              {/* Data cells */}
              {cells.map((cell, i) => {
                const col = Math.floor((i + oldestWeekday) / 7) + colOffset;
                const row = (i + oldestWeekday) % 7;
                return (
                  <span
                    key={cell.date}
                    className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}`}
                    style={{ gridColumn: col + 1, gridRow: row + 1 }}
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

            {/* Column labels — date numbers (1M) or month names (2M+) */}
            {colLabels.some(Boolean) && (
              <div
                className="stats-xlabel"
                style={{
                  gridTemplateColumns: gridCols,
                  paddingLeft: showRowLabels ? 0 : undefined,
                }}
                aria-hidden
              >
                {showRowLabels && <span />}
                {colLabels.map((label, col) => (
                  <span key={col} className="stats-xlabel__cell">
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="stats-legend" aria-hidden>
              <span>Less</span>
              {[0,1,2,3,4].map(b => (
                <span key={b} className={`stats-legend__cell b${b}`} />
              ))}
              <span>More</span>
            </div>
          </>
        )}

        {/* Glassmorphic tooltip — position:absolute so backdrop-filter is not an issue */}
        {tooltip && (
          <div
            className="stats-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
            aria-hidden
          >
            <span className="stats-tooltip__date">{fmtTooltipDate(tooltip.date)}</span>
            <span className="stats-tooltip__val">{fmtDuration(tooltip.ms)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
