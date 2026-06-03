import './ScheduleBadge.css';

export type ScheduleMode = 'closed' | 'all' | 'today';

interface Props {
  count: number;        // total upcoming sessions across all future days
  todayCount: number;   // sessions planned specifically for today
  viewMode: ScheduleMode;
  /** Tap "All sessions" segment — toggles all-days view on/off */
  onSelectAll: () => void;
  /** Tap "Today" segment — toggles today-only view on/off */
  onSelectToday: () => void;
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Schedule badge — two visual states:
 *
 *  CLOSED  A single glass pill: "[📅] 8 planned"
 *          Tapping opens the "All sessions" rings view AND morphs the
 *          pill into a two-segment control.
 *
 *  OPEN    Two tappable segments inside one pill:
 *          [ All sessions · 8  │  Today · 3 ]
 *          The active segment is highlighted; tapping it again closes
 *          the rings entirely. Tapping the other segment switches view.
 *
 * This makes both options immediately visible — no hidden third click.
 */
export function ScheduleBadge({
  count, todayCount, viewMode, onSelectAll, onSelectToday,
}: Props) {
  // Hide entirely when nothing is planned and rings are not open
  if (count === 0 && viewMode === 'closed') return null;

  /* ── CLOSED STATE: single clickable pill ──────────────────────────── */
  if (viewMode === 'closed') {
    return (
      <button
        className="schedule-badge"
        type="button"
        onClick={onSelectAll}
        aria-label={`${count} planned session${count !== 1 ? 's' : ''} — tap to view`}
      >
        <CalIcon />
        {/* Full label desktop, short on mobile */}
        <span className="sb-full">{count} planned</span>
        <span className="sb-short">{count}</span>
      </button>
    );
  }

  /* ── OPEN STATE: two-segment pill ────────────────────────────────────
     Both segments are always visible — user can see and tap either one.
     The active segment has a filled background; inactive is dimmer.
     Tapping the active segment closes the view.                        */
  return (
    <div
      className="schedule-badge schedule-badge--open"
      role="group"
      aria-label="Schedule view"
    >
      {/* Segment 1: All sessions */}
      <button
        className={`sb-seg${viewMode === 'all' ? ' is-active' : ''}`}
        type="button"
        onClick={onSelectAll}
        aria-pressed={viewMode === 'all'}
        aria-label={
          viewMode === 'all'
            ? 'All sessions — tap to close'
            : 'Show all scheduled sessions'
        }
      >
        <CalIcon />
        {/* Desktop */}
        <span className="sb-full">
          All sessions{count > 0 ? ` · ${count}` : ''}
        </span>
        {/* Mobile — shorter label */}
        <span className="sb-short">All · {count}</span>
      </button>

      {/* Divider */}
      <span className="sb-divider" aria-hidden />

      {/* Segment 2: Today */}
      <button
        className={`sb-seg${viewMode === 'today' ? ' is-active' : ''}`}
        type="button"
        onClick={onSelectToday}
        aria-pressed={viewMode === 'today'}
        aria-label={
          viewMode === 'today'
            ? "Today's plan — tap to close"
            : "Show today's plan"
        }
      >
        {viewMode === 'today' && (
          /* small filled dot on the calendar icon when today is active */
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
            stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
            strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8"  y1="2" x2="8"  y2="6" />
            <line x1="3"  y1="10" x2="21" y2="10" />
            <circle cx="12" cy="16" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        )}
        <span>
          Today{todayCount > 0 ? ` · ${todayCount}` : ''}
        </span>
      </button>
    </div>
  );
}
