import { memo, useRef } from 'react';
import { useScrollProgress, mapRange, easeOutCubic } from '../../hooks/useScrollProgress';

/**
 * Scene 5 — "Coming Soon"
 *
 * Signals product momentum without overpromising. Three future-features
 * float up as the scene enters the viewport. Subtle drifting particles
 * behind suggest "brewing, potential, calm progress."
 *
 * Cards stagger in: 0-15%, 5-20%, 10-25% scroll progress through the scene.
 * Theme stays consistent with user preference (no forced theme swap).
 */

interface SoonCard {
  id:    string;
  glyph: JSX.Element;
  title: string;
  body:  string;
  range: readonly [number, number];
}

const CARDS: readonly SoonCard[] = [
  {
    id: 'ambient',
    title: 'Ambient sounds',
    body: 'Rain on a window. Café murmur. Slow waves. Quiet companions for deep work — looped, gentle, in-tab.',
    range: [0.05, 0.35],
    glyph: (
      <svg viewBox="0 0 32 32" width="20" height="20" fill="none" stroke="currentColor"
           strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 12c0-3 2-5 5-5h6c3 0 5 2 5 5v8c0 3-2 5-5 5h-6c-3 0-5-2-5-5z" />
        <path d="M14 16h4M14 20h2" />
        <circle cx="16" cy="6" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'themes',
    title: 'Themes & wallpapers',
    body: 'Dress the clock for your room. Library beige. Studio black. Garden green. Subtle, never noisy.',
    range: [0.10, 0.40],
    glyph: (
      <svg viewBox="0 0 32 32" width="20" height="20" fill="none" stroke="currentColor"
           strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="5" width="22" height="22" rx="3" />
        <circle cx="12" cy="12" r="2" />
        <path d="M5 22l6-6 5 5 4-4 7 7" />
      </svg>
    ),
  },
  {
    id: 'export',
    title: 'Export integrations',
    body: 'Send your session log to Notion, Obsidian, Apple Notes. Your data, your tools. Sketched on the roadmap.',
    range: [0.15, 0.45],
    glyph: (
      <svg viewBox="0 0 32 32" width="20" height="20" fill="none" stroke="currentColor"
           strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 5v16M11 16l5 5 5-5" />
        <path d="M5 25h22" />
      </svg>
    ),
  },
];

export const Scene5ComingSoon = memo(function Scene5ComingSoon() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);

  const headingT = mapRange(p, 0.02, 0.18, 0, 1);

  return (
    <section
      ref={sceneRef}
      id="scene-5"
      className="scene scene--roadmap"
      data-scene="5"
      aria-label="Coming soon to Focus Clock"
    >
      <div className="roadmap-stage">

        {/* Subtle particle field — drift upward, very low opacity */}
        <div className="roadmap-particles" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="roadmap-particle"
              style={{
                left:  `${(i * 53) % 100}%`,
                animationDelay: `${(i % 7) * 0.7}s`,
                animationDuration: `${8 + (i % 5) * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="roadmap-header">
          <p
            className="roadmap-eyebrow"
            style={{ opacity: headingT, transform: `translateY(${(1 - headingT) * 8}px)` }}
          >
            On the horizon
          </p>
          <h2
            className="roadmap-heading"
            style={{ opacity: headingT, transform: `translateY(${(1 - headingT) * 14}px)` }}
          >
            Coming soon.
          </h2>
        </div>

        <ul className="roadmap-grid" role="list">
          {CARDS.map((card) => {
            const t = mapRange(p, card.range[0], card.range[1], 0, 1);
            const eased = easeOutCubic(t);
            return (
              <li
                key={card.id}
                className="roadmap-card"
                data-feature={card.id}
                style={{
                  opacity: eased,
                  transform: `translateY(${(1 - eased) * 28}px)`,
                }}
              >
                <span className="roadmap-card__glyph">{card.glyph}</span>
                <h3 className="roadmap-card__title">{card.title}</h3>
                <p className="roadmap-card__body">{card.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
});
