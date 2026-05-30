import { useCallback, useEffect, useState } from 'react';
import { getZonedTime } from '../lib/timezones';

/**
 * Focus-tracking state machine for the analog clock's focus ring.
 *
 *   idle ─── click 1 ──▶ tracking ─── click 2 ──▶ targeted ─── click 3 ──▶ idle
 *
 *  Click 1 anchors `start` at *now* (start angle is derived from the timestamp,
 *  i.e. wherever the minute hand currently is — NOT where the user clicked).
 *  Click 2 sets `end` such that the minute hand reaching the clicked angle
 *  marks completion.
 *  Click 3 returns to idle.
 *
 *  All state is kept locally per browser via localStorage — no server, no
 *  shared state, completely private to the user.
 */

export type FocusState =
  | { kind: 'idle' }
  | { kind: 'tracking'; start: number }
  | { kind: 'targeted'; start: number; end: number };

const KEY_START = 'wall.track.start';
const KEY_END = 'wall.track.end';

/** 6 hours — sanity cap. Anyone genuinely focused for this long has forgotten the timer. */
const MAX_TRACK_MS = 6 * 60 * 60 * 1000;

function load(): FocusState {
  if (typeof window === 'undefined') return { kind: 'idle' };
  try {
    const rawStart = window.localStorage.getItem(KEY_START);
    if (!rawStart) return { kind: 'idle' };
    const start = Number(rawStart);
    if (!Number.isFinite(start)) return { kind: 'idle' };
    // Expire stale tracks
    if (Date.now() - start > MAX_TRACK_MS) return { kind: 'idle' };

    const rawEnd = window.localStorage.getItem(KEY_END);
    if (!rawEnd) return { kind: 'tracking', start };
    const end = Number(rawEnd);
    if (!Number.isFinite(end)) return { kind: 'tracking', start };
    return { kind: 'targeted', start, end };
  } catch {
    return { kind: 'idle' };
  }
}

export function useFocusTrack(timezone: string) {
  const [state, setState] = useState<FocusState>(load);

  // Persist every change
  useEffect(() => {
    try {
      if (state.kind === 'idle') {
        window.localStorage.removeItem(KEY_START);
        window.localStorage.removeItem(KEY_END);
      } else if (state.kind === 'tracking') {
        window.localStorage.setItem(KEY_START, String(state.start));
        window.localStorage.removeItem(KEY_END);
      } else {
        window.localStorage.setItem(KEY_START, String(state.start));
        window.localStorage.setItem(KEY_END, String(state.end));
      }
    } catch {
      /* quota / private mode — ignore */
    }
  }, [state]);

  /**
   * Handle a click on the ring at the given angular position (0° = top / 12,
   * clockwise). Cycles the state machine.
   */
  const handleClick = useCallback((clickAngleDeg: number) => {
    setState((prev) => {
      const now = Date.now();

      if (prev.kind === 'idle') {
        // Click 1 — start. Start angle is implicitly the current minute-hand
        // angle (we just record the timestamp).
        return { kind: 'tracking', start: now };
      }

      if (prev.kind === 'tracking') {
        // Click 2 — target. Convert clicked angle to future timestamp.
        // Use the *displayed* timezone's minute, so the math aligns with
        // wherever the user actually sees the minute hand (this matters
        // for half-hour offset zones like IST, Newfoundland, Iran).
        const zt = getZonedTime(new Date(now), timezone);
        const currentMinAngle = ((zt.minutes + zt.seconds / 60) * 6) % 360;
        let delta = clickAngleDeg - currentMinAngle;
        // wrap forward: clicking "behind" or exactly on now means the next
        // time the minute hand reaches that angle (i.e. within an hour).
        if (delta <= 0.5) delta += 360;
        const deltaMs = (delta / 6) * 60_000;
        return { kind: 'targeted', start: prev.start, end: now + deltaMs };
      }

      // Click 3 — clear.
      return { kind: 'idle' };
    });
  }, [timezone]);

  /**
   * Adjust the end timestamp while the user drags the end-drop circle.
   * Uses the same future-projection math as click 2: the new end equals
   * the nearest future moment when the minute hand reaches `angleDeg`.
   *
   * Only valid in `targeted` state; no-op otherwise.
   */
  const setDragEnd = useCallback((angleDeg: number) => {
    setState((prev) => {
      if (prev.kind !== 'targeted') return prev;
      const now = Date.now();
      const zt = getZonedTime(new Date(now), timezone);
      const currentMinAngle = ((zt.minutes + zt.seconds / 60) * 6) % 360;
      let delta = angleDeg - currentMinAngle;
      if (delta <= 0.5) delta += 360;
      const deltaMs = (delta / 6) * 60_000;
      return { kind: 'targeted', start: prev.start, end: now + deltaMs };
    });
  }, [timezone]);

  return { state, handleClick, setDragEnd };
}
