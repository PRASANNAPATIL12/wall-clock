import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useOnboardingHint } from '../hooks/useOnboardingHint';
import type { FocusState } from '../hooks/useFocusTrack';
import './OnboardingHint.css';

interface Props {
  state: FocusState;
}

/**
 * Onboarding hint — handwritten whisper + flying arrow with a hand-drawn
 * loop near the text and a graceful sweep down to the focus ring.
 *
 * Layout: the hint is *viewport-fixed*, not constrained to the analog
 * container. Its SVG has a viewBox matching the live viewport pixels,
 * so path coordinates align 1:1 with screen pixels and the path can
 * extend from text-area (right side of the viewport) to the ring (at
 * the center). On resize the path is recomputed.
 *
 * Path strategy (all coords in viewport pixels):
 *   · Start just below-left of the text.
 *   · Short curve into a small "signature curl" loop drawn with two
 *     cubic Béziers (asymmetric control points so it looks hand-drawn,
 *     not a geometric circle).
 *   · Single quadratic Bézier sweeping down-left to the target —
 *     the graceful single-arc shape per Image 2.
 *   · Target sits 16 px OUTSIDE the focus ring (at angle 75° ≈ 2:30),
 *     so the arrow lands NEAR the clock but does not touch it.
 *
 * Every control point and every interpolated curve point is at
 * distance > ringRadius from the clock center, by construction —
 * the arrow physically cannot cross the clock face.
 */

const TEXTS: Record<string, string> = {
  idle: 'click anywhere on the ring to start a timer',
  tracking: 'click again to set your goal end-time',
  targeted: 'click once more to clear',
};

interface Viewport {
  w: number;
  h: number;
}

function readViewport(): Viewport {
  if (typeof window === 'undefined') return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}

function buildPath(vp: Viewport) {
  const cx = vp.w / 2;
  const cy = vp.h / 2;
  const clockSize = Math.min(vp.w * 0.7, vp.h * 0.7, 620);
  const ringR = clockSize * 0.46;

  // Text position — comfortably right of the clock, slightly above center.
  const desiredOffset = 200;
  const minRightMargin = 60;
  const textX = Math.min(cx + ringR + desiredOffset, vp.w - minRightMargin);
  const textY = Math.max(cy - 90, 80);

  // Available horizontal space between clock edge and text — used to detect
  // 'too cramped' viewports below.
  const availSpace = textX - (cx + ringR);

  // Target — slightly outside the ring at ~2:30. 16 px gap so the arrow
  // tip lands near the clock but does not touch the ring or the face.
  const targetAngleDeg = 75;
  const targetRad = ((targetAngleDeg - 90) * Math.PI) / 180;
  const targetGap = 16;
  const targetX = cx + (ringR + targetGap) * Math.cos(targetRad);
  const targetY = cy + (ringR + targetGap) * Math.sin(targetRad);

  // Path waypoints, all positioned in the exterior region just left of the
  // text. The loop is ~45 × 56 px, deliberately taller than wide for an
  // 'old shape' feel.
  const sx = textX - 18;
  const sy = textY + 14;

  const entryX = textX - 32;
  const entryY = textY + 6;

  const bottomEndX = textX - 65;
  const bottomEndY = textY + 8;

  const exitX = textX - 35;
  const exitY = textY + 6;

  // Final Q's control: lifted above the straight line from exit→target so
  // the curve arcs UP first, then descends. Matches the graceful single-arc
  // shape the user drew in Image 2.
  const mx = (exitX + targetX) / 2 - 40;
  const my = (exitY + targetY) / 2 - 30;

  const d =
    `M ${sx} ${sy} ` +
    // short approach curve from start into the loop's entry
    `C ${sx - 8} ${sy + 4} ${entryX + 4} ${entryY + 4} ${entryX} ${entryY} ` +
    // loop's bottom half: right → bottom → left  (clockwise)
    `C ${entryX + 6} ${entryY + 28} ${bottomEndX - 5} ${bottomEndY + 28} ${bottomEndX} ${bottomEndY} ` +
    // loop's top half: left → top → back near entry  (clockwise)
    `C ${bottomEndX + 4} ${bottomEndY - 28} ${exitX + 6} ${exitY - 24} ${exitX} ${exitY} ` +
    // graceful single-arc sweep to the target
    `Q ${mx} ${my} ${targetX} ${targetY}`;

  return { d, textX, textY, availSpace };
}

export const OnboardingHint = memo(function OnboardingHint({ state }: Props) {
  const { visible, hintKind } = useOnboardingHint(state);
  const [vp, setVp] = useState<Viewport>(readViewport);

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!hintKind) return null;
  const text = TEXTS[hintKind];
  const { d: pathD, textX, textY, availSpace } = buildPath(vp);

  // Cramped layouts — hide.
  if (availSpace < 150 || vp.w < 1024) return null;

  // Both standard and webkit-prefixed offset properties, set inline so
  // path coordinates can change with viewport size.
  const arrowStyle = {
    offsetPath: `path('${pathD}')`,
    WebkitOffsetPath: `path('${pathD}')`,
    offsetRotate: 'auto',
    WebkitOffsetRotate: 'auto',
  } as CSSProperties;

  return (
    <div
      className={`onboarding-hint ${visible ? 'is-visible' : 'is-hidden'}`}
      aria-hidden={!visible}
    >
      <svg
        className="hint-canvas"
        viewBox={`0 0 ${vp.w} ${vp.h}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        aria-hidden
      >
        <g className="hint-arrow" key={hintKind} style={arrowStyle}>
          {/* Tail — three fading segments behind the head, in negative-X
              local coords so they trail along whichever direction the
              head is moving. */}
          <line className="hint-tail hint-tail--1" x1="-55" y1="0" x2="-38" y2="0" />
          <line className="hint-tail hint-tail--2" x1="-38" y1="0" x2="-22" y2="0" />
          <line className="hint-tail hint-tail--3" x1="-22" y1="0" x2="-10" y2="0" />
          {/* Chevron arrowhead — two open lines forming '>', no fill. */}
          <path className="hint-head" d="M -10 -7 L 0 0 L -10 7" />
        </g>
      </svg>
      <span
        className="hint-text"
        key={`text-${hintKind}`}
        style={{ left: `${textX}px`, top: `${textY}px` }}
      >
        {text}
      </span>
    </div>
  );
});
