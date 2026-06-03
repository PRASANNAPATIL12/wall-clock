import { useEffect, useRef, useState } from 'react';
import type { FocusState } from './useFocusTrack';

/**
 * Onboarding hint controller.
 *
 * `alwaysShow = false` (logged-in users): each hint shown once per lifetime.
 * `alwaysShow = true`  (anonymous users): hints show every session.
 *
 * `extraInitialDelayMs` — delays WHEN the idle hint first appears.
 * Used by the hero message: the hint should start exactly when the hero's
 * glow phase begins (HERO_GLOW_START_MS from page load) rather than at
 * the default 800ms. This ensures hero and hint never overlap; the hint
 * begins the moment the text brightens up.
 */

export type HintKind = 'idle' | 'tracking' | 'targeted';
const STORAGE_KEY   = 'wall.hint.seen';
const VISIBLE_MS    = 5000;
export const FIRST_DELAY   = 800;  // ms before the very first hint (exported for HeroMessage sync)
const BETWEEN_DELAY = 450;  // ms gap between subsequent hints

/**
 * Dispatching this event (e.g. from the Guide pane replay button) causes the
 * hook to re-run its show logic for the current state immediately, as if the
 * user just loaded the page for the first time. localStorage must already be
 * cleared before dispatching.
 */
export const HINTS_REPLAY_EVENT = 'wall.hints.replay';

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

export function useOnboardingHint(
  state: FocusState,
  alwaysShow = false,
  extraInitialDelayMs = 0,  // extra delay before idle hint appears
) {
  const [visible,  setVisible]  = useState(false);
  const [hintKind, setHintKind] = useState<HintKind | null>(null);
  const isFirstRun = useRef(true);
  /**
   * Incremented each time the Guide pane fires HINTS_REPLAY_EVENT.
   * Adding it as a dependency to the show-effect forces the effect to
   * re-run for the current state even when state.kind hasn't changed.
   */
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const onReplay = () => {
      isFirstRun.current = true;   // treat next show as "first run" timing
      setVisible(false);
      setReplayKey(k => k + 1);   // trigger the show-effect below
    };
    window.addEventListener(HINTS_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(HINTS_REPLAY_EVENT, onReplay);
  }, []);

  useEffect(() => {
    const kind = state.kind as HintKind;
    setVisible(false);

    const baseDelay = isFirstRun.current ? FIRST_DELAY : BETWEEN_DELAY;
    isFirstRun.current = false;

    // Apply extra initial delay only to the idle (first) hint
    const extra = kind === 'idle' ? extraInitialDelayMs : 0;
    const delay = baseDelay + extra;

    const showTimer = window.setTimeout(() => {
      if (!alwaysShow) {
        const seen = loadSeen();
        if (seen.includes(kind)) return;
        markSeen(kind);
      }
      setHintKind(kind);
      setVisible(true);
    }, delay);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, delay + VISIBLE_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  // replayKey is intentionally included: forces re-run after Guide replay
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, alwaysShow, extraInitialDelayMs, replayKey]);

  return { visible, hintKind };
}
