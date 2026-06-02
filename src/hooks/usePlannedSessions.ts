import { useEffect, useState } from 'react';
import { listTodayPlanned, todayLocalDate, type PlannedSession } from '../lib/planStore';

/**
 * Fetches today's (non-completed) planned sessions for the clock ring
 * visualization. Refreshes when `refreshKey` increments.
 */
export function useTodayPlanned(
  userId: string | null,
  refreshKey = 0,
): PlannedSession[] {
  const [sessions, setSessions] = useState<PlannedSession[]>([]);

  useEffect(() => {
    if (!userId) { setSessions([]); return; }
    let cancelled = false;
    listTodayPlanned(userId, todayLocalDate()).then(rows => {
      if (!cancelled) setSessions(rows);
    });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  return sessions;
}
