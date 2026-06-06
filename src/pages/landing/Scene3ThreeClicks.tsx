import { memo, useRef } from 'react';
import { HeroClock } from './HeroClock';
import { useScrollProgress, mapRange, easeOutCubic } from '../../hooks/useScrollProgress';

/**
 * Scene 3 — "Set a Goal in One Click"
 *
 * After the philosophical Scene 2 blackout, we return to the clock.
 * The clock pins to the LEFT third of the viewport. Three cards
 * reveal sequentially on the RIGHT as the user scrolls:
 *
 *   Click 1 — Begin a focus session    (revealed at 0.10-0.35)
 *   Click 2 — Set your goal time        (revealed at 0.35-0.60)
 *   Click 3 — Done. Session saved.     (revealed at 0.60-0.85)
 *
 * Each card slides in from the right with a slight stagger.
 * On mobile, layout flips to vertical (clock above, cards below).
 *
 * The clock here is the same calm HeroClock — we DON'T mount a real
 * FocusRing on the landing page because:
 *   · It would add ~14 KB of JS (useFocusTrack + planStore + etc.)
 *   · Anonymous landing visitors can't save sessions anyway
 *   · The story is "look how simple it is" — the cards do the telling
 *
 * Returning users go to /app directly (see useReturningUserRedirect),
 * so the audience here is first-timers learning the mental model.
 */

interface CardSpec {
  step:  '1' | '2' | '3';
  title: string;
  body:  string;
  /** Scroll range [enter, settle] over Scene 3 (0..1) */
  range: readonly [number, number];
}

const CARDS: readonly CardSpec[] = [
  // Tighter staggered ranges — all 3 cards visible by 50% scroll progress,
  // then they hold while the scene scrolls toward the next.
  {
    step: '1',
    title: 'Begin a session',
    body: 'Click once anywhere on the ring. A comet sweeps. Tracking starts.',
    range: [0.04, 0.20],
  },
  {
    step: '2',
    title: 'Set your goal',
    body: 'Click again where the minute hand should land. The arc fills toward it.',
    range: [0.18, 0.36],
  },
  {
    step: '3',
    title: 'Done.',
    body: 'A third click clears the session. If you\'re signed in, it\'s saved automatically.',
    range: [0.32, 0.52],
  },
];

export const Scene3ThreeClicks = memo(function Scene3ThreeClicks() {
  const sceneRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(sceneRef);

  // Section heading — fades in early (alongside card 1's reveal), holds throughout
  const headingT = mapRange(p, 0.02, 0.10, 0, 1);

  return (
    <section
      ref={sceneRef}
      id="scene-3"
      className="scene scene--three-clicks"
      data-scene="3"
      aria-label="Set a focus goal in three clicks"
    >
      {/* Sticky inner — pins the clock + heading while cards stream past */}
      <div className="clicks-sticky">

        <div className="clicks-stage">

          {/* LEFT — pinned clock */}
          <div className="clicks-clock-col">
            <div className="clicks-clock">
              <HeroClock />
            </div>
          </div>

          {/* RIGHT — heading + three cards */}
          <div className="clicks-cards-col">

            <h2
              className="clicks-heading"
              style={{
                opacity: headingT,
                transform: `translateY(${(1 - headingT) * 14}px)`,
              }}
            >
              Three clicks. One focused hour.
            </h2>

            <ol className="clicks-cards" role="list">
              {CARDS.map((card, idx) => {
                // Per-card reveal progress
                const t = mapRange(p, card.range[0], card.range[1], 0, 1);
                const eased = easeOutCubic(t);
                return (
                  <li
                    key={card.step}
                    className="clicks-card"
                    style={{
                      opacity: eased,
                      transform: `translateY(${(1 - eased) * 32}px) translateX(${(1 - eased) * 28}px)`,
                    }}
                    aria-current={t > 0.5 && t < 1 ? 'step' : undefined}
                  >
                    <span className="clicks-card__step" aria-hidden="true">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="clicks-card__body">
                      <h3 className="clicks-card__title">{card.title}</h3>
                      <p className="clicks-card__text">{card.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
});
