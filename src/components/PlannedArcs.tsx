import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

interface Props {
  sessions: PlannedSession[];
  /** SVG viewBox radius of the focus ring. */
  ringR: number;
  /** SVG viewBox center. */
  C: number;
  /** Reference to the outer SVG element (for tooltip positioning). */
  svgEl: SVGSVGElement | null;
}

interface TooltipState {
  session: PlannedSession;
  x: number;  // viewport px
  y: number;
}

/**
 * Renders planned focus sessions as arc segments on the clock ring.
 *
 * Position mapping (12-hour clock face):
 *   angleDeg = (hour12 * 60 + minute) / 720 * 360
 *   where hour12 = HH % 12, minute = MM
 *
 * Arc width (minimum 8°, scales with duration):
 *   arcDeg = max(8, min(45, duration_minutes / 4))
 *
 * Arcs sit on RING_R + 2.5 — just outside the focus ring track.
 * pointer-events: stroke so they don't block ring click handlers.
 *
 * Color: --plan-arc (indigo) — distinct from red (second hand) and gold (bonus).
 * Visibility: opacity 0 normally, opacity 1 when .analog:hover (same as track).
 */
export function PlannedArcs({ sessions, ringR, C, svgEl }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (sessions.length === 0) return null;

  const R = ringR + 2.5; // slightly outside main ring

  function polar(angleDeg: number, r: number) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  }

  function arcPath(from: number, to: number, r: number): string {
    let delta = (((to - from) % 360) + 360) % 360;
    if (delta < 0.3) return '';
    if (delta > 359.5) delta = 359.5;
    const f = polar(from, r);
    const t = polar(from + delta, r);
    return `M ${f.x} ${f.y} A ${r} ${r} 0 ${delta > 180 ? 1 : 0} 1 ${t.x} ${t.y}`;
  }

  function sessionAngle(session: PlannedSession): { start: number; arcDeg: number } {
    const [hh, mm] = session.start_time_local.split(':').map(Number);
    const hour12 = (hh ?? 0) % 12;
    const minute = mm ?? 0;
    const start  = ((hour12 * 60 + minute) / 720) * 360;
    const arcDeg = Math.max(8, Math.min(45, session.duration_minutes / 4));
    return { start, arcDeg };
  }

  const showTooltip = (session: PlannedSession, e: React.MouseEvent<SVGPathElement>) => {
    if (!svgEl) return;
    const r = svgEl.getBoundingClientRect();
    const sr = (e.target as SVGPathElement).getBoundingClientRect();
    setTooltip({
      session,
      x: sr.left - r.left + sr.width / 2,
      y: sr.top  - r.top,
    });
  };

  return (
    <>
      <g className="planned-arcs" aria-label="Planned sessions">
        {sessions.map(s => {
          const { start, arcDeg } = sessionAngle(s);
          const d = arcPath(start, start + arcDeg, R);
          if (!d) return null;
          return (
            <path
              key={s.id}
              className="planned-arc"
              d={d}
              fill="none"
              strokeWidth={2.2}
              strokeLinecap="round"
              onMouseEnter={(e) => showTooltip(s, e)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </g>

      {/* Tooltip — glass pill, matches end-drop tooltip design */}
      {tooltip && (() => {
        const s   = tooltip.session;
        const tag = s.tag ? DEFAULT_TAGS.find(t => t.id === s.tag) : null;
        return (
          <div
            className="planned-arc-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
            aria-hidden
          >
            <div className="planned-arc-tooltip__row">
              {tag && (
                <span className="planned-arc-tooltip__icon">
                  <TagIcon def={tag} size={11} />
                </span>
              )}
              <span className="planned-arc-tooltip__label">
                {tag?.label ?? s.tag ?? 'Focus'}
              </span>
            </div>
            <div className="planned-arc-tooltip__time">
              {fmtTime(s.start_time_local)} · {fmtDuration(s.duration_minutes)}
            </div>
          </div>
        );
      })()}
    </>
  );
}
