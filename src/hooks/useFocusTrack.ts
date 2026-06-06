import { useCallback, useEffect, useRef, useState } from 'react';
import { getZonedTime } from '../lib/timezones';

/**
 * Focus-tracking state machine for the focus ring.
 *
 *   idle ─── click 1 ──▶ tracking ─── click 2 ──▶ targeted ──▶ idle
 *                                                     │
 *                                                  pause()
 *                                                     │
 *                                                  paused
 *                                                     │
 *                                         resume() / stop()
 *
 *  Click 1 anchors `start` at *now*.
 *  Click 2 sets `end` (goal time).
 *  Click 3 returns to idle — fires session-end event.
 *  pause() freezes the countdown display (extends end on resume).
 *  resume() extends `end` by the pause duration so remaining time is preserved.
 *  stop() forces back to idle from any state — fires session-end event.
 *
 *  State is mirrored to localStorage so a refresh mid-session restores correctly.
 */

export type FocusState =
  | { kind: 'idle' }
  | { kind: 'tracking'; start: number }
  | { kind: 'targeted'; start: number; end: number }
  | { kind: 'paused'; start: number; end: number; pausedAt: number };

export interface FocusSessionEnd {
  startTime: number;
  goalTime: number | null;
  endTime: number;
  completed: boolean;
  bonusSeconds: number;
}

const KEY_START     = 'wall.track.start';
const KEY_END       = 'wall.track.end';
const KEY_PAUSED_AT = 'wall.track.paused_at';

/** 6 hours — sanity cap for targeted sessions. */
const MAX_TRACK_MS = 6 * 60 * 60 * 1000;
/** 1 hour — auto-clear tracking-only (no goal set) sessions.
 *  Prevents stale click-1 from blocking future sessions indefinitely. */
const MAX_TRACKING_ONLY_MS = 1 * 60 * 60 * 1000;

function load(): FocusState {
  if (typeof window === 'undefined') return { kind: 'idle' };
  try {
    const rawStart = window.localStorage.getItem(KEY_START);
    if (!rawStart) return { kind: 'idle' };
    const start = Number(rawStart);
    if (!Number.isFinite(start)) return { kind: 'idle' };
    if (Date.now() - start > MAX_TRACK_MS) return { kind: 'idle' };

    const rawEnd = window.localStorage.getItem(KEY_END);
    if (!rawEnd) {
      // Tracking only (no goal) — auto-clear after 1 h to avoid stale state
      if (Date.now() - start > MAX_TRACKING_ONLY_MS) return { kind: 'idle' };
      return { kind: 'tracking', start };
    }
    const end = Number(rawEnd);
    if (!Number.isFinite(end)) return { kind: 'tracking', start };

    // Check for paused state
    const rawPausedAt = window.localStorage.getItem(KEY_PAUSED_AT);
    if (rawPausedAt) {
      const pausedAt = Number(rawPausedAt);
      if (Number.isFinite(pausedAt)) {
        return { kind: 'paused', start, end, pausedAt };
      }
    }

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

  // Persist every state change to localStorage
  useEffect(() => {
    try {
      if (state.kind === 'idle') {
        window.localStorage.removeItem(KEY_START);
        window.localStorage.removeItem(KEY_END);
        window.localStorage.removeItem(KEY_PAUSED_AT);
      } else if (state.kind === 'tracking') {
        window.localStorage.setItem(KEY_START, String(state.start));
        window.localStorage.removeItem(KEY_END);
        window.localStorage.removeItem(KEY_PAUSED_AT);
      } else if (state.kind === 'targeted') {
        window.localStorage.setItem(KEY_START, String(state.start));
        window.localStorage.setItem(KEY_END, String(state.end));
        window.localStorage.removeItem(KEY_PAUSED_AT);
      } else {
        // paused
        window.localStorage.setItem(KEY_START, String(state.start));
        window.localStorage.setItem(KEY_END, String(state.end));
        window.localStorage.setItem(KEY_PAUSED_AT, String(state.pausedAt));
      }
    } catch {
      /* quota / private mode — ignore */
    }
  }, [state]);

  // Emit a session-end event whenever we transition back to `idle`.
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
      // Cancelled before setting a target — short, untracked
      cb({
        startTime: prev.start,
        goalTime: null,
        endTime: Date.now(),
        completed: false,
        bonusSeconds: 0,
      });
    } else {
      // targeted or paused — both have a goal time
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
   * When paused, clicks are ignored — user must use Resume or Stop controls.
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

      if (prev.kind === 'paused') {
        // Ignore ring clicks when paused — use the PauseStopControl overlay
        return prev;
      }

      // Click 3 — clear. The useEffect above fires onSessionEnd.
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
   * Used by "Start now" (planned sessions) and the digital timer so we can
   * set the goal time without going through angle math.
   */
  const startWithGoal = useCallback((startMs: number, endMs: number) => {
    setState({ kind: 'targeted', start: startMs, end: endMs });
  }, []);

  /** Pause a targeted session. Freezes the countdown at the current moment. */
  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.kind !== 'targeted') return prev;
      return { kind: 'paused', start: prev.start, end: prev.end, pausedAt: Date.now() };
    });
  }, []);

  /**
   * Resume a paused session.
   * Extends `end` by the elapsed pause duration so the remaining time is
   * preserved exactly as it was when the user paused.
   */
  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.kind !== 'paused') return prev;
      const pauseDuration = Date.now() - prev.pausedAt;
      return {
        kind: 'targeted',
        start: prev.start,
        end: prev.end + pauseDuration,
      };
    });
  }, []);

  /**
   * Stop the current session immediately (any non-idle state → idle).
   * Fires onSessionEnd with completed=false unless the goal was already reached.
   */
  const stop = useCallback(() => {
    setState({ kind: 'idle' });
  }, []);

  return { state, handleClick, setDragEnd, startWithGoal, pause, resume, stop };
}
