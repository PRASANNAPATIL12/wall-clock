import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

/* ============================================================
   Concentric day-ring visualization.

   Rendered inside the FocusRing SVG (viewBox 0 0 100 100).
   Each calendar day gets its own ring at increasing radius,
   and each planned session appears as a colored arc segment
   within that ring, positioned by scheduled time.
   ============================================================ */

/* ---- Configuration ---- */
export const RING_BASE_R = 49.5;  // Innermost ring radius (SVG units)
export const RING_GAP    = 4;     // Gap between day rings (SVG units)
export const RING_STROKE = 2.6;   // Arc stroke width
const ARC_GAP = 1.5;              // Degrees trimmed each side of arc
const MIN_ARC_DEG = 10;           // Minimum arc span
const MAX_ARC_DEG = 60;           // Maximum arc span

/* ---- Color palette per activity ---- */
const TAG_COLORS: Record<string, string> = {
  code:     '#818cf8', // indigo
  write:    '#34d399', // emerald
  study:    '#60a5fa', // blue
  design:   '#a78bfa', // violet
  rest:     '#2dd4bf', // teal
  meet:     '#f472b6', // pink
  exercise: '#fb923c', // orange
  read:     '#4ade80', // green
  plan:     '#fbbf24', // amber
  research: '#38bdf8', // sky
  music:    '#e879f9', // fuchsia
  break:    '#a3e635', // lime
  personal: '#f87171', // red
  other:    '#94a3b8', // slate
};

export function tagColor(tagId: string | null): string {
  return TAG_COLORS[tagId ?? 'other'] ?? TAG_COLORS.other!;
}

/* ---- Geometry helpers ---- */

function polar(angleDeg: number, r: number, C: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

function arcPath(fromDeg: number, toDeg: number, r: number, C: number): string {
  let delta = (((toDeg - fromDeg) % 360) + 360) % 360;
  if (delta < 0.3) return '';
  if (delta > 359.5) delta = 359.5;
  const from = polar(fromDeg, r, C);
  const to   = polar(fromDeg + delta, r, C);
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${delta > 180 ? 1 : 0} 1 ${to.x} ${to.y}`;
}

/** Map a scheduled time string ('HH:MM:00') to clock face angle (0° = 12 o'clock). */
function timeToAngleDeg(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number);
  const hour12  = (hh ?? 0) % 12;
  const minute  = mm ?? 0;
  return ((hour12 * 60 + minute) / 720) * 360;
}

/** Map duration in minutes to arc degrees. */
function durationToDeg(minutes: number): number {
  return Math.max(MIN_ARC_DEG, Math.min(MAX_ARC_DEG, minutes / 4));
}

/* ---- Tooltip state shared with FocusRing ---- */
export interface RingsTooltip {
  session: PlannedSession;
  vpX: number; // viewport X of arc midpoint
  vpY: number; // viewport Y of arc midpoint
}

function computeTooltipPos(
  session: PlannedSession,
  ringRadius: number,
  C: number,
  svgEl: SVGSVGElement | null,
): { vpX: number; vpY: number } | null {
  if (!svgEl) return null;
  const startDeg = timeToAngleDeg(session.start_time_local);
  const arcDeg   = durationToDeg(session.duration_minutes);
  const midDeg   = startDeg + arcDeg / 2;
  const rad      = ((midDeg - 90) * Math.PI) / 180;
  const svgRect  = svgEl.getBoundingClientRect();
  const scale    = svgRect.width / 100;
  return {
    vpX: svgRect.left + (C + Math.cos(rad) * ringRadius) * scale,
    vpY: svgRect.top  + (C + Math.sin(rad) * ringRadius) * scale,
  };
}

/* ============================================================
   SVG layer component — pure SVG elements rendered inside FocusRing
   ============================================================ */

interface LayerProps {
  sessionsByDay: Map<string, PlannedSession[]>;
  C: number;
  svgEl: SVGSVGElement | null;
  onTooltip: (t: RingsTooltip | null) => void;
}

export function PlannedRingsLayer({ sessionsByDay, C, svgEl, onTooltip }: LayerProps) {
  const days = Array.from(sessionsByDay.keys()).sort().slice(0, 4);
  if (days.length === 0) return null;

  return (
    <g className="planned-rings-layer">
      {days.map((date, dayIdx) => {
        const r        = RING_BASE_R + dayIdx * RING_GAP;
        const sessions = sessionsByDay.get(date) ?? [];

        return (
          <g
            key={date}
            className="planned-ring-day"
            style={{ animationDelay: `${dayIdx * 70}ms` }}
          >
            {/* Ghost track — subtle dotted circle for the day ring */}
            <circle
              cx={C} cy={C} r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE * 0.35}
              strokeOpacity={0.10}
              strokeDasharray="0.5 1.2"
            />

            {/* Colored arc segments for each planned session */}
            {sessions.map((s, sIdx) => {
              const startDeg = timeToAngleDeg(s.start_time_local);
              const arcDeg   = durationToDeg(s.duration_minutes);
              const d = arcPath(
                startDeg + ARC_GAP,
                startDeg + arcDeg - ARC_GAP,
                r, C,
              );
              if (!d) return null;

              const color = tagColor(s.tag);
              const delay = dayIdx * 70 + sIdx * 30 + 100;

              return (
                <path
                  key={s.id}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  className="ring-arc"
                  style={{ animationDelay: `${delay}ms` }}
                  onMouseEnter={() => {
                    const pos = computeTooltipPos(s, r, C, svgEl);
                    if (pos) onTooltip({ session: s, ...pos });
                  }}
                  onMouseLeave={() => onTooltip(null)}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

/* ============================================================
   Tooltip component — glass card, matches existing tooltip style
   ============================================================ */

interface TooltipProps {
  tooltip: RingsTooltip;
}

export function RingsTooltipCard({ tooltip }: TooltipProps) {
  const { session, vpX, vpY } = tooltip;
  const tag = session.tag ? DEFAULT_TAGS.find(t => t.id === session.tag) : null;
  const color = tagColor(session.tag);

  return (
    <div
      className="rings-tooltip"
      style={{ left: vpX, top: vpY }}
      aria-hidden
    >
      <div className="rings-tooltip__row">
        {tag && (
          <span className="rings-tooltip__icon" style={{ color }}>
            <TagIcon def={tag} size={12} />
          </span>
        )}
        <span className="rings-tooltip__label">{tag?.label ?? session.tag ?? 'Focus'}</span>
      </div>
      <div className="rings-tooltip__time">
        {fmtTime(session.start_time_local)} · {fmtDuration(session.duration_minutes)}
      </div>
    </div>
  );
}
