import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import './StatsPane.css';

interface Props {
  user: User;
  refreshKey?: number;
}

interface Period {
  label: string;
  days: number;
}

const PERIODS: Period[] = [
  { label: '12 weeks', days: 84 },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
];

function dateNDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return '—';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function intensityBucket(ms: number): number {
  if (ms <= 0) return 0;
  const min = ms / 60000;
  if (min < 30) return 1;
  if (min < 90) return 2;
  if (min < 180) return 3;
  return 4;
}

interface HeatCell {
  date: string;
  ms: number;
  bucket: number;
  isToday: boolean;
}

interface Tooltip {
  date: string;
  ms: number;
  x: number;
  y: number;
}

export function StatsPane({ user, refreshKey }: Props) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const heatRef = useRef<HTMLDivElement>(null);

  const period = PERIODS[periodIdx]!;
  const DAYS = period.days;
  const COLS = Math.ceil(DAYS / 7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const from = dateNDaysAgo(DAYS - 1);
    const to = dateNDaysAgo(0);
    listSessionsByDateRange(user.id, from, to).then((r) => {
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
    const result: HeatCell[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      const ms = totalsByDate.get(date) ?? 0;
      result.push({ date, ms, bucket: intensityBucket(ms), isToday: date === today });
    }
    return result;
  }, [totalsByDate, DAYS]);

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = dateNDaysAgo(i);
      if ((totalsByDate.get(d) ?? 0) > 0) s++;
      else break;
    }
    return s;
  }, [totalsByDate]);

  const windowTotalMs = useMemo(() => {
    let t = 0;
    for (const v of totalsByDate.values()) t += v;
    return t;
  }, [totalsByDate]);

  const handleCellEnter = (cell: HeatCell, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      date: cell.date,
      ms: cell.ms,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleCellLeave = () => setTooltip(null);

  const fmtTooltipDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });

  return (
    <div className="stats-pane">
      {/* Header row: title + period selector */}
      <div className="stats-pane__top">
        <h3>Stats</h3>
        <div className="stats-period" role="group" aria-label="Period">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`stats-period__btn${periodIdx === i ? ' is-active' : ''}`}
              onClick={() => setPeriodIdx(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-row">
        <div className="stats-card">
          <div className="stats-card__label">Current streak</div>
          <div className="stats-card__value">
            {streak}
            <span className="stats-card__unit"> day{streak === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card__label">{period.label} total</div>
          <div className="stats-card__value stats-card__value--mono">{fmtDuration(windowTotalMs)}</div>
        </div>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Loading…</p>
      )}

      {!loading && (
        <>
          {/* Heatmap — fills full width of content pane */}
          <div
            ref={heatRef}
            className="stats-heatmap"
            role="img"
            aria-label={`${DAYS}-day focus heatmap`}
            style={{ '--cols': COLS } as React.CSSProperties}
          >
            {cells.map((cell, i) => {
              const oldestDate = new Date(cells[0]!.date + 'T00:00:00');
              const oldestWeekday = oldestDate.getDay();
              const col = Math.floor((i + oldestWeekday) / 7);
              const row = (i + oldestWeekday) % 7;
              return (
                <span
                  key={cell.date}
                  className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}`}
                  style={{ gridColumn: col + 1, gridRow: row + 1 }}
                  onMouseEnter={(e) => handleCellEnter(cell, e)}
                  onMouseLeave={handleCellLeave}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="stats-legend" aria-hidden>
            <span>Less</span>
            <span className="stats-heatmap__cell b0" />
            <span className="stats-heatmap__cell b1" />
            <span className="stats-heatmap__cell b2" />
            <span className="stats-heatmap__cell b3" />
            <span className="stats-heatmap__cell b4" />
            <span>More</span>
          </div>
        </>
      )}

      {/* Glass tooltip — fixed-positioned near the hovered cell */}
      {tooltip && (
        <div
          className="stats-tooltip"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
          aria-hidden
        >
          <span className="stats-tooltip__date">{fmtTooltipDate(tooltip.date)}</span>
          <span className="stats-tooltip__val">{fmtDuration(tooltip.ms)}</span>
        </div>
      )}
    </div>
  );
}
