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
 * never again. See `useOnboardingHint` for the lifecycle logic.
 *
 * Layout: positioned bottom-right of the viewport. A curved SVG arrow
 * extends from beside the text up-and-to-the-left toward the focus ring;
 * the arrow has a small clockwise loop mid-journey for the hand-drawn
 * flourish you'd see on a friend's note.
 */

const TEXTS: Record<string, string> = {
  idle: 'click anywhere on the ring to start a timer',
  tracking: 'click again to set your goal end-time',
  targeted: 'click once more to clear',
};

export const OnboardingHint = memo(function OnboardingHint({ state }: Props) {
  const { visible, hintKind } = useOnboardingHint(state);

  // We always render the container so we can fade it in/out via CSS.
  // The text body only renders once we know which hint to show.
  const text = hintKind ? TEXTS[hintKind] : '';

  return (
    <div
      className={`onboarding-hint ${visible ? 'is-visible' : 'is-hidden'}`}
      aria-hidden={!visible}
    >
      <svg
        className="hint-arrow"
        viewBox="0 0 260 110"
        overflow="visible"
        aria-hidden
      >
        <defs>
          <marker
            id="hint-arrowhead"
            markerWidth="9"
            markerHeight="9"
            refX="7.5"
            refY="4.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 9 4.5 L 0 9 Z" fill="currentColor" />
          </marker>
        </defs>
        {/*
          Path anatomy (each step continues from the previous end-point):
            M 230 88                        – start near the text-end
            Q 195 78 155 65                 – gentle curve up-left
            A 8 8 0 0 1 155 49              – top half of a small clockwise loop
            A 8 8 0 0 1 155 65              – bottom half — completes the circle
            Q 90 50 18 10                   – continue up-left to the arrow tip
        */}
        <path
          className="hint-arrow__path"
          d="M 230 88 Q 195 78 155 65 A 8 8 0 0 1 155 49 A 8 8 0 0 1 155 65 Q 90 50 18 10"
          pathLength={100}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#hint-arrowhead)"
        />
      </svg>
      <span className="hint-text">{text}</span>
    </div>
  );
});
