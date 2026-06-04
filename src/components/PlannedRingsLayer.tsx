import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

/* ============================================================
   Concentric day-ring visualization.

   Interaction model (Option A — bottom action card):
   · Desktop hover:  arc raises + glows   (purely visual, no card)
   · Desktop click:  onSelectArc(session)  (shows PlanActionCard)
   · Mobile tap:     arc raises + onSelectArc(session)
   · Tap same arc:   onSelectArc(null)     (dismisses card + lowers arc)

   The old RingsTooltipCard / tooltip hover bridge is removed entirely.
   computeTooltipPos is also removed (card is always bottom-centre).
   ============================================================ */

export const RING_BASE_R = 56;
export const RING_GAP    = 5;
const RING_STROKE        = 1.8;
const HIT_STROKE_W       = 5;
const ARC_GAP_DEG        = 1.8;
const MIN_ARC_DEG        = 11;
const MAX_ARC_DEG        = 62;

const TAG_COLORS: Record<string, string> = {
  code:     '#818cf8',
  write:    '#34d399',
  study:    '#60a5fa',
  design:   '#c084fc',
  rest:     '#2dd4bf',
  meet:     '#f472b6',
  exercise: '#fb923c',
  read:     '#4ade80',
  plan:     '#fbbf24',
  research: '#38bdf8',
  music:    '#e879f9',
  break:    '#a3e635',
  personal: '#f87171',
  other:    '#94a3b8',
};

export function tagColor(id: string | null): string {
  return TAG_COLORS[id ?? 'other'] ?? TAG_COLORS.other!;
}

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function polar(deg: number, r: number, C: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

function arcPath(fromDeg: number, toDeg: number, r: number, C: number): string {
  let delta = (((toDeg - fromDeg) % 360) + 360) % 360;
  if (delta < 0.5) return '';
  if (delta > 359.5) delta = 359.5;
  const f = polar(fromDeg, r, C);
  const t = polar(fromDeg + delta, r, C);
  return `M ${f.x} ${f.y} A ${r} ${r} 0 ${delta > 180 ? 1 : 0} 1 ${t.x} ${t.y}`;
}

/** Convert HH:MM[:SS] → hour-hand angle (0–360 over 12 h). */
export function timeToAngleDeg(s: string): number {
  const [hh, mm] = s.split(':').map(Number);
  return (((hh ?? 0) % 12) * 60 + (mm ?? 0)) / 720 * 360;
}

function durationToDeg(min: number): number {
  return Math.max(MIN_ARC_DEG, Math.min(MAX_ARC_DEG, min / 4));
}

const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

/* ---- Single arc ---- */
interface ArcProps {
  session:           PlannedSession;
  r:                 number;
  C:                 number;
  onSelectArc:       (s: PlannedSession | null) => void;
  /** True when this arc is "selected" (raised on mobile, card open) */
  isSelected:        boolean;
  animDelay:         number;
  isCountdownActive?: boolean;
  currentHourAngle?:  number;
  isCompleting?:      boolean;
}

function ArcSegment({
  session, r, C, onSelectArc, isSelected, animDelay,
  isCountdownActive, currentHourAngle, isCompleting,
}: ArcProps) {
  const [hovered, setHovered] = useState(false);

  const startDeg = timeToAngleDeg(session.start_time_local);
  const arcDeg   = durationToDeg(session.duration_minutes);
  const endDeg   = startDeg + arcDeg;

  let d: string;

  if (isCountdownActive && currentHourAngle !== undefined) {
    const from    = Math.max(currentHourAngle, startDeg);
    const remain  = endDeg - from;
    if (remain < ARC_GAP_DEG * 2) return null;
    d = arcPath(from + ARC_GAP_DEG, endDeg - ARC_GAP_DEG, r, C);
  } else {
    d = arcPath(startDeg + ARC_GAP_DEG, startDeg + arcDeg - ARC_GAP_DEG, r, C);
  }

  if (!d) return null;

  const color    = tagColor(session.tag);
  /*
   * isActive drives the visual raise + glow.
   * Desktop: hover (mouse) OR countdown.
   * Mobile:  tapped/selected OR countdown.
   */
  const isActive = isCountdownActive || (isTouchDevice ? isSelected : hovered);

  /* --- Desktop hover (purely visual — no card interaction) --- */
  const onEnter = () => { if (!isTouchDevice) setHovered(true); };
  const onLeave = () => { if (!isTouchDevice) setHovered(false); };

  /* --- Desktop click → show card --- */
  const onClickDesktop = (e: React.MouseEvent) => {
    if (isTouchDevice) return;
    e.stopPropagation();
    onSelectArc(session);
  };

  /* --- Mobile tap → toggle arc raise + card --- */
  const onTap = (e: React.MouseEvent) => {
    if (!isTouchDevice) return;
    e.stopPropagation();
    // Toggle: if this arc is already selected → deselect, else select
    onSelectArc(isSelected ? null : session);
  };

  /* Animation */
  const arcAnimation = isCompleting
    ? 'ring-arc-vanish 440ms cubic-bezier(0.4,0,1,1) both'
    : `ring-arc-draw 580ms cubic-bezier(0.22,0.61,0.36,1) ${animDelay}ms both`;

  return (
    <g style={{ pointerEvents: 'all' }}>
      {/* Static hit target — never transforms; prevents hover/scale vibration */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE_W}
        strokeLinecap="round"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={(e) => { onClickDesktop(e); onTap(e); }}
      />

      {/* Visual arc — scales from clock centre on hover/tap */}
      <g
        style={{
          transformBox:    'view-box',
          transformOrigin: `${C}px ${C}px`,
          transform:       isActive ? 'scale(1.04)' : 'scale(1)',
          filter: isActive
            ? `brightness(1.5) saturate(1.25) drop-shadow(0 0 5px ${hexToRgba(color, 0.65)})`
            : `drop-shadow(0 0 2.5px ${hexToRgba(color, 0.45)})`,
          transition: isActive
            ? 'transform 220ms ease-out, filter 180ms ease-out'
            : 'transform 190ms ease-out, filter 150ms ease-out',
          pointerEvents: 'none',
        }}
      >
        <path
          d={d}
          fill="none"
          strokeLinecap="round"
          pathLength={1000}
          style={{
            stroke:           color,
            strokeWidth:      isActive ? RING_STROKE + 0.9 : RING_STROKE,
            strokeOpacity:    isActive ? 1 : 0.80,
            strokeDasharray:  1000,
            strokeDashoffset: 1000,
            animation:        arcAnimation,
            transition:       isCompleting
              ? 'none'
              : 'stroke-width 220ms ease-out, stroke-opacity 200ms ease-out',
            pointerEvents:    'none',
          }}
        />
      </g>
    </g>
  );
}

/* ---- Layer ---- */
interface LayerProps {
  sessionsByDay:     Map<string, PlannedSession[]>;
  C:                 number;
  svgEl:             SVGSVGElement | null;  // kept for API compatibility
  /** Called when user clicks/taps an arc. null = deselect. */
  onSelectArc:       (s: PlannedSession | null) => void;
  /** The currently selected plan session id (controls mobile raise + card). */
  selectedPlanId?:   string | null;
  activePlanId?:     string | null;
  currentHourAngle?: number;
  completingPlanId?: string | null;
}

export function PlannedRingsLayer({
  sessionsByDay, C, onSelectArc,
  selectedPlanId, activePlanId, currentHourAngle, completingPlanId,
}: LayerProps) {
  const days = Array.from(sessionsByDay.keys()).sort();
  if (days.length === 0) return null;

  return (
    <g
      className="planned-rings-layer"
      style={{ transformBox: 'view-box', transformOrigin: `${C}px ${C}px`, pointerEvents: 'all' }}
    >
      {days.map((date, dayIdx) => {
        const r        = RING_BASE_R + dayIdx * RING_GAP;
        const sessions = sessionsByDay.get(date) ?? [];
        return (
          <g
            key={date}
            className="planned-ring-day"
            style={{ animationDelay: `${dayIdx * 40}ms`, pointerEvents: 'all' }}
          >
            <circle
              cx={C} cy={C} r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.55}
              strokeOpacity={0.18}
              strokeDasharray="0.6 1.4"
              style={{ pointerEvents: 'none' }}
            />

            {sessions.map((s, sIdx) => (
              <ArcSegment
                key={s.id}
                session={s}
                r={r}
                C={C}
                onSelectArc={onSelectArc}
                isSelected={selectedPlanId === s.id}
                animDelay={dayIdx * 40 + sIdx * 35 + 60}
                isCountdownActive={activePlanId === s.id}
                currentHourAngle={currentHourAngle}
                isCompleting={completingPlanId === s.id}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/* ---- Kept for backwards compat (unused, will be removed next clean-up) ---- */
export interface RingsTooltip { session: PlannedSession; vpX: number; vpY: number }
export function RingsTooltipCard({ tooltip }: { tooltip: RingsTooltip }) {
  const { session } = tooltip;
  const tag   = DEFAULT_TAGS.find(t => t.id === session.tag);
  const color = tagColor(session.tag);
  return (
    <div className="rings-tooltip" style={{ left: tooltip.vpX, top: tooltip.vpY }} aria-hidden>
      <div className="rings-tooltip__accent" style={{ background: color }} />
      <div className="rings-tooltip__body">
        <div className="rings-tooltip__row">
          {tag && <span className="rings-tooltip__icon" style={{ color }}><TagIcon def={tag} size={12} /></span>}
          <span className="rings-tooltip__label">{tag?.label ?? 'Focus'}</span>
        </div>
      </div>
    </div>
  );
}
