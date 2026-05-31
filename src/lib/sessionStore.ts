import { supabase, type SessionInsert, type SessionRow } from './supabase';
import { getZonedTime } from './timezones';

/**
 * Wraps every interaction with the `sessions` table behind a small,
 * testable API. The UI never imports supabase directly for session CRUD —
 * everything routes through here.
 *
 * If anything fails (offline, network error, RLS reject), we swallow the
 * error and log it. The clock and focus ring keep working — the session
 * just doesn't get saved. We can add a retry queue later if needed.
 */

export interface SessionPayload {
  userId: string;
  startTime: number;     // epoch ms
  goalTime: number | null;
  endTime: number;
  completed: boolean;
  bonusSeconds: number;
  tag: string | null;
  timezone: string;       // IANA zone the clock was displaying
}

/** Build the YYYY-MM-DD date string in the session's display timezone. */
function formatLocalDate(epochMs: number, tz: string): string {
  const zoned = getZonedTime(new Date(epochMs), tz);
  // Reconstruct YYYY-MM-DD via Intl
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz === 'local' ? undefined : tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(epochMs));
  } catch {
    // Fallback: format from zoned parts (no DST awareness, but safe)
    const d = new Date(epochMs);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    // referenced for completeness; zoned not used here
    void zoned;
    return `${yyyy}-${mm}-${dd}`;
  }
}

export async function saveSession(p: SessionPayload): Promise<void> {
  // Guardrails — never write zero-length / negative-duration sessions
  if (p.endTime <= p.startTime) return;

  const insert: SessionInsert = {
    user_id: p.userId,
    start_time: new Date(p.startTime).toISOString(),
    goal_time: p.goalTime ? new Date(p.goalTime).toISOString() : null,
    end_time: new Date(p.endTime).toISOString(),
    completed: p.completed,
    bonus_seconds: Math.max(0, Math.round(p.bonusSeconds)),
    tag: p.tag,
    tz: p.timezone,
    date_local: formatLocalDate(p.startTime, p.timezone),
  };

  const { error } = await supabase.from('sessions').insert(insert);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[sessionStore] save failed:', error.message);
  }
}

/** Fetch sessions in a date-local range (inclusive), descending by start. */
export async function listSessionsByDateRange(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date_local', fromDate)
    .lte('date_local', toDate)
    .order('start_time', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[sessionStore] list failed:', error.message);
    return [];
  }
  return data as SessionRow[];
}

/** Paginated session list — used by the History pane. */
export async function listSessionsPage(
  userId: string,
  offset: number,
  limit: number,
): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[sessionStore] page failed:', error.message);
    return [];
  }
  return data as SessionRow[];
}

/** All sessions, used for export and full-history queries. */
export async function listAllSessions(userId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[sessionStore] all failed:', error.message);
    return [];
  }
  return data as SessionRow[];
}
