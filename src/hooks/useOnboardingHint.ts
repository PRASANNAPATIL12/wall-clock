import { useEffect, useRef, useState } from 'react';
import type { FocusState } from './useFocusTrack';

/**
 * Onboarding hint controller.
 *
 *  · Watches the focus state.
 *  · For each state (idle / tracking / targeted), shows a hint exactly once
 *    in the user's lifetime. After it's shown, the state.kind is appended
 *    to `wall.hint.seen` in localStorage and never reappears.
 *  · Hint is visible for 5 s, then fades. State changes mid-display also
 *    hide it (with a smooth gap before the next one).
 *
 *  Pure side-effect-free for SSR: reads localStorage lazily inside the
 *  effect, never during render.
 */

export type HintKind = 'idle' | 'tracking' | 'targeted';
const STORAGE_KEY = 'wall.hint.seen';
const VISIBLE_MS = 5000;
const SWAP_DELAY_INITIAL = 800; // delay before the very first hint shows
const SWAP_DELAY_AFTER = 450; // delay between fading out one hint and showing the next

function loadSeen(): HintKind[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as HintKind[]) : [];
  } catch {
    return [];
  }
}

function markSeen(kind: HintKind) {
  try {
    const seen = loadSeen();
    if (seen.includes(kind)) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, kind]));
  } catch {
    /* private mode / quota — ignore */
  }
}

export function useOnboardingHint(state: FocusState) {
  const [visible, setVisible] = useState(false);
  const [hintKind, setHintKind] = useState<HintKind | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const kind = state.kind as HintKind;
    // Hide whatever is currently showing — give the previous hint time to
    // fade out before showing the next.
    setVisible(false);

    const delay = isFirstRun.current ? SWAP_DELAY_INITIAL : SWAP_DELAY_AFTER;
    isFirstRun.current = false;

    const showTimer = window.setTimeout(() => {
      const seen = loadSeen();
      if (seen.includes(kind)) return;

      setHintKind(kind);
      setVisible(true);
      markSeen(kind);
    }, delay);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, delay + VISIBLE_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [state.kind]);

  return { visible, hintKind };
}
