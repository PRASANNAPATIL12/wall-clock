import { memo } from 'react';
import { useOnboardingHint } from '../hooks/useOnboardingHint';
import type { FocusState } from '../hooks/useFocusTrack';
import './OnboardingHint.css';

interface Props {
  state: FocusState;
}

/**
 * Caveat-font hint that whispers what the focus ring can do.
 * Three variants — one per state — shown at most once each per user, then
 * never again (see useOnboardingHint).
 *
 * Layout: the component is absolutely positioned over the analog clock
 * container (the parent .analog has position: relative). Its inner SVG
 * has viewBox 0-100 — the SAME coordinate system the focus ring uses —
 * so coordinates align: the analog center is (50, 50), the ring sits at
 * radius 46, and a ring-circumference target is at (82.5, 82.5) for the
 * 4:30 position.
 *
 * Animation: the arrow group (small filled head + 3 fading tail segments)
 * is driven by CSS `offset-path` along an SVG path. The path goes from
 * near the text (lower-right of the analog) up around an irregular loop
 * (cubic-bezier curves with intentionally non-symmetric controls so it
 * looks hand-drawn, not geometric) and lands at the ring circumference
 * at the 4:30 position. `offset-rotate: auto` keeps the arrow's tip
 * aligned with the path tangent — so the arrow is *flying* through the
 * loop, tail trailing behind it. Nothing of the path itself is rendered;
 * only the moving arrow + tail is visible.
 *
 * The path has been chosen so its final tangent direction points from
 * outside-the-ring toward the clock center — the arrow tip therefore
 * lands on the ring with its point indicating "here, click this".
 */

const TEXTS: Record<string, string> = {
  idle: 'click anywhere on the ring to start a timer',
  tracking: 'click again to set your goal end-time',
  targeted: 'click once more to clear',
};

export const OnboardingHint = memo(function OnboardingHint({ state }: Props) {
  const { visible, hintKind } = useOnboardingHint(state);

  if (!hintKind) return null;
  const text = TEXTS[hintKind];

  return (
    <div
      className={`onboarding-hint ${visible ? 'is-visible' : 'is-hidden'}`}
      aria-hidden={!visible}
    >
      <svg
        className="hint-canvas"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        aria-hidden
      >
        {/* The arrow itself — head + trailing tail segments. The whole
            group is animated along offset-path defined in CSS. */}
        <g className="hint-arrow" key={hintKind}>
          {/* Three short tail segments behind the head, fading toward the
              back. They sit on negative-X in local coords; offset-rotate
              keeps "behind the head" pointed opposite to motion. */}
          <line className="hint-tail hint-tail--1" x1="-9" y1="0" x2="-6" y2="0" />
          <line className="hint-tail hint-tail--2" x1="-6" y1="0" x2="-3.4" y2="0" />
          <line className="hint-tail hint-tail--3" x1="-3.4" y1="0" x2="-1.2" y2="0" />
          {/* Small filled arrowhead — tip at +X (direction of motion) */}
          <path className="hint-head" d="M 0 -1.1 L 2.4 0 L 0 1.1 Z" />
        </g>
      </svg>
      <span className="hint-text" key={`text-${hintKind}`}>{text}</span>
    </div>
  );
});
