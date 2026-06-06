/**
 * LandingPage — Cinematic scrollytelling homepage.
 *
 * Served at `/` for new visitors. The existing live clock app is
 * served at `/app`. See CINEMATIC_LANDING_PLAN.md for the full vision.
 *
 * This file is the SHELL — empty scene containers wired up for scroll.
 * Each scene will be filled in incrementally (Steps 4–14).
 */

import { useEffect } from 'react';
import { Scene1Hero } from './landing/Scene1Hero';
import { Scene2Zoom } from './landing/Scene2Zoom';
import { Scene3ThreeClicks } from './landing/Scene3ThreeClicks';
import { Scene4Features } from './landing/Scene4Features';
import { Scene5ComingSoon } from './landing/Scene5ComingSoon';
import { Scene6Trust } from './landing/Scene6Trust';
import './LandingPage.css';

/* ------------------------------------------------------------------ */
/* Returning users — auto-redirect to /app                            */
/* ------------------------------------------------------------------ */
/**
 * If a previous session exists in localStorage (Supabase auth token),
 * the user has been here before — send them straight to the app.
 *
 * First-time visitors with no session see the cinematic experience.
 */
function useReturningUserRedirect() {
  useEffect(() => {
    try {
      const hasSession = Object.keys(localStorage).some(
        (k) => k.startsWith('sb-') && k.includes('-auth-token'),
      );
      if (hasSession) {
        // Returning user — straight to app
        window.location.replace('/app');
      }
    } catch {
      /* localStorage blocked — show landing anyway */
    }
  }, []);
}

export default function LandingPage() {
  useReturningUserRedirect();

  return (
    <div className="landing">
      {/* SCENE 1 — Hero (live clock) */}
      <Scene1Hero />

      {/* SCENE 2 — Zoom & inciting sentence */}
      <Scene2Zoom />

      {/* SCENE 3 — Three clicks demo */}
      <Scene3ThreeClicks />

      {/* SCENE 4 — Horizontal feature gallery */}
      <Scene4Features />

      {/* SCENE 5 — Coming Soon */}
      <Scene5ComingSoon />

      {/* SCENE 6 — Social proof */}
      <Scene6Trust />

      {/* SCENE 7 — Invitation */}
      <section className="scene scene--invite" data-scene="7" aria-label="Start now">
        <div className="scene-placeholder">
          <p>Scene 7 — invitation + CTAs (Step 12)</p>
        </div>
      </section>

      {/* SCENE 7.5 — FAQ (for SEO) */}
      <section className="scene scene--faq" data-scene="7.5" aria-label="Frequently asked questions">
        <div className="scene-placeholder">
          <p>Scene 7.5 — FAQ (Step 13)</p>
        </div>
      </section>

      {/* SCENE 8 — Footer / Credits */}
      <footer className="scene scene--footer" data-scene="8" aria-label="Footer">
        <div className="scene-placeholder">
          <p>Scene 8 — Footer (Step 14)</p>
        </div>
      </footer>
    </div>
  );
}
