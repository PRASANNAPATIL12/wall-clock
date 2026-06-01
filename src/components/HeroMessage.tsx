import { useEffect, useRef, useState } from 'react';
import './HeroMessage.css';

/**
 * Hero message for anonymous visitors — fixed above the clock face.
 *
 * Animation: classic typewriter. Each character is revealed one at a time
 * with a blinking cursor, exactly like a mechanical typing machine.
 * Chosen over the SVG stroke-dasharray approach because:
 *   - The typewriter metaphor is philosophically coherent: "we're a tool,
 *     not a feed". A mechanical typewriter is intentional, deliberate, human.
 *   - Font: 'Special Elite' — an authentic worn typewriter typeface with
 *     individual character personality. Every keystroke reads as deliberate.
 *     Fallback: 'Courier New', then generic monospace.
 *   - The slight irregularity of Special Elite's letterforms creates the
 *     same organic quality as handwriting but without SVG complexity.
 *
 * Positioning: top of viewport, between corner controls and clock face.
 * Does NOT overlap with the clock, onboarding hints, or any other element.
 *
 * Two lines typed sequentially:
 *   Line 1: "Not here for your attention."
 *   Line 2 (after 400ms gap): "Here for your focus."
 */

const LINE1 = 'Not here for your attention.';
const LINE2 = 'Here for your focus.';

/* ---- Timing constants ---- */
const CHAR_MS   = 68;   // ms per character — deliberate, not rushed
const GAP_MS    = 480;  // pause between lines (like pressing Enter slowly)
const HOLD_MS   = 2600; // how long the complete text stays visible
const FADE_MS   = 1400; // CSS opacity fade-out duration

// Total line lengths
const L1 = LINE1.length;              // 29 chars
const L2 = LINE2.length;              // 20 chars
const TYPING_MS = (L1 + L2) * CHAR_MS + GAP_MS;  // ~3900ms

export const HERO_TOTAL_MS = TYPING_MS + HOLD_MS + FADE_MS; // ~7900ms

interface Props {
  /** Called immediately so the onboarding hint can extend its visible duration. */
  onStart?: (ms: number) => void;
}

export function HeroMessage({ onStart }: Props) {
  // charIndex counts across both lines combined (0..L1+L2)
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'hold' | 'fading' | 'done'>('typing');
  const started = useRef(false);

  // Report total duration once on mount
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      onStart?.(HERO_TOTAL_MS);
    }
  }, [onStart]);

  // Drive the typewriter counter
  useEffect(() => {
    if (phase !== 'typing') return;
    const total = L1 + L2;
    if (charIdx >= total) {
      setPhase('hold');
      return;
    }
    // Add the inter-line gap after line 1 completes
    const delay = charIdx === L1 ? GAP_MS : CHAR_MS;
    const t = window.setTimeout(() => setCharIdx(n => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [charIdx, phase]);

  // Hold → fading → done
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

  // Split charIdx across the two lines
  const line1Text = LINE1.slice(0, Math.min(charIdx, L1));
  const line2Text = charIdx > L1 ? LINE2.slice(0, charIdx - L1) : '';
  const showCursor = phase === 'typing';
  const cursorOnLine2 = charIdx > L1;

  return (
    <div
      className={`hero-msg${phase === 'fading' ? ' is-fading' : ''}`}
      aria-hidden="true"
    >
      <div className="hero-msg__inner">
        <p className="hero-msg__line">
          {line1Text}
          {showCursor && !cursorOnLine2 && (
            <span className="hero-msg__cursor" aria-hidden>▋</span>
          )}
        </p>

        {/* Line 2 only mounts after line 1 is fully typed */}
        {charIdx >= L1 && (
          <p className="hero-msg__line hero-msg__line--2">
            {line2Text}
            {showCursor && cursorOnLine2 && (
              <span className="hero-msg__cursor" aria-hidden>▋</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
