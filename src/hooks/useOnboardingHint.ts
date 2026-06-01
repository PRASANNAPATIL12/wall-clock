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
  }, [state.kind, alwaysShow, extraInitialDelayMs]);

  return { visible, hintKind };
}
