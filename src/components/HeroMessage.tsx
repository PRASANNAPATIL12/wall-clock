import { useEffect, useRef, useState } from 'react';
import './HeroMessage.css';

/**
 * The message that anonymous visitors see on first load.
 * Typed character-by-character, held briefly, then fades.
 * Matches the design language: quiet, italic, Inter light.
 */
const MSG  = "Not here for your attention. Here for your focus.";
const SPEED = 55;  // ms per character
const HOLD  = 2600; // ms pause after typing completes
const FADE  = 1500; // ms CSS fade transition

/** Total display duration in ms — passed to FocusRing so the onboarding
 *  hint stays visible while the message plays. */
export const HERO_TOTAL_MS = MSG.length * SPEED + HOLD + FADE;

interface Props {
  /** Called on mount with HERO_TOTAL_MS so the parent can extend hint timing. */
  onStart?: (ms: number) => void;
}

export function HeroMessage({ onStart }: Props) {
  const [charIdx, setCharIdx] = useState(0);
  const [phase,   setPhase]   = useState<'typing' | 'hold' | 'fading' | 'done'>('typing');
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      onStart?.(HERO_TOTAL_MS);
    }
  }, [onStart]);

  // Advance one character
  useEffect(() => {
    if (phase !== 'typing') return;
    if (charIdx >= MSG.length) { setPhase('hold'); return; }
    const t = window.setTimeout(() => setCharIdx(n => n + 1), SPEED);
    return () => window.clearTimeout(t);
  }, [charIdx, phase]);

  // Hold → fading
  useEffect(() => {
    if (phase !== 'hold') return;
    const t = window.setTimeout(() => setPhase('fading'), HOLD);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Fading → done
  useEffect(() => {
    if (phase !== 'fading') return;
    const t = window.setTimeout(() => setPhase('done'), FADE + 50);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      className={`hero-msg${phase === 'fading' ? ' is-fading' : ''}`}
      aria-hidden="true"  /* decorative — screen readers don't need this */
    >
      <span className="hero-msg__text">
        {MSG.slice(0, charIdx)}
        {phase === 'typing' && (
          <span className="hero-msg__cursor" aria-hidden>|</span>
        )}
      </span>
    </div>
  );
}
