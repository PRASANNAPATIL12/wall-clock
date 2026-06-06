/**
 * Scene 1 + 2 (merged) — "The Clock Is Alive" → "Your Time Is Finite"
 *
 * ONE sticky stage holds the REAL live application (FocusClockApp
 * embedded). As the user scrolls through 350vh of outer height:
 *
 *   Outer scroll progress (p) maps to scene beats:
 *
 *   0.00 — 0.35   CONTROLS FADE + ZOOM PHASE I
 *                 Controls (pills/buttons) fade from opacity 1 → 0.
 *                 Clock simultaneously scales 1.0× → ~1.5× by the time
 *                 controls are fully gone. Still no interaction lock until
 *                 p = 0.35. Clock canvas is always pointer-events: none.
 *                 NO TRANSFORM applied until scale > 1.001 — keeps fixed-
 *                 positioned children (OnboardingHint) on the viewport.
 *
 *   0.00 — 0.50   ZOOM PHASE I — 1.0× → 1.7× (easeInOutCubic)
 *                 Clock scales from natural size to 1.7× its width/height.
 *                 Center point stays locked to the viewport center.
 *
 *   0.50 — 1.00   ZOOM PHASE II — 1.7× → 2.8× (easeInOutCubic)
 *                 Camera continues pushing in. Blackout and clock fade
 *                 overlap to "pass through" the clock face.
 *
 *   0.50 — 0.75   BLACKOUT
 *                 Dark overlay fades from opacity 0 → 1, covering the
 *                 screen as the clock is swallowed by the zoom.
 *
 *   0.68 — 0.82   CLOCK FADE
 *                 The embedded clock fades behind the blackout.
 *
 *   0.72 — 1.00   HEADLINE REVEAL
 *                 11 words — "Every moment you don't measure is one you
 *                 can't get back." — reveal one by one via CSS transition.
 *                 Each word hits its threshold at evenly spaced intervals
 *                 across 0.72 → 1.0. Container opacity also fades in from
 *                 0.72 → 0.87 for a soft entrance.
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

  // Blackout fades in once Phase II begins, fully opaque at 75%
  const blackoutT    = mapRange(p, 0.5, 0.75, 0, 1);
  // Clock fades behind the blackout
  const clockOpacityT = mapRange(p, 0.68, 0.82, 1, 0);

  // Headline container fades in from 72% → 87%
  const headlineOpacityT = mapRange(p, 0.72, 0.87, 0, 1);

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
     11 words, thresholds evenly spaced across REVEAL_START → REVEAL_END.
     Each word gets a CSS transition via `.revealed` class. Container
     opacity provides a soft overall fade-in on top.
  ─────────────────────────────────────────────────────────────── */
  const REVEAL_START = 0.72;
  const REVEAL_END   = 1.0;
  const WORDS = [
    'Every', 'moment', 'you', "don't", 'measure',
    'is', 'one', 'you', "can't", 'get', 'back.',
  ] as const;

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
            is crossed. */}
        <h2
          className="hero-zoom-headline"
          style={{ opacity: headlineOpacityT }}
          aria-hidden={p < 0.72}
        >
          {WORDS.map((word, i) => {
            const threshold = REVEAL_START + (i / WORDS.length) * (REVEAL_END - REVEAL_START);
            const isRevealed = p >= threshold;
            return (
              <span
                key={i}
                className={`hero-zoom-word${isRevealed ? ' revealed' : ''}`}
              >
                {word}
                {i < WORDS.length - 1 ? ' ' : ''}
                {/* Line break between "measure" and "is" */}
                {i === 4 ? <br /> : null}
              </span>
            );
          })}
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
