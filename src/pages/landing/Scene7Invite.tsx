import { memo, useRef, useState } from 'react';
import { HeroClock } from './HeroClock';
import { AuthModal } from '../../components/AuthModal';
import { useAuth } from '../../hooks/useAuth';
import { useScrollProgress, mapRange, easeOutCubic } from '../../hooks/useScrollProgress';

/**
 * Scene 7 — "Start Now" (the invitation)
 *
 * The film's emotional climax. The clock returns — but this time it
 * RISES from below the viewport with a soft glow, like a moon. Two
 * CTAs follow: "Open the clock" (no account needed) and "Save your
 * progress" (sign in).
 *
 * Scroll choreography:
 *   0.00 - 0.40  Clock rises from below + opacity 0 → 1, glow pulses
 *   0.30 - 0.55  Primary copy fades in word-by-word
 *   0.50 - 0.80  Two CTAs slide up from below, stagger
 *   0.80 - 1.00  Hold the final frame
 *
 * Clicking "Open the clock" → navigate to /app
 * Clicking "Save your progress" → open AuthModal
 */
export const Scene7Invite = memo(function Scene7Invite() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);
  const auth = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const clockT     = easeOutCubic(mapRange(p, 0.00, 0.40, 0, 1));
  const copyT      = easeOutCubic(mapRange(p, 0.30, 0.55, 0, 1));
  const ctaPrimary = easeOutCubic(mapRange(p, 0.50, 0.70, 0, 1));
  const ctaGhost   = easeOutCubic(mapRange(p, 0.55, 0.75, 0, 1));

  const goToApp = () => {
    window.location.assign('/app');
  };

  return (
    <section
      ref={sceneRef}
      id="scene-7"
      className="scene scene--invite"
      data-scene="7"
      aria-label="Start using Focus Clock"
    >
      <div className="invite-stage">

        {/* Rising clock with glow */}
        <div
          className="invite-clock"
          style={{
            transform: `translateY(${(1 - clockT) * 80}px) scale(${0.85 + clockT * 0.15})`,
            opacity: clockT,
          }}
        >
          <div className="invite-clock__glow" />
          <HeroClock />
        </div>

        {/* Headline copy */}
        <h2
          className="invite-headline"
          style={{
            opacity: copyT,
            transform: `translateY(${(1 - copyT) * 14}px)`,
          }}
        >
          Click the ring. Begin a session.
        </h2>
        <p
          className="invite-subhead"
          style={{ opacity: copyT }}
        >
          That's all there is to it.
        </p>

        {/* Two CTAs */}
        <div className="invite-ctas">
          <button
            type="button"
            className="cta cta--primary"
            onClick={() => setAuthOpen(true)}
            style={{
              opacity: ctaPrimary,
              transform: `translateY(${(1 - ctaPrimary) * 22}px)`,
            }}
          >
            <span>Save your progress</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            className="cta cta--ghost"
            onClick={goToApp}
            style={{
              opacity: ctaGhost,
              transform: `translateY(${(1 - ctaGhost) * 22}px)`,
            }}
          >
            <span>Open the clock</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <p
          className="invite-foot"
          style={{ opacity: mapRange(p, 0.65, 0.85, 0, 1) }}
        >
          Free. No ads. No data selling. Your sessions belong to you.
        </p>
      </div>

      {/* Reuse existing AuthModal */}
      {authOpen && (
        <AuthModal auth={auth} onClose={() => setAuthOpen(false)} />
      )}
    </section>
  );
});
