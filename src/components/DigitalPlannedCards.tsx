import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtTime, fmtDuration } from '../lib/planStore';
import { DEFAULT_TAGS, FALLBACK_TAG } from '../lib/tags';
import { TagIcon } from './TagIcon';
import { tagColor } from './PlannedRingsLayer';
import { PlanActionCard } from './PlanActionCard';
import './DigitalPlannedCards.css';

interface Props {
  sessions: PlannedSession[];
  /** True when a session is idle and can be started. */
  canStart: boolean;
  onStart: (session: PlannedSession) => void;
}

/**
 * DigitalPlannedCards — horizontal scrollable row of today's planned sessions.
 * Shows below the digital clock display when the user is in digital mode.
 * Clicking a card shows the same PlanActionCard popup (glass pill bottom-centre).
 */
export function DigitalPlannedCards({ sessions, canStart, onStart }: Props) {
  const [selected, setSelected] = useState<PlannedSession | null>(null);

  if (sessions.length === 0) return null;

  return (
    <>
      <div className="digital-plan-cards" role="list" aria-label="Today's planned sessions">
        {sessions.map((s) => {
          const tag   = s.tag ? (DEFAULT_TAGS.find(t => t.id === s.tag) ?? FALLBACK_TAG) : FALLBACK_TAG;
          const color = tagColor(s.tag);
          return (
            <button
              key={s.id}
              type="button"
              role="listitem"
              className="digital-plan-card"
              style={{ '--card-color': color } as React.CSSProperties}
              onClick={() => setSelected(s)}
              aria-label={`${tag.label} at ${fmtTime(s.start_time_local)} for ${fmtDuration(s.duration_minutes)}`}
            >
              <span className="digital-plan-card__dot" style={{ background: color }} aria-hidden />
              <span className="digital-plan-card__icon" style={{ color }}>
                <TagIcon def={tag} size={12} />
              </span>
              <span className="digital-plan-card__time">{fmtTime(s.start_time_local)}</span>
              <span className="digital-plan-card__dur">{fmtDuration(s.duration_minutes)}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <PlanActionCard
          key={selected.id}
          session={selected}
          canStart={canStart}
          isRunning={false}
          onStart={() => { onStart(selected); setSelected(null); }}
          onDismiss={() => setSelected(null)}
        />
      )}
    </>
  );
}
