import { useEffect, useState } from 'react';
import { listSessionsByDateRange } from '../lib/sessionStore';
import type { SessionRow } from '../lib/supabase';

/**
 * Today's focus stats — total time, completed count, current streak.
 *
 * Refetches when:
 *   · the user changes (sign-in / sign-out)
 *   · the timezone changes (date_local logic shifts)
 *   · `refreshKey` ticks (host bumps after a session save)
 */

export interface TodayStats {
  totalMs: number;
  count: number;
  streak: number;
}

const EMPTY: TodayStats = { totalMs: 0, count: 0, streak: 0 };

function todayDateLocal(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz === 'local' ? undefined : tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/** YYYY-MM-DD for `daysAgo` days before today, in the given timezone. */
function dateLocalNDaysAgo(tz: string, daysAgo: number): string {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz === 'local' ? undefined : tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

function computeStreak(byDate: Map<string, number>, tz: string): number {
  // Walk backward from today; count consecutive days with at least one
  // completed session (here approximated by any session with duration > 0).
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = dateLocalNDaysAgo(tz, i);
    if (byDate.has(d)) streak++;
    else break;
  }
  return streak;
}

export function useTodayStats(
  userId: string | null,
  timezone: string,
  refreshKey: number,
): TodayStats {
  const [stats, setStats] = useState<TodayStats>(EMPTY);

  useEffect(() => {
    if (!userId) {
      setStats(EMPTY);
      return;
    }
    let cancelled = false;

    const today = todayDateLocal(timezone);
    // Pull last 60 days for streak math; today's rows for the summary
    const sixtyAgo = dateLocalNDaysAgo(timezone, 60);

    listSessionsByDateRange(userId, sixtyAgo, today)
      .then((rows: SessionRow[]) => {
        if (cancelled) return;

        // Today rollup
        let totalMs = 0;
        let count = 0;
        for (const r of rows) {
          if (r.date_local !== today) continue;
          const start = new Date(r.start_time).getTime();
          const end = new Date(r.end_time).getTime();
          totalMs += Math.max(0, end - start);
          count++;
        }

        // Streak: bucket by date
        const byDate = new Map<string, number>();
        for (const r of rows) {
          byDate.set(r.date_local, (byDate.get(r.date_local) ?? 0) + 1);
        }
        const streak = computeStreak(byDate, timezone);

        setStats({ totalMs, count, streak });
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, timezone, refreshKey]);

  return stats;
}
