import { useEffect, useRef, useState } from 'react';
import './HeroMessage.css';

/**
 * Hero message for anonymous visitors.
 *
 * Animation technique: real SVG path drawing via stroke-dasharray + stroke-dashoffset.
 *
 * The text is rendered as SVG <text> using the Caveat handwriting font.
 * Caveat's glyph outlines are thin, organic, connected cursive — when the
 * stroke-dashoffset animates from a large value to 0, the browser
 * progressively reveals the glyph contours, which reads as a pen drawing
 * each letter. This is NOT a typewriter effect, NOT a character reveal,
 * NOT an opacity fade — it's the actual path outlines being traced.
 *
 * After the stroke drawing completes, the fill fades in while the stroke
 * fades out, leaving the final text in a natural filled state.
 *
 * Font choice: Caveat (--font-hand, already loaded). A connected-script
 * handwriting font designed by Impallari Type for Google Fonts. Its thin,
 * variable-width strokes produce the most convincing pen-drawing illusion
 * when animated via dashoffset. Alternatives like Dancing Script or
 * Great Vibes are too formal; Satisfy is too thick. Caveat reads as a
 * quiet, personal pencil note — exactly the tone we want.
 */

const LINE1 = 'Not here for your attention.';
const LINE2 = 'Here for your focus.';

/* ---- Timing (ms) ---- */
const LINE1_DRAW = 3000;   // stroke drawing for first line
const LINE2_DELAY = 2200;  // line 2 starts while line 1 is still finishing
const LINE2_DRAW = 2200;   // stroke drawing for second line
const FILL_OVERLAP = 400;  // fill begins slightly before stroke ends
const HOLD = 2400;          // text stays fully visible
const FADE = 1400;          // final fade out

// Total from mount to gone
const DRAW_DONE = Math.max(LINE1_DRAW, LINE2_DELAY + LINE2_DRAW) + FILL_OVERLAP;
export const HERO_TOTAL_MS = DRAW_DONE + HOLD + FADE;

interface Props {
  onStart?: (ms: number) => void;
}

export function HeroMessage({ onStart }: Props) {
  const [phase, setPhase] = useState<'draw' | 'hold' | 'fading' | 'done'>('draw');
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      onStart?.(HERO_TOTAL_MS);
    }
  }, [onStart]);

  useEffect(() => {
    if (phase === 'draw') {
      const t = window.setTimeout(() => setPhase('hold'), DRAW_DONE);
      return () => window.clearTimeout(t);
    }
    if (phase === 'hold') {
      const t = window.setTimeout(() => setPhase('fading'), HOLD);
      return () => window.clearTimeout(t);
    }
    if (phase === 'fading') {
      const t = window.setTimeout(() => setPhase('done'), FADE + 100);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      className={`hero-msg${phase === 'fading' ? ' is-fading' : ''}`}
      aria-hidden="true"
    >
      <svg
        className="hero-svg"
        viewBox="0 0 700 120"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
      >
        {/* Line 1 — draws first */}
        <text
          className="hero-line hero-line--1"
          x="350"
          y="40"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {LINE1}
        </text>

        {/* Line 2 — draws second, overlapping */}
        <text
          className="hero-line hero-line--2"
          x="350"
          y="90"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {LINE2}
        </text>
      </svg>
    </div>
  );
}
