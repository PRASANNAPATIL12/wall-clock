import { useEffect, useRef, useState } from 'react';
import './HeroMessage.css';

/**
 * Hero message — typewriter animation, above the clock.
 *
 * Phase sequence:
 *   typing → hold → glowing → fading → done
 *
 * The 'glowing' phase is a gentle breath: the text brightens (opacity
 * 0.65 → 0.95) then settles. It's designed to signal completion and
 * draw the eye just before the onboarding hint appears — the hint
 * starts precisely when the glow begins.
 *
 * Desktop: single row, anchor technique prevents leftward drift.
 * Mobile (≤640px): two rows, LINE1 then LINE2 with a gap.
 */

const LINE1 = 'Not here for your attention.';
const LINE2 = 'Here for your focus.';
const FULL  = `${LINE1} ${LINE2}`;

const L1       = LINE1.length;
const L2_START = L1 + 1;

/* ---- Timing ---- */
const CHAR_MS = 68;
const GAP_MS  = 420;
const HOLD_MS = 2600;
const GLOW_MS = 900;   // breathe effect before fade
const FADE_MS = 1400;

export const TYPING_MS         = FULL.length * CHAR_MS + GAP_MS;
export const HERO_GLOW_START_MS = TYPING_MS + HOLD_MS;   // t when glow begins
export const HERO_TOTAL_MS      = TYPING_MS + HOLD_MS + GLOW_MS + FADE_MS;

interface Props {
  /**
   * Called on mount with (HERO_GLOW_START_MS - FIRST_DELAY_MS) so the
   * parent can delay the onboarding hint to appear exactly when the glow
   * starts (i.e., when the text brightens up = the natural "here, look at
   * the ring" moment).
   */
  onStart?: (delayMs: number) => void;
}

/** FIRST_DELAY in useOnboardingHint — must stay in sync. */
const HINT_FIRST_DELAY = 800;

export function HeroMessage({ onStart }: Props) {
  const [charIdx, setCharIdx] = useState(0);
  const [phase,   setPhase]   = useState<'typing' | 'hold' | 'glowing' | 'fading' | 'done'>('typing');
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      // Pass the extra delay needed so the hint appears exactly when the glow starts.
      // Hint normally fires at HINT_FIRST_DELAY (800ms); we need it at HERO_GLOW_START_MS.
      // Extra = HERO_GLOW_START_MS - HINT_FIRST_DELAY
      onStart?.(Math.max(0, HERO_GLOW_START_MS - HINT_FIRST_DELAY));
    }
  }, [onStart]);

  // Typewriter
  useEffect(() => {
    if (phase !== 'typing') return;
    if (charIdx >= FULL.length) { setPhase('hold'); return; }
    const delay = charIdx === L1 ? GAP_MS : CHAR_MS;
    const t = window.setTimeout(() => setCharIdx(n => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [charIdx, phase]);

  // Phase transitions
  useEffect(() => {
    if (phase === 'hold') {
      const t = window.setTimeout(() => setPhase('glowing'), HOLD_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'glowing') {
      const t = window.setTimeout(() => setPhase('fading'), GLOW_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'fading') {
      const t = window.setTimeout(() => setPhase('done'), FADE_MS + 100);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'done') return null;

  const typing    = phase === 'typing';
  const glowing   = phase === 'glowing';
  const fading    = phase === 'fading';

  const desktopTyped = FULL.slice(0, charIdx);
  const line1Text    = FULL.slice(0, Math.min(charIdx, L1));
  const line2Text    = charIdx > L2_START ? LINE2.slice(0, charIdx - L2_START) : '';
  const cursorLine2  = charIdx >= L2_START;

  const cls = [
    'hero-msg',
    glowing ? 'is-glowing' : '',
    fading  ? 'is-fading'  : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} aria-hidden="true">

      {/* ─── Desktop: one row, anchor prevents leftward drift ─── */}
      <div className="hero-msg__desktop">
        <div className="hero-msg__anchor-wrap">
          <span className="hero-msg__ghost">{FULL}</span>
          <span className="hero-msg__typed">
            <HighlightedText typed={desktopTyped} full={FULL} />
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
            <HighlightedText typed={line2Text} full={LINE2} />
            {typing && cursorLine2 && <span className="hero-msg__cursor" aria-hidden>▋</span>}
          </p>
        )}
      </div>

    </div>
  );
}

function HighlightedText({ typed, full }: { typed: string; full: string }) {
  const WORD = 'focus';
  const fi   = full.indexOf(WORD);
  if (fi === -1 || typed.length <= fi) return <>{typed}</>;

  const before = typed.slice(0, fi);
  const word   = typed.slice(fi, Math.min(typed.length, fi + WORD.length));
  const after  = typed.length > fi + WORD.length ? typed.slice(fi + WORD.length) : '';

  return (
    <>
      {before}
      <span className="hero-focus">{word}</span>
      {after}
    </>
  );
}
