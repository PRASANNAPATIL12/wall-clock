import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

/* ============================================================
   Concentric day-ring visualization — thin arc segments.

   Why pointer-events needed:
   The parent FocusRing SVG has CSS `pointer-events: none`.
   This prevents the browser from dispatching ANY mouse events to
   children. We override it explicitly with pointerEvents="all" on
   the layer <g> and each arc <g>, which restores hover/click on
   the ring segments without affecting the focus ring's own logic.
   ============================================================ */

export const RING_BASE_R = 49.5;
export const RING_GAP    = 4.2;
const RING_STROKE        = 1.8;    // thin elegant pipe
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

function polar(angleDeg: number, r: number, C: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
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

function timeToAngleDeg(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number);
  return (((hh ?? 0) % 12) * 60 + (mm ?? 0)) / 720 * 360;
}

function durationToDeg(min: number): number {
  return Math.max(MIN_ARC_DEG, Math.min(MAX_ARC_DEG, min / 4));
}

export interface RingsTooltip {
  session: PlannedSession;
  vpX: number;
  vpY: number;
}

function getTooltipPos(
  s: PlannedSession, r: number, C: number, svgEl: SVGSVGElement | null,
): { vpX: number; vpY: number } | null {
  if (!svgEl) return null;
  const startDeg = timeToAngleDeg(s.start_time_local);
  const arcDeg   = durationToDeg(s.duration_minutes);
  const midDeg   = startDeg + arcDeg / 2;
  const rad      = ((midDeg - 90) * Math.PI) / 180;
  const rect     = svgEl.getBoundingClientRect();
  const scale    = rect.width / 100;
  return {
    vpX: rect.left + (C + Math.cos(rad) * r) * scale,
    vpY: rect.top  + (C + Math.sin(rad) * r) * scale,
  };
}

const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

/* ---- Single arc ---- */
interface ArcProps {
  session: PlannedSession;
  r: number;
  C: number;
  svgEl: SVGSVGElement | null;
  onTooltip: (t: RingsTooltip | null) => void;
  tappedId: string | null;
  onTap: (id: string | null) => void;
  animDelay: number;
}

function ArcSegment({ session, r, C, svgEl, onTooltip, tappedId, onTap, animDelay }: ArcProps) {
  const [hovered, setHovered] = useState(false);

  const startDeg = timeToAngleDeg(session.start_time_local);
  const arcDeg   = durationToDeg(session.duration_minutes);
  const d        = arcPath(startDeg + ARC_GAP_DEG, startDeg + arcDeg - ARC_GAP_DEG, r, C);
  if (!d) return null;

  const color    = tagColor(session.tag);
  const isActive = isTouchDevice ? tappedId === session.id : hovered;

  /*
   * transform-origin at clock center (C,C): scale(1.06) pushes the arc
   * radially outward — the "rise" effect. The arc moves 6% away from center.
   *
   * brightness(1.5): arc brightens from within (no spreading outer glow).
   * drop-shadow: tight colored edge, gives the arc dimensional presence.
   */
  const groupStyle: React.CSSProperties = {
    transformBox:  'view-box',
    transformOrigin: `${C}px ${C}px`,
    transform:     isActive ? 'scale(1.065)' : 'scale(1)',
    filter:        isActive
      ? `brightness(1.55) saturate(1.3) drop-shadow(0 0 1.5px ${hexToRgba(color, 0.95)})`
      : 'none',
    transition: isActive
      ? 'transform 230ms cubic-bezier(0.34,1.56,0.64,1), filter 190ms ease-out'
      : 'transform 200ms ease-out, filter 160ms ease-out',
    cursor: 'pointer',
  };

  const onEnter = () => {
    if (isTouchDevice) return;
    setHovered(true);
    const pos = getTooltipPos(session, r, C, svgEl);
    if (pos) onTooltip({ session, ...pos });
  };
  const onLeave = () => {
    if (isTouchDevice) return;
    setHovered(false);
    onTooltip(null);
  };
  const onTapArc = (e: React.MouseEvent) => {
    if (!isTouchDevice) return;
    e.stopPropagation();
    const next = tappedId === session.id ? null : session.id;
    onTap(next);
    if (next) {
      const pos = getTooltipPos(session, r, C, svgEl);
      if (pos) onTooltip({ session, ...pos });
    } else {
      onTooltip(null);
    }
  };

  return (
    /* pointerEvents="all" overrides the parent SVG's pointer-events:none CSS */
    <g
      pointerEvents="all"
      style={groupStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onTapArc}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? RING_STROKE + 1.0 : RING_STROKE}
        strokeOpacity={isActive ? 1 : 0.80}
        strokeLinecap="round"
        style={{
          strokeDasharray: 1000,
          strokeDashoffset: 1000,
          animation: `ring-arc-draw 580ms cubic-bezier(0.22,0.61,0.36,1) ${animDelay}ms both`,
          transition: 'stroke-width 230ms ease, stroke-opacity 200ms ease',
        }}
      />
    </g>
  );
}

/* ---- Full layer ---- */
interface LayerProps {
  sessionsByDay: Map<string, PlannedSession[]>;
  C: number;
  svgEl: SVGSVGElement | null;
  onTooltip: (t: RingsTooltip | null) => void;
}

export function PlannedRingsLayer({ sessionsByDay, C, svgEl, onTooltip }: LayerProps) {
  const [tappedId, setTappedId] = useState<string | null>(null);
  const days = Array.from(sessionsByDay.keys()).sort().slice(0, 4);
  if (days.length === 0) return null;

  return (
    /* pointerEvents="all" — critical override:
       parent .focus-ring SVG has pointer-events:none in CSS, which
       prevents the browser from dispatching mouse events to children.
       Setting this on the layer <g> restores hover/click for rings. */
    <g
      pointerEvents="all"
      className="planned-rings-layer"
      style={{ transformBox: 'view-box', transformOrigin: `${C}px ${C}px` }}
    >
      {days.map((date, dayIdx) => {
        const r        = RING_BASE_R + dayIdx * RING_GAP;
        const sessions = sessionsByDay.get(date) ?? [];
        return (
          <g
            key={date}
            className="planned-ring-day"
            style={{ animationDelay: `${dayIdx * 65}ms` }}
          >
            {/* Ghost track — visible dotted boundary ring for each day */}
            <circle
              cx={C} cy={C} r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.55}
              strokeOpacity={0.18}
              strokeDasharray="0.6 1.4"
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
                animDelay={dayIdx * 65 + sIdx * 40 + 80}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/* ---- Tooltip ---- */
export function RingsTooltipCard({ tooltip }: { tooltip: RingsTooltip }) {
  const { session, vpX, vpY } = tooltip;
  const tag   = session.tag ? DEFAULT_TAGS.find(t => t.id === session.tag) : null;
  const color = tagColor(session.tag);
  return (
    <div
      className="rings-tooltip"
      style={{ left: vpX, top: vpY }}
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
      </div>
    </div>
  );
}
