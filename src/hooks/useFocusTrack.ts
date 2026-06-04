import { useCallback, useEffect, useRef, useState } from 'react';
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
 *  Click 3 returns to idle — and emits a session-end event so the host
 *  can persist the session (via Supabase / localStorage / wherever).
 *
 *  In-flight state (start/end timestamps) is mirrored to localStorage so a
 *  refresh mid-session restores correctly. The session-end event is fired
 *  only on the targeted → idle transition; that's when we know the
 *  complete shape of the session.
 */

export type FocusState =
  | { kind: 'idle' }
  | { kind: 'tracking'; start: number }
  | { kind: 'targeted'; start: number; end: number };

export interface FocusSessionEnd {
  startTime: number;
  goalTime: number | null;
  endTime: number;
  completed: boolean;
  bonusSeconds: number;
}

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

export function useFocusTrack(
  timezone: string,
  onSessionEnd?: (s: FocusSessionEnd) => void,
) {
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

  // Emit a session-end event whenever we transition back to `idle`. Using a
  // ref so callers can change their callback without re-triggering effects.
  const prevStateRef = useRef<FocusState>(state);
  const onSessionEndRef = useRef(onSessionEnd);
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (state.kind !== 'idle' || prev.kind === 'idle') return;

    const cb = onSessionEndRef.current;
    if (!cb) return;

    if (prev.kind === 'tracking') {
      // Cancelled before setting a target — short, untracked.
      cb({
        startTime: prev.start,
        goalTime: null,
        endTime: Date.now(),
        completed: false,
        bonusSeconds: 0,
      });
    } else {
      const now = Date.now();
      cb({
        startTime: prev.start,
        goalTime: prev.end,
        endTime: now,
        completed: now >= prev.end,
        bonusSeconds: Math.max(0, (now - prev.end) / 1000),
      });
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
        return { kind: 'tracking', start: now };
      }

      if (prev.kind === 'tracking') {
        const zt = getZonedTime(new Date(now), timezone);
        const currentMinAngle = ((zt.minutes + zt.seconds / 60) * 6) % 360;
        let delta = clickAngleDeg - currentMinAngle;
        if (delta <= 0.5) delta += 360;
        const deltaMs = (delta / 6) * 60_000;
        return { kind: 'targeted', start: prev.start, end: now + deltaMs };
      }

      // Click 3 — clear. The useEffect above will fire onSessionEnd.
      return { kind: 'idle' };
    });
  }, [timezone]);

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

  /**
   * Directly transition to 'targeted' with explicit timestamps.
   * Used by "Start now" from a planned session so we can set the goal
   * time to the exact planned end time without going through angle math.
   */
  const startWithGoal = useCallback((startMs: number, endMs: number) => {
    setState({ kind: 'targeted', start: startMs, end: endMs });
  }, []);

  return { state, handleClick, setDragEnd, startWithGoal };
}
