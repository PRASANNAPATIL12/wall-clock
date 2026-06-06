/**
 * LandingPage — Cinematic scrollytelling homepage.
 *
 * Served at `/` for first-time visitors. The existing live clock app is
 * served at `/app`. See CINEMATIC_LANDING_PLAN.md for the full vision.
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
import { useLenis } from './landing/useLenis';
import './LandingPage.css';

/* ------------------------------------------------------------------ */
/* OAuth callback handling                                            */
/* ------------------------------------------------------------------ */
/**
 * If the URL contains an OAuth callback hash (`#access_token=…`),
 * Supabase has just bounced the user back from Google. The auth handler
 * lives in the /app React tree, so forward there with the hash intact.
 *
 * NOTE — Returning-user auto-redirect is DISABLED while testing. Once
 * the landing is in production, we can re-enable it so signed-in users
 * skip the cinematic experience and land on /app directly. To re-enable,
 * uncomment the second block.
 */
function useOAuthCallbackRedirect() {
  useEffect(() => {
    try {
      if (window.location.hash.includes('access_token')) {
        window.location.replace('/app' + window.location.hash);
        return;
      }
      // --- Disabled for testing ----------------------------------------
      // const hasSession = Object.keys(localStorage).some(
      //   (k) => k.startsWith('sb-') && k.includes('-auth-token'),
      // );
      // if (hasSession) {
      //   window.location.replace('/app');
      // }
      // -----------------------------------------------------------------
    } catch {
      /* localStorage blocked — show landing anyway */
    }
  }, []);
}

export default function LandingPage() {
  useOAuthCallbackRedirect();
  useLenis();   // ← silky smooth scroll across the entire page

  return (
    <div className="landing">
      <Scene1Hero />
      <Scene2Zoom />
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
