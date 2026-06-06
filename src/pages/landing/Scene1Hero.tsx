/**
 * Scene 1 + 2 (merged) — "The Clock Is Alive" → "Your Time Is Finite"
 *
 * ONE sticky stage holds the REAL live application (FocusClockApp
 * embedded). As the user scrolls through 350vh of outer height:
 *
 *   Outer scroll progress (p) maps to scene beats:
 *
 *   0.00 — 0.35   CONTROLS FADE
 *                 Controls (pills/buttons) fade from opacity 1 → 0.
 *                 NO TRANSFORM applied until scale > 1.001 — keeps fixed-
 *                 positioned children (OnboardingHint) on the viewport.
 *
 *   0.00 — 0.50   ZOOM PHASE I — 1.0× → 1.7× (easeInOutCubic)
 *                 Clock scales from natural size to 1.7× its width/height.
 *
 *   0.50 — 1.00   ZOOM PHASE II — 1.7× → 2.8× (easeInOutCubic)
 *                 Camera continues pushing in. Blackout overlaps.
 *
 *   0.45 — 0.72   BLACKOUT
 *                 Dark overlay fades 0 → 1. Fully opaque at p = 0.72,
 *                 giving the headline a guaranteed dark canvas.
 *
 *   0.68 — 0.82   CLOCK FADE
 *                 The embedded clock fades behind the blackout.
 *
 *   0.72 — 0.98   HEADLINE REVEAL
 *                 11 words across two lines reveal word-by-word:
 *                   Line 1: "Every moment you don't measure"
 *                   Line 2: "is one you can't get back."
 *                 Word thresholds start at p = 0.74 (after blackout is
 *                 fully opaque at 0.72) and end at p = 0.98. Container
 *                 opacity fades in from 0.72 → 0.82 for a soft entrance.
 *
 * Scrolling BACK UP reverses every transform — the user returns to
 * the fully interactive idle state.
 */
import { memo, useRef } from 'react';
import { FocusClockApp } from '../../FocusClockApp';
import {
  useStickyScrollProgress,
  mapRange,
  easeInOutCubic,
} from '../../hooks/useScrollProgress';

export const Scene1Hero = memo(function Scene1Hero() {
  const sceneRef = useRef<HTMLElement>(null);
  /* Sticky-aware progress: 0 = fresh page load (no scroll), 1 = sticky
     about to release. Standard `useScrollProgress` would return ~0.22
     at scrollY=0 for a 350vh scene at the page top, causing controls to
     appear already-faded on fresh load. useStickyScrollProgress always
     returns 0 at scroll=0. */
  const p = useStickyScrollProgress(sceneRef);

  /* ── Phase progress ────────────────────────────────────────────── */

  // Controls fade: immediately on first scroll, gone by 35%
  const controlsOpacityT = mapRange(p, 0.0, 0.35, 1, 0);

  // Phase I zoom: 1.0× → 1.7× over the first half (0.0–0.5)
  const zoomPhaseI  = easeInOutCubic(mapRange(p, 0.0, 0.5, 0, 1));
  // Phase II zoom: 1.7× → 2.8× over the second half (0.5–1.0)
  const zoomPhaseII = easeInOutCubic(mapRange(p, 0.5, 1.0, 0, 1));
  // Combined scale: max 1 + 0.7 + 1.1 = 2.8
  const scale = 1 + zoomPhaseI * 0.7 + zoomPhaseII * 1.1;

  // Blackout starts a little earlier than Phase II for a longer cinematic
  // fade, and reaches FULL opacity at p=0.72 — guaranteeing a completely
  // dark canvas BEFORE any headline word is revealed (words start at 0.74).
  const blackoutT    = mapRange(p, 0.45, 0.72, 0, 1);
  // Clock fades behind the blackout
  const clockOpacityT = mapRange(p, 0.68, 0.82, 1, 0);

  // Headline container fades in quickly (0.72 → 0.82) so words appear on
  // an already-dark background rather than fading in against a light one.
  const headlineOpacityT = mapRange(p, 0.72, 0.82, 0, 1);

  // Interaction lock: once controls are gone (p > 0.35) nothing is clickable
  const interactionsLocked = p > 0.35;

  /* ── Transform optimization ────────────────────────────────────
     Apply `transform` ONLY when actually zooming. Any transform value
     (even scale(1)) creates a "transformed containing block" that
     re-anchors fixed-positioned descendants (including OnboardingHint)
     to the wrapper instead of the viewport. By keeping `transform: none`
     during scale ≈ 1, the OnboardingHint positions correctly on initial
     page load.
  ─────────────────────────────────────────────────────────────── */
  const shouldTransform = scale > 1.001;
  const wrapTransform = shouldTransform ? `scale(${scale})` : 'none';

  /* ── Headline words ────────────────────────────────────────────
     11 words split into two prose lines. Thresholds are evenly spaced
     across REVEAL_START → REVEAL_END using the GLOBAL word index so the
     pace of reveals is consistent regardless of which line a word is on.

     REVEAL_START = 0.74: 0.02 buffer after blackout is fully opaque (0.72).
     This guarantees every word appears on a solid dark background — no
     word ever flashes against a semi-transparent or light bg.

     REVEAL_END = 0.98: leaves a small tail before the sticky releases so
     the final word ("back.") has time to fully transition in.
  ─────────────────────────────────────────────────────────────── */
  const REVEAL_START    = 0.74;
  const REVEAL_END      = 0.98;
  const LINE1 = ['Every', 'moment', 'you', "don't", 'measure'] as const;
  const LINE2 = ['is', 'one', 'you', "can't", 'get', 'back.'] as const;
  const TOTAL_WORDS     = LINE1.length + LINE2.length; // 11

  return (
    <section
      ref={sceneRef}
      id="scene-1"
      className="scene scene--hero-plus-zoom"
      data-scene="1"
      aria-label="Welcome to Focus Clock"
    >
      <h1 className="visually-hidden">
        Focus Clock — a calm browser-based focus timer and productivity tracker
      </h1>

      {/* Sticky stage — pins for the entire 350vh outer scroll */}
      <div className="hero-sticky">

        {/* The live app — embedded. Transform + opacity driven by scroll.
            --controls-opacity cascades down to all non-clock UI. */}
        <div
          className="hero-app-wrap"
          style={{
            transform:     wrapTransform,
            opacity:       clockOpacityT,
            pointerEvents: interactionsLocked ? 'none' : 'auto',
            ['--controls-opacity' as never]: controlsOpacityT,
          }}
          data-locked={interactionsLocked ? 'true' : 'false'}
        >
          <FocusClockApp embedded />
        </div>

        {/* Blackout vignette — darkens as we zoom past the dial */}
        <div
          className="hero-blackout"
          style={{ opacity: blackoutT }}
          aria-hidden="true"
        />

        {/* Headline — word-by-word CSS-transition reveal over blackout.
            Container fades in for a soft entrance; each word flips in
            via `.revealed` class + CSS transition once its threshold
            is crossed.

            Structure: TWO .hero-zoom-headline-line containers (one per
            prose line). Each is a block flex-item in the column flex
            parent. Words inside each line are inline-blocks so they flow
            left-to-right and wrap naturally on narrow viewports.

            Thresholds use GLOBAL word indices so the reveal pace is
            identical whether a word is in line 1 or line 2. */}
        <h2
          className="hero-zoom-headline"
          style={{ opacity: headlineOpacityT }}
          aria-hidden={p < 0.72}
        >
          {/* Line 1: "Every moment you don't measure" */}
          <span className="hero-zoom-headline-line">
            {LINE1.map((word, i) => {
              const threshold = REVEAL_START + (i / TOTAL_WORDS) * (REVEAL_END - REVEAL_START);
              return (
                <span
                  key={i}
                  className={`hero-zoom-word${p >= threshold ? ' revealed' : ''}`}
                >
                  {word}{' '}
                </span>
              );
            })}
          </span>

          {/* Line 2: "is one you can't get back." — last word gets .last-word
              for the hardcoded #c8312b red glow (theme-safe, always dark bg) */}
          <span className="hero-zoom-headline-line">
            {LINE2.map((word, i) => {
              const globalIdx  = LINE1.length + i;
              const threshold  = REVEAL_START + (globalIdx / TOTAL_WORDS) * (REVEAL_END - REVEAL_START);
              const isLastWord = i === LINE2.length - 1;
              return (
                <span
                  key={globalIdx}
                  className={[
                    'hero-zoom-word',
                    p >= threshold ? 'revealed' : '',
                    isLastWord     ? 'last-word' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {word}{isLastWord ? '' : ' '}
                </span>
              );
            })}
          </span>
        </h2>
        <p className="visually-hidden">
          Every moment you don&apos;t measure is one you can&apos;t get back.
        </p>

        {/* Scroll-hint chevron — visible only during the idle phase */}
        <a
          className="scroll-hint"
          href="#scene-3"
          aria-label="Scroll to learn more"
          style={{ opacity: mapRange(p, 0.0, 0.08, 1, 0) }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </div>
    </section>
  );
});
