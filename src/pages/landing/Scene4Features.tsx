import { memo, useRef } from 'react';
import { useScrollProgress, mapRange } from '../../hooks/useScrollProgress';

/**
 * Scene 4 — "Five Ways to Use Your Time"
 *
 * The feature showcase. Vertical scroll drives HORIZONTAL motion inside
 * a pinned panel — a classic Awwwards-style technique.
 *
 * Outer scene height: 500vh (defined in CSS)
 *   · 0.00 - 0.10  Heading fades in
 *   · 0.10 - 0.92  Horizontal track translates -80% of its overflow
 *   · 0.92 - 1.00  Heading + last card hold before Scene 5
 *
 * Each feature card has a placeholder media box (replaced with WebM/GIF
 * in a later step). For now we render a styled SVG illustration matching
 * each feature's visual language.
 *
 * Mobile note: horizontal-inside-vertical is awkward on touch. The CSS
 * media query collapses this scene to a vertical stack with scroll-snap.
 */

interface Feature {
  id:    string;
  title: string;
  body:  string;
  /** Inline SVG illustration — placeholder until real GIFs are recorded */
  art:   JSX.Element;
}

/* Tag colors lifted from PlannedRingsLayer's palette */
const FEATURES: readonly Feature[] = [
  {
    id: 'tag',
    title: 'Tag your work',
    body: 'Code, Study, Design, Read — 14 tags ready out of the box. Add your own. Each session gets coloured to match.',
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        {['#818cf8', '#34d399', '#60a5fa', '#c084fc', '#f472b6', '#fb923c'].map((c, i) => (
          <circle key={i} cx={26 + i * 30} cy={60} r="14" fill={c} opacity="0.85" />
        ))}
      </svg>
    ),
  },
  {
    id: 'streak',
    title: 'Build a streak',
    body: 'A daily rhythm. Miss a day, lose your streak. Honest, not punitive — just an accurate reflection of your work.',
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <text x="100" y="78" textAnchor="middle"
              fontFamily="Inter" fontWeight="300" fontSize="64"
              fill="var(--hand-second)" letterSpacing="-2">
          27
        </text>
        <text x="100" y="105" textAnchor="middle"
              fontFamily="Inter" fontWeight="500" fontSize="11"
              fill="var(--fg-muted)" letterSpacing="2">
          DAY STREAK
        </text>
      </svg>
    ),
  },
  {
    id: 'heatmap',
    title: 'See a year of focus',
    body: 'Twelve months of focused hours in one glance. Spot the rhythms you didn\'t know you had.',
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        {Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 16 }, (_, c) => {
            const v = Math.sin(r * 0.6 + c * 0.35) * 0.5 + 0.5;
            return (
              <rect key={`${r}-${c}`}
                x={8 + c * 11} y={20 + r * 11}
                width="9" height="9" rx="2"
                fill="#2da44e"
                opacity={0.15 + v * 0.65} />
            );
          }),
        )}
      </svg>
    ),
  },
  {
    id: 'plan',
    title: 'Plan in advance',
    body: 'Schedule tomorrow\'s deep work. Concentric arcs render right on the clock face. One tap to start.',
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <circle cx="100" cy="60" r="46" fill="none"
                stroke="var(--fg-hairline)" strokeWidth="0.6"
                strokeDasharray="0.6 1.4" />
        <path d="M 100 14 A 46 46 0 0 1 140 50" fill="none"
              stroke="#34d399" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <path d="M 64 90 A 46 46 0 0 1 64 30" fill="none"
              stroke="#818cf8" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <circle cx="100" cy="60" r="3" fill="var(--hand-second)" />
      </svg>
    ),
  },
  {
    id: 'analyze',
    title: 'Analyse your time',
    body: 'Period totals, day-of-week breakdowns, tag distributions. Find what works. Drop what doesn\'t.',
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        {[42, 78, 56, 92, 64, 38, 70].map((h, i) => (
          <rect key={i}
            x={20 + i * 24} y={100 - h}
            width="14" height={h} rx="2"
            fill="var(--hand-second)"
            opacity={0.4 + i * 0.08} />
        ))}
      </svg>
    ),
  },
];

export const Scene4Features = memo(function Scene4Features() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);

  // Heading fades in early
  const headingT = mapRange(p, 0.02, 0.08, 0, 1);

  // Horizontal translation across 5 cards.
  // Outer scene height is 900vh, so each card has ~180vh of scroll to be
  // readable. trackT progresses 0 → 1 across most of the scene (0.06 → 0.94),
  // mapped to translateX from 0 to -78% of track width.
  //
  // Because outer height is 900vh, the EFFECTIVE scroll speed of the
  // horizontal track is ~4× slower than the previous 500vh version.
  // Each card is now legible for ~150-180vh of scroll before sliding
  // off — long enough for a comfortable read on every screen.
  const trackT = mapRange(p, 0.06, 0.94, 0, 1);
  const translateX = -trackT * 78; // 0% → -78%

  return (
    <section
      ref={sceneRef}
      id="scene-4"
      className="scene scene--features"
      data-scene="4"
      aria-label="Five ways to use your time"
    >
      <div className="features-sticky">

        <h2
          className="features-heading"
          style={{
            opacity: headingT,
            transform: `translateY(${(1 - headingT) * 16}px)`,
          }}
        >
          Five ways to use your time.
        </h2>

        <div className="features-viewport">
          <div
            className="features-track"
            style={{ transform: `translate3d(${translateX}%, 0, 0)` }}
          >
            {FEATURES.map((f, i) => {
              // Each card has its own active-range — when it's centered,
              // it slightly lifts + brightens.
              const cardCenter = 0.10 + ((i + 0.5) / FEATURES.length) * 0.82;
              const distance = Math.abs(p - cardCenter);
              const active = 1 - Math.min(1, distance * 6);
              return (
                <article
                  key={f.id}
                  className="feature-card"
                  data-feature={f.id}
                  style={{
                    transform: `translateY(${-active * 6}px) scale(${1 + active * 0.012})`,
                    boxShadow: active > 0.6
                      ? 'var(--shadow-pop)'
                      : 'var(--shadow-pill)',
                  }}
                >
                  <div className="feature-card__art">{f.art}</div>
                  <h3 className="feature-card__title">{f.title}</h3>
                  <p className="feature-card__body">{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>

        {/* Progress indicator — small dots showing which card is centered */}
        <div className="features-dots" aria-hidden="true">
          {FEATURES.map((_, i) => {
            const cardCenter = 0.10 + ((i + 0.5) / FEATURES.length) * 0.82;
            const distance = Math.abs(p - cardCenter);
            const active = 1 - Math.min(1, distance * 6);
            return (
              <span
                key={i}
                className="features-dot"
                style={{
                  width: active > 0.4 ? '24px' : '6px',
                  opacity: 0.3 + active * 0.7,
                }}
              />
            );
          })}
        </div>

      </div>
    </section>
  );
});
