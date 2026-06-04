import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS, FALLBACK_TAG } from '../lib/tags';
import { TagIcon } from './TagIcon';
import { tagColor } from './PlannedRingsLayer';
import './PlanActionCard.css';

interface Props {
  session:   PlannedSession;
  /**
   * True when no session is currently running — shows the "Start now" button.
   * False (or omit) when a countdown is already active — shows info only.
   */
  canStart?: boolean;
  onStart:   () => void;
  onDismiss: () => void;
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
export function PlanActionCard({ session, canStart = false, onStart, onDismiss }: Props) {
  const cardRef     = useRef<HTMLDivElement>(null);
  const dismissRef  = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  const tag   = session.tag ? (DEFAULT_TAGS.find(t => t.id === session.tag) ?? FALLBACK_TAG) : FALLBACK_TAG;
  const color = tagColor(session.tag);
  const endStr = endTimeStr(session.start_time_local, session.duration_minutes);

  /* Auto-dismiss after 6 s. Reset timer whenever the displayed session changes. */
  useEffect(() => {
    const t = window.setTimeout(() => dismissRef.current(), 6_000);
    return () => window.clearTimeout(t);
  }, [session.id]);

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
        <span className="plan-action-card__time">
          {fmtTime(session.start_time_local)}
          <span className="plan-action-card__sep" aria-hidden> – </span>
          {fmtTime(endStr)}
          <span className="plan-action-card__sep" aria-hidden> · </span>
          {fmtDuration(session.duration_minutes)}
        </span>
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
