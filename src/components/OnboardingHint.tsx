import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useOnboardingHint } from '../hooks/useOnboardingHint';
import type { FocusState } from '../hooks/useFocusTrack';
import './OnboardingHint.css';

interface Props {
  state: FocusState;
}

/**
 * Onboarding hint — handwritten whisper + a simple thin line that draws
 * itself from the text to the focus ring, with a chevron arrowhead
 * traveling at its leading edge.
 *
 * Layout: viewport-fixed. The SVG's viewBox matches the live viewport
 * pixels so path coordinates map 1:1 to screen pixels. The component
 * recomputes the path on resize.
 *
 * Animation strategy (simplified per user request — no looped flourish):
 *   · The line itself is rendered as an SVG path that draws via
 *     stroke-dashoffset (100 → 0). pathLength normalized to 100 so the
 *     dasharray math works regardless of true path length.
 *   · The chevron arrow rides along the SAME path via CSS offset-path
 *     (0% → 100%) with offset-rotate: auto so it keeps pointing in the
 *     direction of motion.
 *   · Both animations have the exact same duration and easing so the
 *     arrow head sits at the leading edge of the drawn line at every
 *     moment. Reads as "the arrow draws the line as it travels."
 *
 * Path shape: a single quadratic Bezier with a gentle upward control
 * point. Not a straight line, not a complex flourish — just one elegant
 * arc, with the arrow visibly decelerating as it approaches the ring.
 *
 * Font flash fix: the hint waits for the Caveat web font to actually
 * load (document.fonts.load) before rendering, so the user never sees
 * the larger fallback font appear and then jump to Caveat's smaller
 * metrics.
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

  const availSpace = textX - (cx + ringR);

  // Target — 18 px outside the focus ring at angle 75° (~ 2:30 position).
  // The arrow lands NEAR the clock but does NOT touch the ring or face.
  const targetAngleDeg = 75;
  const targetRad = ((targetAngleDeg - 90) * Math.PI) / 180;
  const targetGap = 18;
  const targetX = cx + (ringR + targetGap) * Math.cos(targetRad);
  const targetY = cy + (ringR + targetGap) * Math.sin(targetRad);

  // Path start — just below-left of the text, so the line emerges from
  // "next to" the text rather than precisely at its baseline.
  const sx = textX - 22;
  const sy = textY + 18;

  // Single quadratic Bézier with a gentle upward arc. Control point
  // sits ~32 px above the straight line's midpoint — produces a calm
  // arc that swoops up first, then descends toward the target. Not a
  // loop, not a wiggle, just one elegant curve.
  const midX = (sx + targetX) / 2;
  const midY = (sy + targetY) / 2 - 32;

  const d = `M ${sx} ${sy} Q ${midX} ${midY} ${targetX} ${targetY}`;

  return { d, textX, textY, availSpace };
}

/**
 * Tracks whether the Caveat web font has actually loaded into the
 * browser. We use document.fonts (the CSS Font Loading API) and call
 * `load('1em Caveat')` which returns a promise that resolves once the
 * font file is available. Until then we don't render the hint — that
 * way the user never sees the larger fallback font appear briefly.
 */
function useFontReady(family: string): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    try {
      return document.fonts?.check(`1em "${family}"`) ?? true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (ready) return;
    if (typeof document === 'undefined' || !document.fonts) {
      setReady(true);
      return;
    }
    let cancelled = false;
    document.fonts
      .load(`1em "${family}"`)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true); // bail to fallback if anything fails
      });
    return () => {
      cancelled = true;
    };
  }, [ready, family]);

  return ready;
}

export const OnboardingHint = memo(function OnboardingHint({ state }: Props) {
  const { visible, hintKind } = useOnboardingHint(state);
  const [vp, setVp] = useState<Viewport>(readViewport);
  const fontReady = useFontReady('Caveat');

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!hintKind || !fontReady) return null;
  const text = TEXTS[hintKind];
  const { d: pathD, textX, textY, availSpace } = buildPath(vp);

  // Cramped layouts — hide.
  if (availSpace < 150 || vp.w < 1024) return null;

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
        {/* The line itself — drawn stroke-by-stroke via stroke-dashoffset.
            pathLength is normalized to 100 so the dasharray math is the
            same regardless of how long the actual path is. */}
        <path
          className="hint-line"
          d={pathD}
          pathLength={100}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Arrow head — travels along the same path via offset-path.
            Same duration + same easing as the line draw, so the head
            sits exactly at the leading edge of the visible line. */}
        <g className="hint-arrow" key={hintKind} style={arrowStyle}>
          <path className="hint-head" d="M -9 -6 L 0 0 L -9 6" />
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
