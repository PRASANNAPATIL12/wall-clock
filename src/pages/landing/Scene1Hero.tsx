import { memo } from 'react';
import { ThemeToggle } from '../../components/controls/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';
import { HeroClock } from './HeroClock';

/**
 * Scene 1 — "The Clock Is Alive"
 *
 * The opening frame of the film. The user lands here and sees the
 * same calm, breathing clock that lives at /app — but quieter (no
 * controls except theme toggle, no focus-ring interaction).
 *
 * A subtle scroll-hint chevron at the bottom invites them to descend
 * into the rest of the story.
 *
 * Visual hierarchy:
 *   · Center: the live clock (matches user's last-chosen mode)
 *   · Below clock: a single line of typewriter-style copy
 *   · Bottom: animated downward chevron
 *   · Top-left: theme toggle (the only control visible)
 */
export const Scene1Hero = memo(function Scene1Hero() {
  const [theme, , toggleTheme] = useTheme();

  return (
    <section className="scene scene--hero" data-scene="1" aria-label="Welcome">
      {/* Theme toggle — top-left. The only control on the landing page. */}
      <div className="hero-controls" aria-hidden={false}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Main composition — clock + tagline */}
      <div className="hero-stage">
        <HeroClock />

        <p className="hero-tagline">
          <span>Not here for your attention.</span>
          <span>Here for your <em>focus</em>.</span>
        </p>
      </div>

      {/* Scroll hint — animated downward chevron, appears after a beat */}
      <a
        className="scroll-hint"
        href="#scene-2"
        aria-label="Scroll to learn more"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
             stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
             strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </a>
    </section>
  );
});
