import type { TodayStats } from '../hooks/useTodayStats';
import './TodaySummary.css';

interface Props {
  stats: TodayStats;
  onClick: () => void;
}

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Minimal SVG flame — used only for streak ≥ 3. */
function FlameIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={11}
      height={11}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

/**
 * Bottom-center pill — total focus today, session count, streak.
 * Hidden when there are no sessions yet.
 * Streak flame is an SVG icon — no emoji.
 */
export function TodaySummary({ stats, onClick }: Props) {
  if (stats.count === 0) return null;

  const streakText = stats.streak > 0
    ? `${stats.streak}-day streak`
    : null;

  return (
    <button
      className="today-summary"
      type="button"
      onClick={onClick}
      title="Open history"
    >
      <span>{fmtDuration(stats.totalMs)}</span>
      <span className="today-summary__dot" aria-hidden />
      <span>{stats.count} session{stats.count > 1 ? 's' : ''}</span>
      {streakText && (
        <>
          <span className="today-summary__dot" aria-hidden />
          <span>
            {streakText}
            {stats.streak >= 3 && <FlameIcon />}
          </span>
        </>
      )}
    </button>
  );
}
