import './ScheduleBadge.css';

interface Props {
  count: number;   // total upcoming scheduled sessions
  onClick: () => void;
}

/**
 * Floating glass pill — appears above TodaySummary when there are
 * upcoming planned sessions. Clicking opens the concentric ring view.
 * Fades with the idle timer like all other controls.
 */
export function ScheduleBadge({ count, onClick }: Props) {
  if (count === 0) return null;

  return (
    <button
      className="schedule-badge"
      type="button"
      onClick={onClick}
      aria-label={`${count} upcoming focus session${count > 1 ? 's' : ''} planned`}
    >
      {/* Calendar icon */}
      <svg
        viewBox="0 0 24 24"
        width={13}
        height={13}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3"  y1="10" x2="21" y2="10" />
      </svg>

      <span className="schedule-badge__count">{count}</span>
      <span className="schedule-badge__label">planned</span>
    </button>
  );
}
