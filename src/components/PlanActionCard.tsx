import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS, FALLBACK_TAG } from '../lib/tags';
import { TagIcon } from './TagIcon';
import { tagColor } from './PlannedRingsLayer';
import './PlanActionCard.css';

interface Props {
  session:    PlannedSession;
  /**
   * True when idle and this session hasn't started — shows "Start now" button.
   */
  canStart?:   boolean;
  /**
   * True when this session is currently counting down.
   * Shows live elapsed + remaining instead of the time range + start button.
   */
  isRunning?:  boolean;
  /** Milliseconds elapsed since the session started. Passed every second by FocusRing. */
  elapsedMs?:  number;
  /** Milliseconds remaining until the session goal. Passed every second by FocusRing. */
  remainingMs?: number;
  onStart:     () => void;
  onDismiss:   () => void;
}

/** Format milliseconds as "1h 15m", "45m", "30s", etc. */
function fmtMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 && m < 2 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function endTimeStr(startTime: string, durationMin: number): string {
  const [hh, mm] = startTime.split(':').map(Number);
  const total = (mm ?? 0) + durationMin;
  const h = (hh ?? 0) + Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * PlanActionCard — fixed bottom-centre glass pill that appears when the
 * user clicks (desktop) or taps (mobile) a planned session arc.
 *
 * Position: always anchored bottom-centre, above the TodaySummary pill.
 * The card never moves — no chasing a floating tooltip.
 *
 * Desktop:  click arc → card appears. Hover raise/glow on arc unchanged.
 * Mobile:   tap arc → arc raises (visual) + card appears.
 *
 * Dismisses via:
 *   · "Start now" button (starts countdown)
 *   · ✕ button
 *   · Click / tap anywhere outside
 *   · 6-second auto-dismiss
 */
export function PlanActionCard({
  session, canStart = false, isRunning = false,
  elapsedMs, remainingMs, onStart, onDismiss,
}: Props) {
  const cardRef     = useRef<HTMLDivElement>(null);
  const dismissRef  = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  const tag   = session.tag ? (DEFAULT_TAGS.find(t => t.id === session.tag) ?? FALLBACK_TAG) : FALLBACK_TAG;
  const color = tagColor(session.tag);
  const endStr = endTimeStr(session.start_time_local, session.duration_minutes);

  /* Auto-dismiss timer.
   * · Idle card (not running): 6 s
   * · Running card: 10 s (user may want to glance at progress a bit longer) */
  useEffect(() => {
    const delay = isRunning ? 10_000 : 6_000;
    const t = window.setTimeout(() => dismissRef.current(), delay);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isRunning]);

  /* Click-outside dismiss. Delayed 50 ms so the arc click that opened the
     card doesn't immediately dismiss it via this same listener. */
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    const t = window.setTimeout(() => {
      const handle = (e: MouseEvent) => {
        if (cardRef.current?.contains(e.target as Node)) return;
        dismissRef.current();
      };
      document.addEventListener('mousedown', handle);
      cleanup = () => document.removeEventListener('mousedown', handle);
    }, 50);
    return () => { window.clearTimeout(t); cleanup?.(); };
  }, []);

  return createPortal(
    <div
      ref={cardRef}
      className="plan-action-card"
      role="status"
      aria-live="polite"
    >
      {/* Left colour stripe — tag accent */}
      <span className="plan-action-card__accent" style={{ background: color }} />

      {/* Tag icon */}
      <span className="plan-action-card__icon" style={{ color }}>
        <TagIcon def={tag} size={14} />
      </span>

      {/* Session info */}
      <div className="plan-action-card__info">
        <span className="plan-action-card__label">{tag.label}</span>

        {isRunning && elapsedMs !== undefined && remainingMs !== undefined ? (
          /* Running view: show live elapsed + remaining */
          <span className="plan-action-card__time">
            <span className="plan-action-card__running-badge" aria-hidden>●</span>
            {fmtMs(elapsedMs)} done
            <span className="plan-action-card__sep" aria-hidden> · </span>
            {fmtMs(remainingMs)} left
          </span>
        ) : (
          /* Idle view: show scheduled time range */
          <span className="plan-action-card__time">
            {fmtTime(session.start_time_local)}
            <span className="plan-action-card__sep" aria-hidden> – </span>
            {fmtTime(endStr)}
            <span className="plan-action-card__sep" aria-hidden> · </span>
            {fmtDuration(session.duration_minutes)}
          </span>
        )}
      </div>

      {/* Start now — only when idle */}
      {canStart && (
        <button
          className="plan-action-card__start"
          type="button"
          style={{ '--card-color': color } as React.CSSProperties}
          onClick={(e) => { e.stopPropagation(); onStart(); }}
        >
          <svg viewBox="0 0 24 24" width={10} height={10}
            fill="currentColor" stroke="none" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Start now
        </button>
      )}

      {/* Dismiss */}
      <button
        className="plan-action-card__close"
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
