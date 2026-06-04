import { useState } from 'react';
import type { TodayStats } from '../hooks/useTodayStats';
import './TodaySummary.css';

interface Props {
  stats: TodayStats;
  onClick: () => void;
  /** Daily goal in ms. 0 = no goal set. */
  dailyGoalMs?: number;
  /** 0–1 progress toward daily goal. null when no goal set. */
  goalProgress?: number | null;
}

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

/**
 * Bottom-center pill — total focus today, session count, streak.
 *
 * When a daily goal is set:
 *   · Shows "1h 45m / 4h" instead of just "1h 45m"
 *   · On mobile this fraction IS the progress indicator (no separate bar)
 *   · On desktop the separate DailyGoalBar at the viewport bottom handles the bar
 */
export function TodaySummary({ stats, onClick, dailyGoalMs = 0, goalProgress = null }: Props) {
  const [hovered, setHovered] = useState(false);
  if (stats.count === 0) return null;

  const goalReached = goalProgress !== null && goalProgress >= 1;
  const showGoal    = dailyGoalMs > 0;

  return (
    <button
      className={`today-summary${goalReached ? ' goal-reached' : ''}`}
      type="button"
      onClick={onClick}
      aria-label="Open stats"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Time: "1h 45m" or "1h 45m / 4h" when goal set */}
      <span>
        {fmtDuration(stats.totalMs)}
        {showGoal && (
          <span className="today-summary__goal-frac">
            {' / '}{fmtDuration(dailyGoalMs)}
          </span>
        )}
      </span>

      <span className="today-summary__dot" aria-hidden />
      <span>{stats.count} session{stats.count > 1 ? 's' : ''}</span>

      {stats.streak > 0 && (
        <>
          <span className="today-summary__dot" aria-hidden />
          <span>
            {stats.streak}-day streak
            <FlameIcon />
          </span>
        </>
      )}

      {/* Glass tooltip above the button */}
      {hovered && (
        <span className="today-summary__tooltip" aria-hidden>
          Open stats
        </span>
      )}
    </button>
  );
}
