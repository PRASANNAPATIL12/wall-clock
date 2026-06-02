import { useEffect, useState } from 'react';
import { listPlannedSessions, todayLocalDate, type PlannedSession } from '../lib/planStore';

/** YYYY-MM-DD of today + N days in local timezone. */
function dateOffsetLocal(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * Fetches the next 4 days of non-completed planned sessions, grouped
 * by date. Returns a stable Map<'YYYY-MM-DD', PlannedSession[]>.
 * Used by PlannedRingsLayer for the concentric ring visualization.
 */
export function useUpcomingPlanned(
  userId: string | null,
  refreshKey = 0,
): { byDay: Map<string, PlannedSession[]>; total: number } {
  const [byDay, setByDay] = useState<Map<string, PlannedSession[]>>(new Map());

  useEffect(() => {
    if (!userId) { setByDay(new Map()); return; }
    let cancelled = false;

    listPlannedSessions(userId, todayLocalDate(), dateOffsetLocal(3))
      .then(rows => {
        if (cancelled) return;
        const m = new Map<string, PlannedSession[]>();
        for (const r of rows) {
          if (r.completed) continue; // skip completed sessions
          const arr = m.get(r.scheduled_date) ?? [];
          arr.push(r);
          m.set(r.scheduled_date, arr);
        }
        setByDay(m);
      });

    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  const total = Array.from(byDay.values()).reduce((s, arr) => s + arr.length, 0);
  return { byDay, total };
}

/** Legacy hook — fetches only today's sessions for the simple arc overlay. */
export function useTodayPlanned(
  userId: string | null,
  refreshKey = 0,
): PlannedSession[] {
  const { byDay } = useUpcomingPlanned(userId, refreshKey);
  return byDay.get(todayLocalDate()) ?? [];
}
