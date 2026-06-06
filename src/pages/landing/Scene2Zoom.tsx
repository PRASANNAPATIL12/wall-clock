import { memo, useRef } from 'react';
import { HeroClock } from './HeroClock';
import { useScrollProgress, mapRange, easeOutCubic } from '../../hooks/useScrollProgress';

/**
 * Scene 2 — "Your Time Is Finite"
 *
 * The inciting incident. The camera dives INTO the clock.
 *
 * Scroll choreography (using a 250vh sticky container):
 *   0.00 → 0.20  Clock at 1× scale, full opacity
 *   0.20 → 0.55  Clock scales up from 1× → 2.4×, vignette darkens
 *   0.55 → 0.70  Clock fades out (zoom continues past the dial)
 *   0.55 → 0.95  Headline reveals word-by-word over a soft blackout
 *   0.95 → 1.00  Hold the final frame before Scene 3 takes over
 *
 * Both light + dark themes share the same darkening curve — the
 * vignette uses the theme's existing token, just intensified.
 */
export const Scene2Zoom = memo(function Scene2Zoom() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);

  // Zoom curve — eased, accelerating into the dial
  const zoomT = mapRange(p, 0.2, 0.55, 0, 1);
  const scale = 1 + easeOutCubic(zoomT) * 1.4; // 1 → 2.4

  // Clock opacity — full until 0.55, then fades as we "pass through" the face
  const clockOpacity = mapRange(p, 0.55, 0.7, 1, 0);

  // Blackout overlay opacity — darkens vignette as we zoom deeper
  const blackoutOpacity = mapRange(p, 0.2, 0.7, 0, 0.92);

  // Headline word-by-word reveal — each word has its own sub-range
  // Words 1-3: "Every moment you don't measure"
  // Words 4-6: "is one you can't get back."
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
      id="scene-2"
      className="scene scene--zoom"
      data-scene="2"
      aria-label="Every moment you don't measure is one you can't get back"
    >
      {/* Sticky inner wrapper — pins to viewport while outer scrolls */}
      <div className="zoom-sticky">

        {/* The clock — scales as we scroll past the scene */}
        <div
          className="zoom-clock"
          style={{
            transform: `scale(${scale})`,
            opacity: clockOpacity,
          }}
          aria-hidden="true"
        >
          <HeroClock />
        </div>

        {/* Blackout layer — darkens the world as we zoom */}
        <div
          className="zoom-blackout"
          style={{ opacity: blackoutOpacity }}
          aria-hidden="true"
        />

        {/* Headline — word by word reveal over blackout */}
        <h2 className="zoom-headline" aria-hidden={p < 0.55}>
          {words.map((w, i) => {
            const wp = mapRange(p, w.range[0], w.range[1], 0, 1);
            return (
              <span
                key={i}
                className="zoom-word"
                style={{
                  opacity: wp,
                  // Mask reveal — slides from left to right
                  clipPath: `inset(0 ${100 - wp * 100}% 0 0)`,
                  /* Small fade-up motion as it reveals */
                  transform: `translateY(${(1 - wp) * 8}px)`,
                }}
              >
                {w.text}
                {/* Space after each word EXCEPT the last */}
                {i < words.length - 1 ? ' ' : ''}
                {/* Line break after "measure" (index 4) */}
                {i === 4 ? <br /> : null}
              </span>
            );
          })}
        </h2>

        {/* Hidden, accessible full sentence for screen readers */}
        <p className="visually-hidden">
          Every moment you don&apos;t measure is one you can&apos;t get back.
        </p>
      </div>
    </section>
  );
});
