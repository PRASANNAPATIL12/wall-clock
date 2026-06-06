/**
 * Scene 1 + 2 — "The Clock Is Alive" merging into "Your Time Is Finite"
 *
 * The opening act of the cinematic landing. ONE sticky stage holds the
 * REAL live application (FocusClockApp embedded). As the user scrolls
 * through 350vh of outer height:
 *
 *   Outer scroll progress (p) maps to scene beats:
 *   ───────────────────────────────────────────────
 *   0.00 — 0.28   IDLE
 *                 The full live app is visible and fully interactive.
 *                 All controls, hero message, 3-click focus ring — works
 *                 exactly as /app. Identical pixels.
 *
 *   0.28 — 0.55   ZOOM (the camera dive)
 *                 · Controls fade out (opacity 1 → 0)
 *                 · Clock scales 1× → 2.4× (easeOutCubic)
 *                 · Vignette/blackout intensifies
 *                 · Focus ring becomes non-interactive (pointer-events: none
 *                   on the wrapper) — the user is now watching a cinematic
 *                   moment, not interacting
 *
 *   0.55 — 0.92   HEADLINE REVEAL
 *                 · 11 words appear with clip-path mask reveal:
 *                   "Every moment you don't measure is one you can't get back."
 *
 *   0.92 — 1.00   HOLD before Scene 3 takes over
 *
 * The clock that's pinned in the sticky stage IS the same clock the user
 * saw in Scene 1's idle state — same DOM node, same React instance, same
 * useFocusTrack state. There's no swap, no remount. That continuity is
 * what makes the cinematic moment feel real.
 *
 * If the user scrolls BACK UP, every transform reverses and they return
 * to the fully interactive app.
 */
import { memo, useRef } from 'react';
import { FocusClockApp } from '../../FocusClockApp';
import {
  useScrollProgress,
  mapRange,
  easeOutCubic,
} from '../../hooks/useScrollProgress';

export const Scene1Hero = memo(function Scene1Hero() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);

  /* ── Phase progress (each 0..1 within its sub-range) ───────────── */
  // 0.00–0.28 = idle (no transforms yet)
  // 0.28–0.55 = zoom phase
  const zoomT = easeOutCubic(mapRange(p, 0.28, 0.55, 0, 1));
  // 0.55–0.70 = clock fades behind blackout
  const clockOpacityT = mapRange(p, 0.55, 0.70, 1, 0);
  // 0.28–0.70 = controls fade away
  const controlsOpacityT = mapRange(p, 0.28, 0.48, 1, 0);
  // 0.20–0.70 = vignette darkens
  const blackoutT = mapRange(p, 0.28, 0.70, 0, 0.92);

  /* ── Computed transforms ───────────────────────────────────────── */
  const scale = 1 + zoomT * 1.4;            // 1 → 2.4
  // Once the zoom has begun, disable pointer events on the entire app
  // so users don't accidentally click a ring or button while watching
  // the cinematic moment.
  const interactionsLocked = p > 0.28;

  /* ── Headline words for the zoom-blackout reveal ──────────────── */
  const words = [
    { text: 'Every',    range: [0.58, 0.63] },
    { text: 'moment',   range: [0.61, 0.66] },
    { text: 'you',      range: [0.64, 0.69] },
    { text: "don't",    range: [0.67, 0.72] },
    { text: 'measure',  range: [0.70, 0.75] },
    { text: 'is',       range: [0.76, 0.80] },
    { text: 'one',      range: [0.78, 0.82] },
    { text: 'you',      range: [0.80, 0.84] },
    { text: "can't",    range: [0.82, 0.86] },
    { text: 'get',      range: [0.84, 0.88] },
    { text: 'back.',    range: [0.86, 0.92] },
  ] as const;

  return (
    <section
      ref={sceneRef}
      id="scene-1"
      className="scene scene--hero-plus-zoom"
      data-scene="1"
      aria-label="Welcome to Focus Clock"
    >
      {/* SEO H1 — visually hidden, exists for crawlers + screen readers */}
      <h1 className="visually-hidden">
        Focus Clock — a calm browser-based focus timer and productivity tracker
      </h1>

      {/* Sticky stage — pins for the entire 350vh outer scroll */}
      <div className="hero-sticky" aria-hidden={false}>

        {/* The live app — embedded, scroll-driven scale + fade */}
        <div
          className="hero-app-wrap"
          style={{
            transform: `scale(${scale})`,
            opacity:   clockOpacityT,
            // Pointer events lock when the zoom starts
            pointerEvents: interactionsLocked ? 'none' : 'auto',
            // Wrapper also fades the controls as a group via custom prop
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
        <h2
          className="hero-zoom-headline"
          aria-hidden={p < 0.55}
        >
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

        {/* Scroll-hint chevron — only visible in idle phase */}
        <a
          className="scroll-hint"
          href="#scene-3"
          aria-label="Scroll to learn more"
          style={{ opacity: mapRange(p, 0.0, 0.15, 1, 0) }}
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
