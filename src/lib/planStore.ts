import { supabase } from './supabase';

export interface PlannedSession {
  id: string;
  user_id: string;
  scheduled_date: string;          // 'YYYY-MM-DD'
  start_time_local: string;        // 'HH:MM:00'
  duration_minutes: number;
  tz: string;
  tag: string | null;
  title: string | null;
  sync_to_calendar: boolean;
  google_calendar_event_id: string | null;
  google_calendar_html_link: string | null;
  completed: boolean;
  linked_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannedSessionInsert {
  user_id: string;
  scheduled_date: string;
  start_time_local: string;
  duration_minutes: number;
  tz: string;
  tag?: string | null;
  title?: string | null;
  sync_to_calendar?: boolean;
}

/** Create a new planned session. Returns the created row. */
export async function createPlannedSession(
  p: PlannedSessionInsert,
): Promise<PlannedSession | null> {
  const { data, error } = await supabase
    .from('planned_sessions')
    .insert({
      user_id: p.user_id,
      scheduled_date: p.scheduled_date,
      start_time_local: p.start_time_local,
      duration_minutes: p.duration_minutes,
      tz: p.tz,
      tag: p.tag ?? null,
      title: p.title ?? null,
      sync_to_calendar: p.sync_to_calendar ?? true,
    })
    .select()
    .single();

  if (error) {
    console.warn('[planStore] create failed:', error.message);
    return null;
  }
  return data as PlannedSession;
}

/** Fetch planned sessions for a date range (inclusive), ascending by date+time. */
export async function listPlannedSessions(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<PlannedSession[]> {
  const { data, error } = await supabase
    .from('planned_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('scheduled_date', fromDate)
    .lte('scheduled_date', toDate)
    .order('scheduled_date', { ascending: true })
    .order('start_time_local', { ascending: true });

  if (error) {
    console.warn('[planStore] list failed:', error.message);
    return [];
  }
  return data as PlannedSession[];
}

/** Fetch just today's planned sessions (for the clock ring visualization). */
export async function listTodayPlanned(
  userId: string,
  todayDate: string,
): Promise<PlannedSession[]> {
  const { data, error } = await supabase
    .from('planned_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('scheduled_date', todayDate)
    .eq('completed', false)
    .order('start_time_local', { ascending: true });

  if (error) {
    console.warn('[planStore] today list failed:', error.message);
    return [];
  }
  return data as PlannedSession[];
}

/** Delete a planned session. */
export async function deletePlannedSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('planned_sessions')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('[planStore] delete failed:', error.message);
  }
}

/** Mark a planned session as completed (optionally link to an actual session). */
export async function markPlannedComplete(
  id: string,
  linkedSessionId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('planned_sessions')
    .update({ completed: true, linked_session_id: linkedSessionId ?? null })
    .eq('id', id);

  if (error) {
    console.warn('[planStore] complete failed:', error.message);
  }
}

/** Return YYYY-MM-DD for today in the browser's local timezone. */
export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Format HH:MM from a duration in minutes (e.g. 90 → "1h 30m"). */
export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** Format a start_time_local string ("14:30:00") into "2:30 PM". */
export function fmtTime(timeStr: string): string {
  const [hh, mm] = timeStr.split(':').map(Number);
  if (hh === undefined || mm === undefined) return timeStr;
  const period = hh < 12 ? 'AM' : 'PM';
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h12}:${String(mm).padStart(2,'0')} ${period}`;
}
