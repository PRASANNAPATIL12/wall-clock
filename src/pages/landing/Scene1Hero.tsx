/**
 * Scene 1 — "The Clock Is Alive"
 *
 * Visual target: this MUST look identical to the existing live app
 * (the reference image the user shared). Same controls, same clock,
 * same hero typewriter message, same layout.
 *
 * What differs from /app:
 *   · The focus ring is non-interactive (pointer-events: none) — clicking
 *     does nothing here; the user goes to /app to actually track.
 *   · The HeroMessage typewriter is always shown (not just first visit).
 *   · A "scroll" hint chevron at the bottom invites descent.
 *
 * As the user scrolls past Scene 1, all controls + clock scroll away
 * naturally (no fixed positioning) — the cinematic story takes over
 * from Scene 2 onward.
 */
import { memo, useEffect, useState, lazy, Suspense } from 'react';
import { ThemeToggle } from '../../components/controls/ThemeToggle';
import { FullscreenToggle } from '../../components/controls/FullscreenToggle';
import { TimezoneSelector } from '../../components/controls/TimezoneSelector';
import { ModeToggle, type Mode } from '../../components/controls/ModeToggle';
import { FormatToggle, type Format } from '../../components/controls/FormatToggle';
import { CoffeeLink } from '../../components/controls/CoffeeLink';
import { JoinPill } from '../../components/JoinPill';
import { HeroMessage } from '../../components/HeroMessage';
import { useTheme } from '../../hooks/useTheme';
import { useFullscreen } from '../../hooks/useFullscreen';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useAuth } from '../../hooks/useAuth';
import { HeroClock } from './HeroClock';

// AuthModal is heavy (auth providers, validation) — lazy-load it
const AuthModal = lazy(() =>
  import('../../components/AuthModal').then((m) => ({ default: m.AuthModal })),
);

export const Scene1Hero = memo(function Scene1Hero() {
  const [theme, , toggleTheme] = useTheme();
  const [isFs, toggleFs]       = useFullscreen();
  const [mode, setMode]        = usePersistedState<Mode>('wall.mode', 'analog');
  const [tz, setTz]            = usePersistedState<string>('wall.tz', 'local');
  const [format, setFormat]    = usePersistedState<Format>('wall.format', '24');

  const auth = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [hintBoostMs, setHintBoostMs] = useState(0);
  void hintBoostMs;  // HeroMessage requires the setter; value isn't used in Scene 1

  /**
   * Sync the document title to the live clock just like /app does.
   * Only the FIRST mount of Scene 1 owns the title — once the user
   * scrolls past this scene, we leave it where it is.
   */
  useEffect(() => {
    document.title = 'Focus Clock — Focus Timer & Productivity Tracker';
  }, []);

  return (
    <section
      className="scene scene--hero"
      data-scene="1"
      aria-label="Welcome to Focus Clock"
    >
      {/* SEO H1 — visually hidden, exists for crawlers + screen readers */}
      <h1 className="visually-hidden">
        Focus Clock — a calm browser-based focus timer and productivity tracker
      </h1>

      {/* ── Hero typewriter — always shown on landing (anonymous-style) ── */}
      {!auth.loading && !auth.user && (
        <HeroMessage onStart={setHintBoostMs} />
      )}

      {/* ── Center: the live clock ── */}
      <div className="hero-stage">
        <HeroClock />
      </div>

      {/* ── Controls — match existing app layout 1:1 ─────────────────── */}

      {/* Top-left: theme */}
      <div className="hero-controls hero-controls--tl">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Top-center-ish: Join pill (anonymous) or account icon (signed in).
          For the landing, we always show the JoinPill — signed-in users
          get redirected to /app by useOAuthCallbackRedirect in production. */}
      {!auth.loading && !auth.user && (
        <JoinPill onClick={() => setAuthOpen(true)} />
      )}

      {/* Top-right: fullscreen */}
      <div className="hero-controls hero-controls--tr">
        <FullscreenToggle isFullscreen={isFs} onToggle={toggleFs} />
      </div>

      {/* Bottom-left: timezone + mode + (format for digital) */}
      <div className="hero-controls hero-controls--bl">
        <TimezoneSelector value={tz} onChange={setTz} />
        <ModeToggle mode={mode} onChange={setMode} />
        {mode === 'digital' && (
          <FormatToggle format={format} onChange={setFormat} />
        )}
      </div>

      {/* Bottom-right: coffee link */}
      <div className="hero-controls hero-controls--br">
        <CoffeeLink />
      </div>

      {/* ── Scroll hint chevron — bottom center, pulses gently ── */}
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

      {/* AuthModal — opens from JoinPill */}
      {authOpen && (
        <Suspense fallback={null}>
          <AuthModal auth={auth} onClose={() => setAuthOpen(false)} />
        </Suspense>
      )}
    </section>
  );
});
