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
import { Scene7Invite } from './landing/Scene7Invite';
import { Scene75FAQ } from './landing/Scene75FAQ';
import { Scene8Footer } from './landing/Scene8Footer';
import './LandingPage.css';

/* ------------------------------------------------------------------ */
/* Returning users — auto-redirect to /app                            */
/* ------------------------------------------------------------------ */
/**
 * If a previous session exists in localStorage (Supabase auth token)
 * OR the URL contains an OAuth callback hash, the user has been here
 * before / is mid-auth-flow — send them straight to the app.
 *
 * First-time anonymous visitors with no session see the cinematic experience.
 */
function useReturningUserRedirect() {
  useEffect(() => {
    try {
      // Case 1: Supabase OAuth callback — URL has `#access_token=…`
      // After Google sign-in, Supabase redirects back with an auth hash.
      // The auth handler lives in /app's React tree, not here.
      if (window.location.hash.includes('access_token')) {
        window.location.replace('/app' + window.location.hash);
        return;
      }

      // Case 2: Returning user — Supabase token already in localStorage
      const hasSession = Object.keys(localStorage).some(
        (k) => k.startsWith('sb-') && k.includes('-auth-token'),
      );
      if (hasSession) {
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
      <Scene7Invite />

      {/* SCENE 7.5 — FAQ (for SEO) */}
      <Scene75FAQ />

      {/* SCENE 8 — Footer / Credits */}
      <Scene8Footer />
    </div>
  );
}
