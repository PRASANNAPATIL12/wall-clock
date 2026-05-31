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

/**
 * Bottom-center pill — total focus today, session count, streak.
 * Hidden when there are no sessions yet (don't show "0h 0m").
 */
export function TodaySummary({ stats, onClick }: Props) {
  if (stats.count === 0) return null;

  const parts: string[] = [];
  parts.push(fmtDuration(stats.totalMs));
  parts.push(`${stats.count} session${stats.count > 1 ? 's' : ''}`);
  if (stats.streak >= 3) parts.push(`${stats.streak}-day streak 🔥`);
  else if (stats.streak > 0) parts.push(`${stats.streak}-day streak`);

  return (
    <button
      className="today-summary"
      type="button"
      onClick={onClick}
      title="Open history"
    >
      {parts.join(' · ')}
    </button>
  );
}
