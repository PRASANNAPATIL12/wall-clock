import { useEffect, useRef, useState } from 'react';
import type { FocusState } from './useFocusTrack';

/**
 * Onboarding hint controller.
 *
 * Behaviour:
 *   · `alwaysShow = false` (logged-in users, default):
 *       Each hint is shown exactly once per user's lifetime. Once seen,
 *       it's stored in `wall.hint.seen` (localStorage) and never reappears.
 *
 *   · `alwaysShow = true` (anonymous users):
 *       Hints are shown every time the user visits — no localStorage check,
 *       no write. The ring stays welcoming to first-timers on every session.
 *
 * Hint is visible for 5 s, then fades. State changes mid-display also hide
 * it (with a brief gap before the next one appears).
 */

export type HintKind = 'idle' | 'tracking' | 'targeted';
const STORAGE_KEY   = 'wall.hint.seen';
const VISIBLE_MS    = 5000;
const FIRST_DELAY   = 800;  // ms before the very first hint
const BETWEEN_DELAY = 450;  // ms gap between hints

function loadSeen(): HintKind[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as HintKind[]) : [];
  } catch { return []; }
}

function markSeen(kind: HintKind) {
  try {
    const seen = loadSeen();
    if (seen.includes(kind)) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, kind]));
  } catch { /* private mode / quota */ }
}

/**
 * @param state       Current focus state
 * @param alwaysShow  true for anonymous — skip localStorage, show every session
 * @param extraVisibleMs  Extra ms to keep the idle hint visible (used while hero message plays)
 */
export function useOnboardingHint(state: FocusState, alwaysShow = false, extraVisibleMs = 0) {
  const [visible,  setVisible]  = useState(false);
  const [hintKind, setHintKind] = useState<HintKind | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const kind = state.kind as HintKind;
    setVisible(false);

    const delay = isFirstRun.current ? FIRST_DELAY : BETWEEN_DELAY;
    isFirstRun.current = false;

    const showTimer = window.setTimeout(() => {
      // For logged-in users: skip if already seen
      if (!alwaysShow) {
        const seen = loadSeen();
        if (seen.includes(kind)) return;
        markSeen(kind);
      }
      setHintKind(kind);
      setVisible(true);
    }, delay);

    // Extend the idle hint while hero message types; other hints use normal timing.
    const extra = kind === 'idle' ? extraVisibleMs : 0;
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, delay + VISIBLE_MS + extra);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [state.kind, alwaysShow]);

  return { visible, hintKind };
}
