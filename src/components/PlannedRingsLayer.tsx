import { useState } from 'react';
import type { PlannedSession } from '../lib/planStore';
import { fmtDuration, fmtTime } from '../lib/planStore';
import { DEFAULT_TAGS } from '../lib/tags';
import { TagIcon } from './TagIcon';

/* ============================================================
   Concentric day-ring visualization.

   WHY rings start at RING_BASE_R = 56 (not 49.5):
   The focus ring's hit band is centered at RING_R = 46 with
   HIT_STROKE = 10, covering radius 41–51. Any planned-ring arc
   inside radius 51 would have its pointer events stolen by the
   transparent hit circle used for click-1 / click-2 / click-3.
   Starting at 56 gives a 5-unit safety gap beyond the hit band.

   WHY hit target is separate from the visual arc:
   CSS scale(N) from clock center moves the arc radially outward.
   If the arc moves even 1px outside the cursor position,
   onMouseLeave fires → scale removed → arc moves back under cursor
   → onMouseEnter → infinite vibration.
   Solution: render a static transparent hit path that NEVER
   transforms. The cursor is always over the hit path. A sibling
   group with the colored arc transforms freely without
   affecting event detection.

   WHY inline style pointerEvents:'all' is needed:
   The parent .focus-ring SVG has CSS `pointer-events: none`.
   This is inherited by all SVG children. The SVG pointerEvents
   attribute alone does not override inherited CSS. Inline
   `style={{ pointerEvents: 'all' }}` has CSS specificity > inherited,
   so it correctly overrides the inherited `none`.
   ============================================================ */

/* RING_R=46, HIT_STROKE=10 → hit band covers r=41–51.
   Start planned rings at 56 (5 SVG units beyond the band). */
export const RING_BASE_R = 56;
export const RING_GAP    = 5;   // adjacent ring centers 5 SVG units apart
const RING_STROKE        = 1.8; // visible arc width
const HIT_STROKE_W       = 5;   // invisible hit area width (2.5px each side)
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

function timeToAngleDeg(s: string): number {
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

  const onEnter = () => {
    if (isTouchDevice) return;
    setHovered(true);
    const pos = computeTooltipPos(session, r, C, svgEl);
    if (pos) onTooltip({ session, ...pos });
  };
  const onLeave = () => {
    if (isTouchDevice) return;
    setHovered(false);
    onTooltip(null);
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

  return (
    /*
     * This outer <g> groups the two layers:
     *   1. Hit path   — static, transparent, never transforms
     *   2. Visual group — transforms on hover (scale from clock center)
     *
     * inline style pointerEvents:'all' overrides inherited
     * CSS pointer-events:none from .focus-ring parent SVG.
     */
    <g style={{ pointerEvents: 'all' }}>

      {/* ── Layer 1: Static hit target ──────────────────────────────────
          Wide transparent stroke stays at the original radius.
          Since it NEVER transforms, the cursor never leaves it,
          preventing the hover ↔ scale vibration loop entirely. */}
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

      {/* ── Layer 2: Visual arc — scales freely with no event risk ─────
          pointer-events:none so it never interferes with the hit path.
          scale(1.04) from clock center pushes arc ~2.2 SVG units outward,
          giving a visible "rise" without going near the hit target edges. */}
      <g
        style={{
          transformBox:    'view-box',
          transformOrigin: `${C}px ${C}px`,
          transform:       isActive ? 'scale(1.04)' : 'scale(1)',
          filter:          isActive
            ? `brightness(1.55) saturate(1.3) drop-shadow(0 0 1.5px ${hexToRgba(color, 0.95)})`
            : 'none',
          transition:      isActive
            ? 'transform 220ms ease-out, filter 180ms ease-out'
            : 'transform 190ms ease-out, filter 150ms ease-out',
          pointerEvents:   'none',
        }}
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={isActive ? RING_STROKE + 0.9 : RING_STROKE}
          strokeOpacity={isActive ? 1 : 0.80}
          strokeLinecap="round"
          style={{
            strokeDasharray:  1000,
            strokeDashoffset: 1000,
            animation: `ring-arc-draw 580ms cubic-bezier(0.22,0.61,0.36,1) ${animDelay}ms both`,
            transition: 'stroke-width 220ms ease-out, stroke-opacity 200ms ease-out',
            pointerEvents: 'none',
          }}
        />
      </g>
    </g>
  );
}

/* ---- Layer (rendered inside FocusRing SVG) ---- */
interface LayerProps {
  sessionsByDay: Map<string, PlannedSession[]>;
  C: number;
  svgEl: SVGSVGElement | null;
  onTooltip: (t: RingsTooltip | null) => void;
}

export function PlannedRingsLayer({ sessionsByDay, C, svgEl, onTooltip }: LayerProps) {
  const [tappedId, setTappedId] = useState<string | null>(null);
  // Show ALL planned days — only dates that have sessions appear in the Map.
  // If the user planned days 4, 5, 7, 9 (skipping 6 and 8), only those
  // 4 days are in the Map so exactly 4 rings render. No artificial cap.
  // Sorted chronologically so the nearest day is the innermost ring.
  const days = Array.from(sessionsByDay.keys()).sort();
  if (days.length === 0) return null;

  return (
    <g
      className="planned-rings-layer"
      style={{
        transformBox:    'view-box',
        transformOrigin: `${C}px ${C}px`,
        pointerEvents:   'all',  /* override inherited CSS pointer-events:none */
      }}
    >
      {days.map((date, dayIdx) => {
        const r        = RING_BASE_R + dayIdx * RING_GAP;
        const sessions = sessionsByDay.get(date) ?? [];
        return (
          <g
            key={date}
            className="planned-ring-day"
            style={{ animationDelay: `${dayIdx * 65}ms`, pointerEvents: 'all' }}
          >
            {/* Ghost track — dotted circle marking the day ring boundary */}
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
                animDelay={dayIdx * 65 + sIdx * 40 + 80}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/* ---- Tooltip card ---- */
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
