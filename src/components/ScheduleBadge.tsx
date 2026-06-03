import './ScheduleBadge.css';

export type ScheduleMode = 'closed' | 'all' | 'today';

interface Props {
  count: number;          // total upcoming sessions (all future days)
  todayCount: number;     // sessions planned for today specifically
  viewMode: ScheduleMode;
  onClick: () => void;
}

/**
 * Three-state glass pill for the concentric rings view.
 *
 *  closed  → tap → 'all'    Show all future day rings (N concentric rings)
 *  all     → tap → 'today'  Show only today's ring (single innermost ring)
 *  today   → tap → closed   Close rings view entirely
 *
 * The label and subtle styling change for each state so the user can
 * always tell what the next tap will do.
 */
export function ScheduleBadge({ count, todayCount, viewMode, onClick }: Props) {
  if (count === 0 && viewMode === 'closed') return null;

  const label =
    viewMode === 'all'   ? 'All sessions' :
    viewMode === 'today' ? "Today's plan"  :
    `${count} planned`;

  const isActive = viewMode !== 'closed';

  return (
    <button
      className={`schedule-badge${isActive ? ' is-active' : ''}${viewMode === 'today' ? ' is-today' : ''}`}
      type="button"
      onClick={onClick}
      aria-label={
        viewMode === 'all'   ? `Showing all sessions — tap to view today's plan` :
        viewMode === 'today' ? `Showing today's plan — tap to close` :
        `${count} upcoming session${count !== 1 ? 's' : ''} — tap to view`
      }
      aria-pressed={isActive}
    >
      {/* Icon — calendar for closed/all, today-marker for today mode */}
      {viewMode === 'today' ? (
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
          stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
          strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8"  y1="2" x2="8"  y2="6" />
          <line x1="3"  y1="10" x2="21" y2="10" />
          {/* dot marking "today" cell */}
          <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
          stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
          strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8"  y1="2" x2="8"  y2="6" />
          <line x1="3"  y1="10" x2="21" y2="10" />
        </svg>
      )}

      <span className="schedule-badge__label">{label}</span>

      {/* Show today's session count when in "today" mode */}
      {viewMode === 'today' && todayCount > 0 && (
        <span className="schedule-badge__count">{todayCount}</span>
      )}

      {/* Show total count when closed */}
      {viewMode === 'closed' && (
        <span className="schedule-badge__count">{count}</span>
      )}
    </button>
  );
}
