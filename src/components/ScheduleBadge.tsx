import { useLayoutEffect, useRef, useState } from 'react';
import './ScheduleBadge.css';

export type ScheduleMode = 'closed' | 'all' | 'today';

interface Props {
  count: number;
  todayCount: number;
  viewMode: ScheduleMode;
  onSelectAll: () => void;
  onSelectToday: () => void;
}

function CalIcon({ dot = false }: { dot?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
      {dot && <circle cx="12" cy="16" r="1.6" fill="currentColor" stroke="none" />}
    </svg>
  );
}

/**
 * Schedule badge — two visual states:
 *
 *  CLOSED  Single glass pill: "[📅] 8 planned"
 *
 *  OPEN    Two-segment pill with a sliding filled indicator:
 *          [ All sessions · 8  │  Today · 3 ]
 *
 *          A CSS-transitioned background pill slides between the
 *          active segment positions — no instant colour jump.
 *          Tapping the active segment closes the rings.
 *          Tapping the other segment switches the view.
 */
export function ScheduleBadge({
  count, todayCount, viewMode, onSelectAll, onSelectToday,
}: Props) {
  /* Refs for the sliding indicator position calculation */
  const containerRef = useRef<HTMLDivElement>(null);
  const allBtnRef    = useRef<HTMLButtonElement>(null);
  const todayBtnRef  = useRef<HTMLButtonElement>(null);

  /* Pixel position of the active-segment indicator */
  const [indPos, setIndPos] = useState<{ left: number; width: number } | null>(null);

  /**
   * useLayoutEffect fires synchronously after DOM mutation — the indicator
   * is positioned correctly before the browser paints, so there's no flash.
   * The CSS `transition: left/width` only animates when the values CHANGE
   * (i.e. when switching segments), not on first mount.
   */
  useLayoutEffect(() => {
    if (viewMode === 'closed') { setIndPos(null); return; }
    const container = containerRef.current;
    const btn = viewMode === 'all' ? allBtnRef.current : todayBtnRef.current;
    if (!container || !btn) return;
    const cr = container.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndPos({ left: br.left - cr.left + 2, width: br.width - 4 });
  }, [viewMode]);

  if (count === 0 && viewMode === 'closed') return null;

  /* ── CLOSED STATE ─────────────────────────────────────────────────── */
  if (viewMode === 'closed') {
    return (
      <button
        className="schedule-badge"
        type="button"
        onClick={onSelectAll}
        aria-label={`${count} planned session${count !== 1 ? 's' : ''} — tap to view`}
      >
        <CalIcon />
        <span className="sb-full">{count} planned</span>
        <span className="sb-short">{count}</span>
      </button>
    );
  }

  /* ── OPEN STATE: two-segment pill ─────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="schedule-badge schedule-badge--open"
      role="group"
      aria-label="Schedule view"
    >
      {/* Sliding indicator pill — sits behind the text */}
      {indPos && (
        <span
          className="sb-indicator"
          style={{ left: indPos.left, width: indPos.width }}
          aria-hidden
        />
      )}

      {/* Segment: All sessions */}
      <button
        ref={allBtnRef}
        className={`sb-seg${viewMode === 'all' ? ' is-active' : ''}`}
        type="button"
        onClick={onSelectAll}
        aria-pressed={viewMode === 'all'}
        aria-label={viewMode === 'all' ? 'All sessions — tap to close' : 'Show all sessions'}
      >
        <CalIcon />
        <span className="sb-full">All sessions · {count}</span>
        <span className="sb-short">All · {count}</span>
      </button>

      <span className="sb-divider" aria-hidden />

      {/* Segment: Today */}
      <button
        ref={todayBtnRef}
        className={`sb-seg${viewMode === 'today' ? ' is-active' : ''}`}
        type="button"
        onClick={onSelectToday}
        aria-pressed={viewMode === 'today'}
        aria-label={viewMode === 'today' ? "Today's plan — tap to close" : "Show today's plan"}
      >
        <CalIcon dot={viewMode === 'today'} />
        <span>Today{todayCount > 0 ? ` · ${todayCount}` : ''}</span>
      </button>
    </div>
  );
}
