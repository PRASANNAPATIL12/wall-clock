import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

/* ============================================================
   Concentric day-ring visualization — glass tube arc design.

   Each arc is rendered as three layered SVG strokes:
     1. Outer shadow halo  — wider, low opacity (depth / glow bed)
     2. Main colored arc   — the arc itself at 0.78 opacity (glass body)
     3. Inner highlight    — thin white stroke near top edge (glass sheen)

   The layering creates a premium "lit glass tube" appearance
   rather than a flat colored line.

   On hover (desktop) / tap (mobile):
     · The arc group scales radially outward from clock center (50,50)
       using CSS transform-origin — the arc literally "rises"
     · A two-layer drop-shadow in the arc's own color creates a
       luminous glow matching the glass body
     · stroke-width increases subtly for mass
   ============================================================ */

/* ---- Layout ---- */
export const RING_BASE_R = 49.5;  // innermost ring (SVG units, just outside RING_R=46)
export const RING_GAP    = 4.2;   // spacing between day rings
const RING_STROKE        = 2.8;   // main arc stroke-width
const ARC_GAP_DEG        = 1.8;   // degrees trimmed each side (breathing room)
const MIN_ARC_DEG        = 11;
const MAX_ARC_DEG        = 62;

/* ---- Premium color palette ----
   Chosen to pop on both warm-beige and near-black, at ~0.75 opacity.
   Hues avoid the existing red (#c8312b) and gold (#b8893a) accents. */
const TAG_COLORS: Record<string, string> = {
  code:     '#818cf8',  // indigo   — calm, focused
  write:    '#34d399',  // emerald  — fresh, creative
  study:    '#60a5fa',  // sky blue — clear, open
  design:   '#c084fc',  // violet   — creative, expressive
  rest:     '#2dd4bf',  // teal     — restorative
  meet:     '#f472b6',  // rose     — social, warm
  exercise: '#fb923c',  // amber    — energetic
  read:     '#4ade80',  // green    — growth
  plan:     '#fbbf24',  // yellow   — thinking
  research: '#38bdf8',  // sky      — curious
  music:    '#e879f9',  // fuchsia  — expressive
  break:    '#a3e635',  // lime     — refresh
  personal: '#f87171',  // coral    — self-care
  other:    '#94a3b8',  // slate    — neutral
};

export function tagColor(id: string | null): string {
  return TAG_COLORS[id ?? 'other'] ?? TAG_COLORS.other!;
}

/* ---- Hex color → rgba for glow ---- */
function hexFade(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ---- Geometry ---- */
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

function durationToDeg(minutes: number): number {
  return Math.max(MIN_ARC_DEG, Math.min(MAX_ARC_DEG, minutes / 4));
}

/* ---- Tooltip state ---- */
export interface RingsTooltip {
  session: PlannedSession;
  vpX: number;
  vpY: number;
}

function arcMidpointViewport(
  session: PlannedSession,
  r: number,
  C: number,
  svgEl: SVGSVGElement | null,
): { vpX: number; vpY: number } | null {
  if (!svgEl) return null;
  const startDeg = timeToAngleDeg(session.start_time_local);
  const arcDeg   = durationToDeg(session.duration_minutes);
  const midDeg   = startDeg + arcDeg / 2;
  const rad      = ((midDeg - 90) * Math.PI) / 180;
  const rect     = svgEl.getBoundingClientRect();
  const scale    = rect.width / 100;
  return {
    vpX: rect.left + (C + Math.cos(rad) * r) * scale,
    vpY: rect.top  + (C + Math.sin(rad) * r) * scale,
  };
}

const isTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

/* ============================================================
   Single premium arc group — glass tube with hover/tap effects
   ============================================================ */
interface ArcGroupProps {
  session: PlannedSession;
  r: number;           // ring radius
  C: number;           // clock center SVG unit
  svgEl: SVGSVGElement | null;
  onTooltip: (t: RingsTooltip | null) => void;
  /** ID of currently tapped arc on mobile */
  tappedId: string | null;
  onTap: (id: string | null) => void;
  animDelay: number;
}

function PremiumArc({ session, r, C, svgEl, onTooltip, tappedId, onTap, animDelay }: ArcGroupProps) {
  const [hovered, setHovered] = useState(false);

  const startDeg = timeToAngleDeg(session.start_time_local);
  const arcDeg   = durationToDeg(session.duration_minutes);
  const from     = startDeg + ARC_GAP_DEG;
  const to       = startDeg + arcDeg - ARC_GAP_DEG;
  const color    = tagColor(session.tag);

  // Paths for three-layer glass tube
  const mainPath  = arcPath(from,     to,    r,       C); // main body
  const haloPath  = arcPath(from,     to,    r + 0.3, C); // outer shadow halo
  const shineFrom = from + 2;
  const shineTo   = Math.min(to - 2, shineFrom + (arcDeg - 4) * 0.55);
  const shinePath = arcPath(shineFrom, shineTo, r - 0.9, C); // inner glass highlight

  if (!mainPath) return null;

  const isActive = isTouch ? tappedId === session.id : hovered;

  // Premium hover style:
  //  - scale(1.055) with transform-origin at clock center (50px,50px)
  //    pushes the arc radially outward — the "rise" effect
  //  - Two-pass drop-shadow in the arc's own color: tight glow + wide bloom
  const groupStyle: React.CSSProperties = {
    transformBox: 'view-box',
    transformOrigin: `${C}px ${C}px`,
    transform: isActive ? 'scale(1.055)' : 'scale(1)',
    transition: isActive
      ? 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 200ms ease-out'
      : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), filter 160ms ease-out',
    filter: isActive
      ? `drop-shadow(0 0 2px ${hexFade(color, 0.9)}) drop-shadow(0 0 6px ${hexFade(color, 0.45)})`
      : undefined,
    cursor: 'pointer',
  };

  const handleMouseEnter = () => {
    if (isTouch) return;
    setHovered(true);
    const pos = arcMidpointViewport(session, r, C, svgEl);
    if (pos) onTooltip({ session, ...pos });
  };
  const handleMouseLeave = () => {
    if (isTouch) return;
    setHovered(false);
    onTooltip(null);
  };
  const handleClick = (e: React.MouseEvent) => {
    if (!isTouch) return;
    e.stopPropagation();
    if (tappedId === session.id) {
      onTap(null);
      onTooltip(null);
    } else {
      onTap(session.id);
      const pos = arcMidpointViewport(session, r, C, svgEl);
      if (pos) onTooltip({ session, ...pos });
    }
  };

  return (
    <g
      style={groupStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      aria-label={`${session.tag ?? 'Focus'} at ${fmtTime(session.start_time_local)}`}
    >
      {/* Layer 1 — outer shadow halo: gives depth below the arc */}
      <path
        d={haloPath}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE + 2.8}
        strokeOpacity={isActive ? 0.20 : 0.12}
        strokeLinecap="round"
        style={{ transition: 'stroke-opacity 200ms ease' }}
      />

      {/* Layer 2 — main glass body arc (draw-in animation via dashoffset) */}
      <path
        d={mainPath}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? RING_STROKE + 1.4 : RING_STROKE}
        strokeOpacity={isActive ? 0.92 : 0.78}
        strokeLinecap="round"
        className="ring-arc-main"
        style={{
          strokeDasharray: 1000,
          strokeDashoffset: 1000,
          animation: `ring-arc-draw 560ms cubic-bezier(0.22,0.61,0.36,1) ${animDelay}ms both`,
          transition: 'stroke-width 200ms ease, stroke-opacity 200ms ease',
        }}
      />

      {/* Layer 3 — inner glass highlight: simulates light catching curved surface */}
      {shinePath && (
        <path
          d={shinePath}
          fill="none"
          stroke="white"
          strokeWidth={0.75}
          strokeOpacity={isActive ? 0.32 : 0.18}
          strokeLinecap="round"
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
            animation: `ring-arc-draw 560ms cubic-bezier(0.22,0.61,0.36,1) ${animDelay + 40}ms both`,
            transition: 'stroke-opacity 200ms ease',
          }}
        />
      )}
    </g>
  );
}

/* ============================================================
   PlannedRingsLayer — the full SVG layer (rendered inside FocusRing)
   ============================================================ */
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
    /* transform-origin at clock center so layer entrance scales from center */
    <g
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
            {/* Ghost track — very subtle dotted circle anchoring the ring in space */}
            <circle
              cx={C} cy={C} r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE * 0.28}
              strokeOpacity={0.08}
              strokeDasharray="0.4 1.4"
            />

            {/* Premium glass arc for each session */}
            {sessions.map((s, sIdx) => (
              <PremiumArc
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

/* ============================================================
   RingsTooltipCard — elevated glass panel
   ============================================================ */
interface TooltipProps { tooltip: RingsTooltip }

export function RingsTooltipCard({ tooltip }: TooltipProps) {
  const { session, vpX, vpY } = tooltip;
  const tag   = session.tag ? DEFAULT_TAGS.find(t => t.id === session.tag) : null;
  const color = tagColor(session.tag);

  return (
    <div
      className="rings-tooltip"
      style={{ left: vpX, top: vpY, '--arc-color': color } as React.CSSProperties}
      aria-hidden
    >
      {/* Color accent bar on the left edge */}
      <div className="rings-tooltip__accent" style={{ background: color }} />

      <div className="rings-tooltip__body">
        <div className="rings-tooltip__row">
          {tag && (
            <span className="rings-tooltip__icon" style={{ color }}>
              <TagIcon def={tag} size={12} />
            </span>
          )}
          <span className="rings-tooltip__label">
            {tag?.label ?? session.tag ?? 'Focus'}
          </span>
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
