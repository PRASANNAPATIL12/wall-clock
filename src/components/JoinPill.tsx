import { createPortal } from 'react-dom';
import './JoinPill.css';

interface Props {
  onClick: () => void;
}

/**
 * Inline SVG that registers the displacement-map filter used by the pill's
 * ::after pseudo-element. Renders once into document.body. Stays invisible
 * (width 0, height 0) — only the <filter> definition matters.
 *
 * Technique mirrors the reference Liquid-Glass implementation:
 *  · feTurbulence  — generates smooth fractal noise (the "ripple map")
 *  · feGaussianBlur — softens the noise so the distortion looks like glass,
 *                     not pixelated static
 *  · feDisplacementMap — bends pixels of whatever sits behind the pill,
 *                       using the noise as a displacement field
 */
function GlassFilterDefs() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        <filter id="joinpill-glass" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves={2}
            seed={92}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="0.02" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale={10}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Sticky top-left CTA shown to anonymous visitors.
 *
 * Visual:
 *   · ::before — rim lighting (inset box-shadow) + faint white tint
 *   · ::after  — applies the SVG glass filter, displacing whatever is behind
 *   · content  — text + arrow, sitting on top
 *
 * Portaled to document.body so it escapes `.hero-sticky { isolation: isolate }`
 * and stays visible at every scroll position.
 */
export function JoinPill({ onClick }: Props) {
  return createPortal(
    <>
      <GlassFilterDefs />
      <button
        className="join-pill"
        type="button"
        onClick={onClick}
        aria-label="Sign up to track your focus progress"
      >
        <span className="join-pill__content">
          <span className="join-pill__text">
            <span className="join-pill__primary">Track your progress</span>
            <span className="join-pill__sub">Join the focus community</span>
          </span>
          <span className="join-pill__arrow" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none"
                 stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </span>
      </button>
    </>,
    document.body
  );
}
