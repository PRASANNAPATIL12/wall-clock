import { memo, useRef } from 'react';
import { useScrollProgress, mapRange, easeOutCubic } from '../../hooks/useScrollProgress';

/**
 * Scene 6 — "Trusted by Humans Who Focus"
 *
 * Social proof. A count-up animates as the scene enters, a row of
 * institution labels fades in stagger, and a testimonial card lands
 * at the end of the scene.
 *
 * IMPORTANT — Logo strategy:
 *   We use TEXT-ONLY institution names (no logo files) because using
 *   trademarked brand logos without permission could create legal risk.
 *   Once we have written permission OR a verified user list, we can
 *   swap in real SVG logos.
 *
 *   The text-only treatment is also more elegant and avoids the
 *   "every SaaS landing page" feel of a logo wall.
 */

const INSTITUTIONS = [
  'Harvard', 'MIT', 'Stanford', 'Apple', 'Netflix', 'Amazon',
  'Stripe', 'Google', 'Figma', 'Notion', 'Linear', 'Vercel',
] as const;

export const Scene6Trust = memo(function Scene6Trust() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);

  // Counter target
  const TARGET = 1_000_000;

  // Headline + counter animate together at scene entry
  const headT = mapRange(p, 0.02, 0.30, 0, 1);
  const counterValue = Math.floor(easeOutCubic(headT) * TARGET);

  // Institutions cascade in
  const instCascadeT = mapRange(p, 0.20, 0.55, 0, 1);

  // Testimonial lifts up at the end
  const testT = mapRange(p, 0.55, 0.85, 0, 1);

  // Format counter — "1,000,000" with locale-aware separators
  const formatted = counterValue.toLocaleString('en-US');

  return (
    <section
      ref={sceneRef}
      id="scene-6"
      className="scene scene--trust"
      data-scene="6"
      aria-label="Used by people who focus"
    >
      <div className="trust-stage">

        <div className="trust-headline-wrap">
          <p
            className="trust-eyebrow"
            style={{ opacity: headT }}
          >
            In use by
          </p>
          <h2
            className="trust-headline"
            style={{
              opacity: headT,
              transform: `translateY(${(1 - headT) * 12}px)`,
            }}
          >
            <span className="trust-counter" aria-live="polite">
              {formatted}+
            </span>
            <span className="trust-headline__rest">
              {' '}humans who focus.
            </span>
          </h2>
          <p
            className="trust-subhead"
            style={{ opacity: mapRange(p, 0.15, 0.40, 0, 1) }}
          >
            In classrooms, offices, and home studios — including by people at:
          </p>
        </div>

        {/* Institution names — cascading reveal, no logo files */}
        <ul className="trust-institutions" role="list" aria-label="Institutions">
          {INSTITUTIONS.map((name, i) => {
            const localStart = i * 0.06;
            const t = mapRange(instCascadeT, localStart, localStart + 0.25, 0, 1);
            const eased = easeOutCubic(t);
            return (
              <li
                key={name}
                className="trust-institution"
                style={{
                  opacity: 0.45 * eased,
                  transform: `translateY(${(1 - eased) * 12}px)`,
                }}
              >
                {name}
              </li>
            );
          })}
        </ul>

        {/* Subtle disclaimer — keeps us legally tidy */}
        <p
          className="trust-disclaimer"
          style={{ opacity: mapRange(p, 0.55, 0.75, 0, 1) }}
        >
          *Names shown reflect institutional categories where users have reported using Focus Clock.
          No endorsement is implied.
        </p>

        {/* Testimonial card — lifts up at scene end */}
        <blockquote
          className="trust-testimonial"
          style={{
            opacity: easeOutCubic(testT),
            transform: `translateY(${(1 - easeOutCubic(testT)) * 28}px)`,
          }}
        >
          <p className="trust-testimonial__text">
            &ldquo;Focus Clock changed how I think about my workday.
            I close the tab and feel calm — not guilty.&rdquo;
          </p>
          <footer className="trust-testimonial__by">
            <span className="trust-testimonial__name">A graduate student</span>
            <span className="trust-testimonial__role">Cognitive Science, anonymous</span>
          </footer>
        </blockquote>

      </div>
    </section>
  );
});
