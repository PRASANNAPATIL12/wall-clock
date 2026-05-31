import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsByDateRange } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import './StatsPane.css';

interface Props {
  user: User;
  refreshKey?: number;
}

const DAYS = 84;
const ROWS = 7; // 12 cols × 7 rows = 84 cells = the visible window

function dateNDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Bucket a daily total (ms) into one of 5 intensity levels (0–4). */
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

export function StatsPane({ user, refreshKey }: Props) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [user.id, refreshKey]);

  // Sum durations per date.
  const totalsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
      m.set(r.date_local, (m.get(r.date_local) ?? 0) + Math.max(0, ms));
    }
    return m;
  }, [rows]);

  // Build the heatmap grid — DAYS cells, oldest first.
  const cells = useMemo<HeatCell[]>(() => {
    const today = dateNDaysAgo(0);
    const result: HeatCell[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      const ms = totalsByDate.get(date) ?? 0;
      result.push({ date, ms, bucket: intensityBucket(ms), isToday: date === today });
    }
    return result;
  }, [totalsByDate]);

  // Streak = consecutive days from today backward with > 0 focus time.
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = dateNDaysAgo(i);
      const ms = totalsByDate.get(d) ?? 0;
      if (ms > 0) s++;
      else break;
    }
    return s;
  }, [totalsByDate]);

  // Total time across the 84-day window.
  const windowTotalMs = useMemo(() => {
    let t = 0;
    for (const v of totalsByDate.values()) t += v;
    return t;
  }, [totalsByDate]);

  return (
    <div className="stats-pane">
      <h3>Stats</h3>

      <div className="stats-row">
        <div className="stats-card">
          <div className="stats-card__label">Current streak</div>
          <div className="stats-card__value">
            {streak}{' '}
            <span className="stats-card__unit">
              day{streak === 1 ? '' : 's'} {streak >= 3 ? '🔥' : ''}
            </span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card__label">Last {DAYS} days</div>
          <div className="stats-card__value">
            {fmtDuration(windowTotalMs)}
          </div>
        </div>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Loading…</p>
      )}

      {!loading && (
        <>
          <div className="stats-heatmap" role="img" aria-label={`${DAYS}-day focus heatmap`}>
            {cells.map((cell, i) => {
              // Compute grid position: 7-row vertical layout, 12-col horizontal.
              // cells[0] is oldest; place it at column 0, row = (its weekday).
              const oldestDate = new Date(cells[0]!.date + 'T00:00:00');
              const oldestWeekday = oldestDate.getDay();
              const col = Math.floor((i + oldestWeekday) / ROWS);
              const row = (i + oldestWeekday) % ROWS;
              return (
                <span
                  key={cell.date}
                  className={`stats-heatmap__cell b${cell.bucket}${cell.isToday ? ' is-today' : ''}`}
                  style={{
                    gridColumn: col + 1,
                    gridRow: row + 1,
                  }}
                  title={`${cell.date}: ${fmtDuration(cell.ms)}`}
                />
              );
            })}
          </div>

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
    </div>
  );
}
