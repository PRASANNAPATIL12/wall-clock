/**
 * Scene 1 + 2 (merged) — "The Clock Is Alive" → "Your Time Is Finite"
 *
 * ONE sticky stage holds the REAL live application (FocusClockApp
 * embedded). As the user scrolls through 260vh of outer height:
 *
 *   Outer scroll progress (p) maps to scene beats:
 *
 *   0.00 — 0.06   IDLE
 *                 The full live app is visible. Onboarding hint shows
 *                 (handwritten arrow + "click anywhere on the ring").
 *                 NO TRANSFORM is applied — keeping fixed-positioned
 *                 children (OnboardingHint) positioned relative to the
 *                 actual viewport instead of the wrapper.
 *
 *   0.06 — 0.20   CONTROLS FADE
 *                 Pills/buttons (theme toggle, JoinPill, fullscreen,
 *                 timezone, mode, format, coffee, hero-message) fade
 *                 from opacity 1 → 0. Clock remains at scale 1 in
 *                 the SAME position. Still no transform on the wrapper.
 *
 *   0.20 — 0.55   ZOOM PHASE I — 1.0× → 1.7×
 *                 Clock smoothly scales up to 1.7× its natural size.
 *                 Stays centered. easeInOutCubic for a deliberate
 *                 cinematic motion (not rubbery).
 *
 *   0.55 — 0.75   ZOOM PHASE II — 1.7× → 2.6× + BLACKOUT
 *                 Camera pushes further. Vignette darkens. Clock fades
 *                 behind the blackout as we "pass through" the dial.
 *
 *   0.65 — 0.92   HEADLINE REVEAL
 *                 11 words clip-path mask in over the blackout:
 *                 "Every moment you don't measure is one you can't get back."
 *
 *   0.92 — 1.00   HOLD before Scene 3 takes over.
 *
 * Scrolling BACK UP reverses every transform — the user returns to
 * the fully interactive idle state.
 */
import { memo, useRef } from 'react';
import { FocusClockApp } from '../../FocusClockApp';
import {
  useStickyScrollProgress,
  mapRange,
  easeOutCubic,
  easeInOutCubic,
} from '../../hooks/useScrollProgress';

export const Scene1Hero = memo(function Scene1Hero() {
  const sceneRef = useRef<HTMLElement>(null);
  /* Sticky-aware progress: 0 = fresh page load (no scroll), 1 = sticky
     about to release. Critical: the standard `useScrollProgress` would
     return ~0.278 at scrollY=0 because Scene 1 is at the page top.
     That mis-firing made the buttons fade out instantly on reload. */
  const p = useStickyScrollProgress(sceneRef);

  /* ── Phase progress ────────────────────────────────────────────── */
  // Controls fade — first thing to happen
  const controlsOpacityT = mapRange(p, 0.06, 0.20, 1, 0);

  // Phase I zoom: 1.0× → 1.7× over 0.20-0.55
  // easeInOutCubic gives the "deliberate camera move" feel
  const zoomPhaseI = easeInOutCubic(mapRange(p, 0.20, 0.55, 0, 1));
  // Phase II zoom: 1.7× → 2.6× over 0.55-0.75
  const zoomPhaseII = easeOutCubic(mapRange(p, 0.55, 0.75, 0, 1));
  // Final scale = phase I contribution + phase II contribution
  const scale = 1 + zoomPhaseI * 0.7 + zoomPhaseII * 0.9;

  // Blackout starts when phase II begins
  const blackoutT = mapRange(p, 0.55, 0.75, 0, 0.92);
  // Clock fades behind blackout
  const clockOpacityT = mapRange(p, 0.65, 0.80, 1, 0);

  // Interaction lock kicks in as soon as controls start fading
  const interactionsLocked = p > 0.06;

  /* ── Transform optimization ────────────────────────────────────
     Apply `transform` ONLY when actually zooming. Any transform value
     (even scale(1)) creates a "transformed containing block" that
     re-anchors fixed-positioned descendants (including OnboardingHint)
     to the wrapper instead of the viewport. By keeping `transform: none`
     during idle, the OnboardingHint positions correctly off the real
     viewport, so its arrow + handwritten text appear in the right
     place on initial page load.
  ─────────────────────────────────────────────────────────────── */
  const shouldTransform = scale > 1.001;
  const wrapTransform = shouldTransform ? `scale(${scale})` : 'none';

  /* ── Headline words for the zoom-blackout reveal ──────────────── */
  const words = [
    { text: 'Every',    range: [0.66, 0.71] },
    { text: 'moment',   range: [0.69, 0.74] },
    { text: 'you',      range: [0.72, 0.77] },
    { text: "don't",    range: [0.75, 0.80] },
    { text: 'measure',  range: [0.78, 0.83] },
    { text: 'is',       range: [0.81, 0.84] },
    { text: 'one',      range: [0.83, 0.86] },
    { text: 'you',      range: [0.85, 0.88] },
    { text: "can't",    range: [0.86, 0.89] },
    { text: 'get',      range: [0.88, 0.91] },
    { text: 'back.',    range: [0.90, 0.94] },
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

      {/* Sticky stage — pins for the entire 260vh outer scroll */}
      <div className="hero-sticky">

        {/* The live app — embedded. Transform + opacity driven by scroll.
            We pass --controls-opacity down as a CSS variable so the
            cascade can fade only the controls (not the clock face). */}
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

        {/* Headline — word-by-word reveal over blackout */}
        <h2 className="hero-zoom-headline" aria-hidden={p < 0.65}>
          {words.map((w, i) => {
            const wp = mapRange(p, w.range[0], w.range[1], 0, 1);
            return (
              <span
                key={i}
                className="hero-zoom-word"
                style={{
                  opacity: wp,
                  clipPath: `inset(0 ${100 - wp * 100}% 0 0)`,
                  transform: `translateY(${(1 - wp) * 8}px)`,
                }}
              >
                {w.text}
                {i < words.length - 1 ? ' ' : ''}
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
