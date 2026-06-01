import { useEffect, useRef, useState } from 'react';
import './HeroMessage.css';

/**
 * Hero message — typewriter animation, above the clock.
 *
 * Desktop: single row. The full sentence stays in place; characters
 * appear from left to right within a fixed-width container (anchor
 * technique — an invisible ghost of the complete text sets the width,
 * so the visible typed text never shifts horizontally).
 *
 * Mobile (≤640px): two rows, LINE1 then LINE2 with a gap between.
 */

const LINE1 = 'Not here for your attention.';
const LINE2 = 'Here for your focus.';
const FULL  = `${LINE1} ${LINE2}`;   // single-row desktop string

const L1       = LINE1.length;       // gap fires after this many chars
const L2_START = L1 + 1;             // LINE2 starts here in FULL (skip space)

/* ---- Timing ---- */
const CHAR_MS = 68;   // ms per character
const GAP_MS  = 420;  // pause after LINE1 (period pause / Enter pause on mobile)
const HOLD_MS = 2600;
const FADE_MS = 1400;

const TYPING_MS    = FULL.length * CHAR_MS + GAP_MS;
export const HERO_TOTAL_MS = TYPING_MS + HOLD_MS + FADE_MS;

interface Props {
  onStart?: (ms: number) => void;
}

export function HeroMessage({ onStart }: Props) {
  const [charIdx, setCharIdx] = useState(0);
  const [phase,   setPhase]   = useState<'typing' | 'hold' | 'fading' | 'done'>('typing');
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) { started.current = true; onStart?.(HERO_TOTAL_MS); }
  }, [onStart]);

  useEffect(() => {
    if (phase !== 'typing') return;
    if (charIdx >= FULL.length) { setPhase('hold'); return; }
    // Natural pause after the period at end of LINE1
    const delay = charIdx === L1 ? GAP_MS : CHAR_MS;
    const t = window.setTimeout(() => setCharIdx(n => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [charIdx, phase]);

  useEffect(() => {
    if (phase === 'hold') {
      const t = window.setTimeout(() => setPhase('fading'), HOLD_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'fading') {
      const t = window.setTimeout(() => setPhase('done'), FADE_MS + 100);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'done') return null;

  const typing = phase === 'typing';

  /* ---- Desktop: single row ---- */
  const desktopTyped = FULL.slice(0, charIdx);

  /* ---- Mobile: two rows ---- */
  const line1Text    = FULL.slice(0, Math.min(charIdx, L1));
  const line2Text    = charIdx > L2_START ? LINE2.slice(0, charIdx - L2_START) : '';
  const cursorLine2  = charIdx >= L2_START;

  return (
    <div className={`hero-msg${phase === 'fading' ? ' is-fading' : ''}`} aria-hidden="true">

      {/* ─── Desktop: one row, anchor prevents leftward drift ─── */}
      <div className="hero-msg__desktop">
        <div className="hero-msg__anchor-wrap">
          {/* Ghost — invisible, establishes fixed width of complete sentence */}
          <span className="hero-msg__ghost">{FULL}</span>
          {/* Typed text — grows left-to-right inside the fixed container */}
          <span className="hero-msg__typed">
            {desktopTyped}
            {typing && <span className="hero-msg__cursor" aria-hidden>▋</span>}
          </span>
        </div>
      </div>

      {/* ─── Mobile: two rows ─── */}
      <div className="hero-msg__mobile">
        <p className="hero-msg__line">
          {line1Text}
          {typing && !cursorLine2 && <span className="hero-msg__cursor" aria-hidden>▋</span>}
        </p>
        {charIdx >= L1 && (
          <p className="hero-msg__line hero-msg__line--2">
            {line2Text}
            {typing && cursorLine2 && <span className="hero-msg__cursor" aria-hidden>▋</span>}
          </p>
        )}
      </div>

    </div>
  );
}
