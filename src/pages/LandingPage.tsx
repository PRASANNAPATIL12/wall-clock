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
      {/* SCENE 1 — Hero (live clock) — placeholder */}
      <section className="scene scene--hero" data-scene="1" aria-label="Hero — live focus clock">
        <div className="scene-placeholder">
          <h1>Focus Clock</h1>
          <p>Scene 1 — hero with live clock (Step 4)</p>
        </div>
      </section>

      {/* SCENE 2 — Zoom & inciting sentence */}
      <section className="scene scene--zoom" data-scene="2" aria-label="Your time is finite">
        <div className="scene-placeholder">
          <p>Scene 2 — zoom + headline (Steps 5–6)</p>
        </div>
      </section>

      {/* SCENE 3 — Three clicks demo */}
      <section className="scene scene--three-clicks" data-scene="3" aria-label="Set a goal in three clicks">
        <div className="scene-placeholder">
          <p>Scene 3 — three-clicks layout (Step 7)</p>
        </div>
      </section>

      {/* SCENE 4 — Horizontal feature gallery */}
      <section className="scene scene--features" data-scene="4" aria-label="Features">
        <div className="scene-placeholder">
          <p>Scene 4 — horizontal feature scroll (Steps 8–9)</p>
        </div>
      </section>

      {/* SCENE 5 — Coming Soon */}
      <section className="scene scene--roadmap" data-scene="5" aria-label="Coming soon">
        <div className="scene-placeholder">
          <p>Scene 5 — Coming Soon (Step 10)</p>
        </div>
      </section>

      {/* SCENE 6 — Social proof */}
      <section className="scene scene--trust" data-scene="6" aria-label="Trusted by humans who focus">
        <div className="scene-placeholder">
          <p>Scene 6 — social proof + counter (Step 11)</p>
        </div>
      </section>

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
