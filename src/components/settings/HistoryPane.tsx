import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsPage } from '../../lib/sessionStore';
import type { SessionRow } from '../../lib/supabase';
import { getTag, FALLBACK_TAG } from '../../lib/tags';
import { TagIcon } from '../TagIcon';
import './HistoryPane.css';

interface Props {
  user: User;
  refreshKey?: number;
  /** When true, renders without the "History" heading (used inside StatsPane). */
  embedded?: boolean;
}

const PAGE_SIZE = 60;

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `<1m`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDateHeader(yyyymmdd: string): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
  if (yyyymmdd === todayStr) return 'Today';
  if (yyyymmdd === yestStr) return 'Yesterday';
  const d = new Date(yyyymmdd + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

interface DayGroup {
  date: string;
  totalMs: number;
  rows: SessionRow[];
}

function groupByDate(rows: SessionRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const r of rows) {
    let g = map.get(r.date_local);
    if (!g) {
      g = { date: r.date_local, totalMs: 0, rows: [] };
      map.set(r.date_local, g);
    }
    g.rows.push(r);
    const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
    g.totalMs += Math.max(0, ms);
  }
  // Already comes sorted by start_time desc; date order will follow
  return Array.from(map.values());
}

export function HistoryPane({ user, refreshKey, embedded = false }: Props) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessionsPage(user.id, 0, PAGE_SIZE).then((page) => {
      if (cancelled) return;
      setRows(page);
      setOffset(page.length);
      setMore(page.length === PAGE_SIZE);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user.id, refreshKey]);

  const groups = useMemo(() => groupByDate(rows), [rows]);

  const longestMs = useMemo(() => {
    let m = 0;
    for (const r of rows) {
      const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
      if (ms > m) m = ms;
    }
    return m || 1;
  }, [rows]);

  const handleLoadMore = async () => {
    const page = await listSessionsPage(user.id, offset, PAGE_SIZE);
    setRows((prev) => [...prev, ...page]);
    setOffset((o) => o + page.length);
    if (page.length < PAGE_SIZE) setMore(false);
  };

  return (
    <div className={`history-pane${embedded ? ' history-pane--embedded' : ''}`}>
      {!embedded && <h3>History</h3>}

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Loading…</p>
      )}

      {!loading && rows.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          No sessions yet. Click on the focus ring around the clock to start one.
        </p>
      )}

      {!loading && groups.map((g) => (
        <div key={g.date} className="history-day">
          <div className="history-day__header">
            <span className="history-day__date">{fmtDateHeader(g.date)}</span>
            <span className="history-day__total">{fmtDuration(g.totalMs)}</span>
          </div>
          <ul className="history-day__rows">
            {g.rows.map((r) => {
              const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
              const widthPct = Math.max(8, Math.round((ms / longestMs) * 100));
              return (
                <li key={r.id} className="history-row">
                  <span className="history-row__tag">
                    <TagIcon def={getTag(r.tag) ?? FALLBACK_TAG} size={13} />
                  </span>
                  <span className="history-row__time">{fmtTime(r.start_time)}</span>
                  <span className="history-row__bar" aria-hidden>
                    <span
                      className="history-row__bar-fill"
                      style={{ width: `${widthPct}%` }}
                    />
                  </span>
                  <span className="history-row__duration">{fmtDuration(ms)}</span>
                  <span
                    className={`history-row__dot${r.completed ? ' is-done' : ''}`}
                    aria-hidden
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {more && !loading && rows.length > 0 && (
        <button
          type="button"
          className="history-pane__more"
          onClick={handleLoadMore}
        >
          Load more
        </button>
      )}
    </div>
  );
}
