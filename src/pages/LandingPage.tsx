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

/**
 * useLandingScroll — unlock native document scroll for the landing page.
 *
 * WHY THIS EXISTS:
 *   global.css sets `body { overflow: hidden; height: 100% }` for the
 *   /app clock route, where the app surface is `position: fixed; inset: 0`
 *   and nothing ever needs to scroll.  That same rule is FATAL on the
 *   landing page: with `overflow: hidden` the browser considers the body
 *   a fixed-height scroll container (100vh) and clamps window.scrollY to 0.
 *   Result: scroll progress hooks return 0 forever, `position: sticky`
 *   never activates, and Scene 2's blackout + headline never appear.
 *
 * HOW IT WORKS:
 *   On mount we apply inline styles (highest specificity short of !important)
 *   to html, body, and #root that restore normal document flow:
 *     · height: auto  — elements grow to fit content instead of capping at 100vh
 *     · overflow: visible (body) — vertical scroll is no longer clipped
 *   On unmount (router navigates to /app) we clear the inline styles so the
 *   global.css rules take effect again immediately.
 *
 * SAFE FOR /app:
 *   The clock's `.stage { position: fixed; inset: 0 }` never scrolls,
 *   and there is no in-flow content taller than 100vh on that route —
 *   so the global overflow:hidden / height:100% are purely redundant there
 *   and restoring them on unmount is just belt-and-suspenders.
 */
function useLandingScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    // Override height and overflow so the document can scroll natively.
    html.style.height  = 'auto';
    body.style.height  = 'auto';
    body.style.overflow = 'visible';
    if (root) root.style.height = 'auto';

    return () => {
      // Restore: remove inline overrides so global.css rules apply again.
      html.style.height  = '';
      body.style.height  = '';
      body.style.overflow = '';
      if (root) root.style.height = '';
    };
  }, []);
}

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
  useLandingScroll(); // ← unlock native document scroll (override body overflow:hidden)
  useLenis();         // ← silky smooth scroll across the entire page

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
