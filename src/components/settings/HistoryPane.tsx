import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listSessionsPage, listSessionsByDateRange } from '../../lib/sessionStore';
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

/** YYYY-MM-DD of today − N days. */
function dateNDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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
  const todayStr = dateNDaysAgo(0);
  const yestStr  = dateNDaysAgo(1);
  if (yyyymmdd === todayStr) return 'Today';
  if (yyyymmdd === yestStr)  return 'Yesterday';
  const d = new Date(yyyymmdd + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

interface DayGroup { date: string; totalMs: number; rows: SessionRow[] }

function groupByDate(rows: SessionRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const r of rows) {
    let g = map.get(r.date_local);
    if (!g) { g = { date: r.date_local, totalMs: 0, rows: [] }; map.set(r.date_local, g); }
    g.rows.push(r);
    g.totalMs += Math.max(0, new Date(r.end_time).getTime() - new Date(r.start_time).getTime());
  }
  return Array.from(map.values());
}

/**
 * History pane — grouped session list.
 *
 * When `embedded=true` (inside StatsPane):
 *   · Initial load fetches ONLY today + yesterday — fast, low DB cost.
 *   · "Load full history" button switches to full paginated mode.
 *
 * When standalone (own nav item): loads PAGE_SIZE sessions on mount,
 * with normal "Load more" pagination.
 */
export function HistoryPane({ user, refreshKey, embedded = false }: Props) {
  const [rows,       setRows]       = useState<SessionRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [offset,     setOffset]     = useState(0);
  const [more,       setMore]       = useState(false);
  /**
   * recentOnly = true  → showing today+yesterday only (embedded initial state)
   * recentOnly = false → full paginated history
   */
  const [recentOnly, setRecentOnly] = useState(embedded);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRecentOnly(embedded);           // reset to recent-only whenever user/key changes

    if (embedded) {
      // Fast initial load: only today + yesterday
      listSessionsByDateRange(user.id, dateNDaysAgo(1), dateNDaysAgo(0))
        .then(page => {
          if (cancelled) return;
          setRows(page);
          setOffset(0);
          setMore(true);               // always show "Load full history" in embedded mode
          setLoading(false);
        });
    } else {
      listSessionsPage(user.id, 0, PAGE_SIZE).then(page => {
        if (cancelled) return;
        setRows(page);
        setOffset(page.length);
        setMore(page.length === PAGE_SIZE);
        setLoading(false);
      });
    }
    return () => { cancelled = true; };
  }, [user.id, refreshKey, embedded]);

  const groups    = useMemo(() => groupByDate(rows), [rows]);
  const longestMs = useMemo(() => {
    let m = 0;
    for (const r of rows) {
      const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
      if (ms > m) m = ms;
    }
    return m || 1;
  }, [rows]);

  const handleLoadMore = async () => {
    if (recentOnly) {
      // First "Load full history" in embedded mode:
      // replace the recent-only view with full paginated history
      setLoading(true);
      setRecentOnly(false);
      const page = await listSessionsPage(user.id, 0, PAGE_SIZE);
      setRows(page);
      setOffset(page.length);
      setMore(page.length === PAGE_SIZE);
      setLoading(false);
    } else {
      // Normal pagination: append next page
      const page = await listSessionsPage(user.id, offset, PAGE_SIZE);
      setRows(prev => [...prev, ...page]);
      setOffset(o => o + page.length);
      if (page.length < PAGE_SIZE) setMore(false);
    }
  };

  return (
    <div className={`history-pane${embedded ? ' history-pane--embedded' : ''}`}>
      {!embedded && <h3>History</h3>}

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Loading…</p>
      )}

      {!loading && rows.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          No sessions yet. Click on the focus ring to start one.
        </p>
      )}

      {!loading && groups.map(g => (
        <div key={g.date} className="history-day">
          <div className="history-day__header">
            <span className="history-day__date">{fmtDateHeader(g.date)}</span>
            <span className="history-day__total">{fmtDuration(g.totalMs)}</span>
          </div>
          <ul className="history-day__rows">
            {g.rows.map(r => {
              const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
              const widthPct = Math.max(8, Math.round((ms / longestMs) * 100));
              return (
                <li key={r.id} className="history-row">
                  <span className="history-row__tag">
                    <TagIcon def={getTag(r.tag) ?? FALLBACK_TAG} size={13} />
                  </span>
                  <span className="history-row__time">{fmtTime(r.start_time)}</span>
                  <span className="history-row__bar" aria-hidden>
                    <span className="history-row__bar-fill" style={{ width: `${widthPct}%` }} />
                  </span>
                  <span className="history-row__duration">{fmtDuration(ms)}</span>
                  <span className={`history-row__dot${r.completed ? ' is-done' : ''}`} aria-hidden />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {more && !loading && (
        <button type="button" className="history-pane__more" onClick={handleLoadMore}>
          {recentOnly ? 'Load full history' : 'Load more'}
        </button>
      )}
    </div>
  );
}
