import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

/* ============================================================
   Concentric day-ring visualization.
   New in this version:
   · activePlanId / currentHourAngle / completingPlanId props
   · When activePlanId is set: that arc renders as a live countdown
     (start edge = currentHourAngle, end edge = planned end)
   · When completingPlanId matches: arc plays reverse-draw vanish
   · RingsTooltipCard gains "Start now" button + hover bridge props
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

/** Convert a HH:MM[:SS] string to the hour-hand angle (0–360 over 12 h). */
export function timeToAngleDeg(s: string): number {
  const [hh, mm] = s.split(':').map(Number);
  return (((hh ?? 0) % 12) * 60 + (mm ?? 0)) / 720 * 360;
}

function durationToDeg(min: number): number {
  return Math.max(MIN_ARC_DEG, Math.min(MAX_ARC_DEG, min / 4));
}

export interface RingsTooltip { session: PlannedSession; vpX: number; vpY: number }

function computeTooltipPos(
  s: PlannedSession, r: number, C: number, svgEl: SVGSVGElement | null,
): { vpX: number; vpY: number } | null {
  if (!svgEl) return null;
  const startDeg = timeToAngleDeg(s.start_time_local);
  const midDeg   = startDeg + durationToDeg(s.duration_minutes) / 2;
  const rad      = ((midDeg - 90) * Math.PI) / 180;
  const rect     = svgEl.getBoundingClientRect();
  const scale    = rect.width / 100;
  return {
    vpX: rect.left + (C + Math.cos(rad) * r) * scale,
    vpY: rect.top  + (C + Math.sin(rad) * r) * scale,
  };
}

const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

/* ---- Single arc with separated hit target ---- */
interface ArcProps {
  session:           PlannedSession;
  r:                 number;
  C:                 number;
  svgEl:             SVGSVGElement | null;
  onTooltip:         (t: RingsTooltip | null) => void;
  tappedId:          string | null;
  onTap:             (id: string | null) => void;
  animDelay:         number;
  /** When true: render as countdown arc from currentHourAngle to planned end. */
  isCountdownActive?: boolean;
  /** Current hour-hand angle (((h%12)+m/60+s/3600)*30). Required for countdown. */
  currentHourAngle?: number;
  /** When true: play reverse-draw vanish animation before removal. */
  isCompleting?:     boolean;
}

function ArcSegment({
  session, r, C, svgEl, onTooltip, tappedId, onTap, animDelay,
  isCountdownActive, currentHourAngle, isCompleting,
}: ArcProps) {
  const [hovered, setHovered] = useState(false);

  const startDeg = timeToAngleDeg(session.start_time_local);
  const arcDeg   = durationToDeg(session.duration_minutes);
  const endDeg   = startDeg + arcDeg;

  let d: string;

  if (isCountdownActive && currentHourAngle !== undefined) {
    /*
     * Countdown mode — arc from current clock position to planned end.
     *
     * Use max(currentHourAngle, startDeg) so the arc never extends before
     * the planned start (e.g. user tapped "Start now" a few minutes early).
     * As the hour hand advances past startDeg the arc naturally shrinks.
     * When remaining < 2× gap the arc is consumed → return null.
     */
    const countdownFrom = Math.max(currentHourAngle, startDeg);
    const remaining     = endDeg - countdownFrom;
    if (remaining < ARC_GAP_DEG * 2) return null;
    d = arcPath(countdownFrom + ARC_GAP_DEG, endDeg - ARC_GAP_DEG, r, C);
  } else {
    d = arcPath(startDeg + ARC_GAP_DEG, startDeg + arcDeg - ARC_GAP_DEG, r, C);
  }

  if (!d) return null;

  const color    = tagColor(session.tag);
  const isActive = isCountdownActive || (isTouchDevice ? tappedId === session.id : hovered);

  const onEnter = () => {
    if (isTouchDevice) return;
    setHovered(true);
    const pos = computeTooltipPos(session, r, C, svgEl);
    if (pos) onTooltip({ session, ...pos });
  };
  const onLeave = () => {
    if (isTouchDevice) return;
    setHovered(false);
    // 200ms grace so the mouse can move from the arc to the tooltip's "Start now" button
    window.setTimeout(() => onTooltip(null), 200);
  };
  const onTapHandler = (e: React.MouseEvent) => {
    if (!isTouchDevice) return;
    e.stopPropagation();
    const next = tappedId === session.id ? null : session.id;
    onTap(next);
    if (next) {
      const pos = computeTooltipPos(session, r, C, svgEl);
      if (pos) onTooltip({ session, ...pos });
    } else {
      onTooltip(null);
    }
  };

  /*
   * Animation:
   * · Normal:     draw-in  — strokeDashoffset 1000 → 0
   * · Completing: vanish   — strokeDashoffset 0 → 1000 + opacity 1 → 0
   */
  const arcAnimation = isCompleting
    ? 'ring-arc-vanish 440ms cubic-bezier(0.4,0,1,1) both'
    : `ring-arc-draw 580ms cubic-bezier(0.22,0.61,0.36,1) ${animDelay}ms both`;

  return (
    <g style={{ pointerEvents: 'all' }}>
      {/* Static hit target — never transforms */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE_W}
        strokeLinecap="round"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onTapHandler}
      />

      {/* Visual arc — scales freely */}
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
  svgEl:             SVGSVGElement | null;
  onTooltip:         (t: RingsTooltip | null) => void;
  /** ID of the session currently being run as a countdown arc. */
  activePlanId?:     string | null;
  /** Current hour-hand angle. Required when activePlanId is set. */
  currentHourAngle?: number;
  /** ID of the session currently playing the vanish animation. */
  completingPlanId?: string | null;
}

export function PlannedRingsLayer({
  sessionsByDay, C, svgEl, onTooltip,
  activePlanId, currentHourAngle, completingPlanId,
}: LayerProps) {
  const [tappedId, setTappedId] = useState<string | null>(null);
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
                svgEl={svgEl}
                onTooltip={onTooltip}
                tappedId={tappedId}
                onTap={setTappedId}
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

/* ---- Tooltip card ---- */
export function RingsTooltipCard({
  tooltip,
  onStartPlan,
  onMouseEnter,
  onMouseLeave,
}: {
  tooltip:       RingsTooltip;
  /**
   * When provided: a "Start now" button appears inside the tooltip.
   * Pass undefined when a session is already running so the button hides.
   */
  onStartPlan?:  (session: PlannedSession) => void;
  /** Hover enter on the tooltip card — used to keep the card open when mouse
   *  moves from the arc to the "Start now" button. */
  onMouseEnter?: () => void;
  /** Hover leave on the tooltip card — hide after user moves away. */
  onMouseLeave?: () => void;
}) {
  const { session, vpX, vpY } = tooltip;
  const tag   = session.tag ? DEFAULT_TAGS.find(t => t.id === session.tag) : null;
  const color = tagColor(session.tag);

  return (
    <div
      className={`rings-tooltip${onStartPlan ? ' rings-tooltip--interactive' : ''}`}
      style={{ left: vpX, top: vpY }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden
    >
      <div className="rings-tooltip__accent" style={{ background: color }} />
      <div className="rings-tooltip__body">
        <div className="rings-tooltip__row">
          {tag && (
            <span className="rings-tooltip__icon" style={{ color }}>
              <TagIcon def={tag} size={12} />
            </span>
          )}
          <span className="rings-tooltip__label">{tag?.label ?? session.tag ?? 'Focus'}</span>
        </div>
        <div className="rings-tooltip__time">
          {fmtTime(session.start_time_local)}
          <span className="rings-tooltip__sep">·</span>
          {fmtDuration(session.duration_minutes)}
        </div>

        {onStartPlan && (
          <button
            className="rings-tooltip__start"
            type="button"
            style={{ '--arc-color': color } as React.CSSProperties}
            onClick={(e) => { e.stopPropagation(); onStartPlan(session); }}
          >
            <svg viewBox="0 0 24 24" width={9} height={9}
              fill="currentColor" stroke="none" aria-hidden>
              <path d="M8 5v14l11-7z"/>
            </svg>
            Start now
          </button>
        )}
      </div>
    </div>
  );
}
