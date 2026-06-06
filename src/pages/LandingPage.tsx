/**
 * LandingPage — Cinematic scrollytelling homepage.
 *
 * Served at `/` for first-time visitors. The existing live clock app is
 * served at `/app`. See CINEMATIC_LANDING_PLAN.md for the full vision.
 */

import { useEffect } from 'react';
import { Scene1Hero } from './landing/Scene1Hero';
// Scene 2 (zoom) is now merged into Scene 1 — same sticky stage, one
// continuous flow from the live app to the zoom-into-dial cinematic.
import { Scene3ThreeClicks } from './landing/Scene3ThreeClicks';
import { Scene4Features } from './landing/Scene4Features';
import { Scene5ComingSoon } from './landing/Scene5ComingSoon';
import { Scene6Trust } from './landing/Scene6Trust';
import { Scene7Invite } from './landing/Scene7Invite';
import { Scene75FAQ } from './landing/Scene75FAQ';
import { Scene8Footer } from './landing/Scene8Footer';
import { useLenis } from './landing/useLenis';
import './LandingPage.css';

/* ------------------------------------------------------------------ */
/* OAuth callback handling                                            */
/* ------------------------------------------------------------------ */
/**
 * The cinematic landing is for ANONYMOUS visitors only.
 *
 * Two redirect conditions, both → /app:
 *
 *   1. OAuth callback hash present (`#access_token=…`)
 *      Supabase just bounced the user back from Google. The auth
 *      handler lives in /app's React tree, so forward there with
 *      the hash intact so Supabase can complete sign-in.
 *
 *   2. User is already signed in (Supabase token in localStorage)
 *      They've used Focus Clock before. The cinematic story is for
 *      first-timers. Send them straight to their tool.
 *
 * Result: the landing only shows for first-time anonymous visitors.
 * Logged-in users NEVER see the cinematic page — they always land
 * on /app, exactly as they did before the landing existed.
 */
function useAnonymousLandingGuard() {
  useEffect(() => {
    try {
      // 1. OAuth callback in progress — forward with hash preserved
      if (window.location.hash.includes('access_token')) {
        window.location.replace('/app' + window.location.hash);
        return;
      }
      // 2. Existing session in localStorage — returning user
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
  useAnonymousLandingGuard();
  useLenis();   // ← silky smooth scroll across the entire page

  return (
    <div className="landing">
      <Scene1Hero />
      <Scene3ThreeClicks />
      <Scene4Features />
      <Scene5ComingSoon />
      <Scene6Trust />
      <Scene7Invite />
      <Scene75FAQ />
      <Scene8Footer />
    </div>
  );
}
