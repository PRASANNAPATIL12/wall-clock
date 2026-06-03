import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PointerEvent } from 'react';
import { useNow } from '../hooks/useNow';
import { useFocusTrack, type FocusSessionEnd } from '../hooks/useFocusTrack';
import { getZonedTime } from '../lib/timezones';
import { tick as hapticTick, prepareHaptic, celebrate } from '../lib/haptic';
import { saveSession } from '../lib/sessionStore';
import { markPlannedComplete } from '../lib/planStore';
import type { PlannedSession } from '../lib/planStore';
import { OnboardingHint } from './OnboardingHint';
import { useOnboardingHint } from '../hooks/useOnboardingHint';
import { TagPicker } from './TagPicker';
import { TagIcon } from './TagIcon';
import { getTag } from '../lib/tags';
import { PlannedRingsLayer, RingsTooltipCard, type RingsTooltip } from './PlannedRingsLayer';
import { useUpcomingPlanned } from '../hooks/usePlannedSessions';
import { FocusMessage } from './FocusMessage';
import './PlannedRings.css';
import './FocusRing.css';

interface Props {
  timezone: string;
  /** Supabase user id, or null when not signed in. When null, sessions
   *  are not persisted — the clock + focus ring still work fully. */
  userId: string | null;
  /** Called after a session is saved so the host can refresh stats. */
  onSessionSaved?: () => void;
  /** Opens Settings → Tags pane (for the TagPicker "manage" button). */
  onManageTags?: () => void;
  /** Extra ms to extend the first onboarding hint while the hero message types. */
  hintBoostMs?: number;
  /** Bump to refresh upcoming planned sessions. */
  planRefreshKey?: number;
  schedulingViewOpen?: boolean;
  todayOnly?: boolean;
  onScheduleClose?: () => void;
  /** Called when a planned session is marked complete so the ring refresh fires. */
  onPlanSessionCompleted?: () => void;
}

/* viewBox geometry — all values in viewBox units (0..100). */
const C = 50;
const RING_R = 46;
const STROKE = 0.9;
const DROP_R = 1.4;
/** Generous hit band — ~50 px on a 620 px clock, ~30 px on a 380 px clock. */
const HIT_STROKE = 10;

function polar(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

/** SVG arc path from one angle to another, going clockwise. */
function arcPath(fromAngle: number, toAngle: number, r: number): string {
  let delta = (((toAngle - fromAngle) % 360) + 360) % 360;
  if (delta < 0.3) return '';
  if (delta > 359.5) delta = 359.5;
  const from = polar(fromAngle, r);
  const to = polar(fromAngle + delta, r);
  const largeArc = delta > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 1 ${to.x} ${to.y}`;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const FocusRing = memo(function FocusRing({
  timezone,
  userId,
  onSessionSaved,
  onManageTags,
  hintBoostMs = 0,
  planRefreshKey = 0,
  schedulingViewOpen = false,
  todayOnly = false,
  onScheduleClose,
  onPlanSessionCompleted,
}: Props) {
  const now = useNow('second');
  const svgRef = useRef<SVGSVGElement>(null);
  const endDropRef = useRef<SVGCircleElement>(null);

  // Hold refs to the latest userId and current session tag so the
  // session-end callback always reads the current values without needing
  // to be recreated on each render.
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Tag for the current session — set by the TagPicker that appears on
  // click 2. Null until the user picks one (or auto-dismisses).
  const [sessionTag, setSessionTag] = useState<string | null>(null);
  const sessionTagRef = useRef<string | null>(null);
  useEffect(() => {
    sessionTagRef.current = sessionTag;
  }, [sessionTag]);

  // Whether the TagPicker is currently open. Opens on click 2 if signed in,
  // closes on selection / auto-dismiss / session end.
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const handleSessionEnd = useCallback(
    (s: FocusSessionEnd) => {
      const uid        = userIdRef.current;
      const tag        = sessionTagRef.current;
      const activePlan = activePlanSessionRef.current;

      // Reset all session-scoped state regardless of save outcome
      setSessionTag(null);
      setTagPickerOpen(false);
      setActivePlanSession(null);
      activePlanSessionRef.current = null;
      setPlanCompleting(false);
      planCompletionFiredRef.current = false;

      if (!uid) return; // anonymous — nothing to persist
      saveSession({
        userId: uid,
        startTime: s.startTime,
        goalTime: s.goalTime,
        endTime: s.endTime,
        completed: s.completed,
        bonusSeconds: s.bonusSeconds,
        tag,
        timezone,
      })
        .then(() => {
          onSessionSaved?.();
          // If this was a planned session, mark it complete in Supabase
          if (activePlan) {
            markPlannedComplete(activePlan.id).then(() => {
              onPlanSessionCompleted?.();
            });
          }
        })
        .catch(() => { /* sessionStore already logs */ });
    },
    [timezone, onSessionSaved, onPlanSessionCompleted],
  );

  const { state, handleClick, setDragEnd, startWithGoal } = useFocusTrack(timezone, handleSessionEnd);

  /* ---- Planned session "Start now" state ---- */
  /** The planned session currently running as a countdown arc. null = free session. */
  const [activePlanSession,  setActivePlanSession]  = useState<PlannedSession | null>(null);
  const activePlanSessionRef = useRef<PlannedSession | null>(null);
  useEffect(() => { activePlanSessionRef.current = activePlanSession; }, [activePlanSession]);

  /** True while the vanish animation is playing after goal reached. */
  const [planCompleting, setPlanCompleting] = useState(false);
  /** Guards so the auto-end fires only once per planned session. */
  const planCompletionFiredRef = useRef(false);

  // Upcoming planned sessions for the concentric rings view.
  // When todayOnly=true we filter the map to just today's entry so a single
  // ring renders (instead of all future days as concentric rings).
  const { byDay: _plannedByDay } = useUpcomingPlanned(userId, planRefreshKey);
  const plannedByDay = useMemo(() => {
    // When a planned session is active, show ONLY that arc (today key, single entry)
    if (activePlanSession) {
      const d   = new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return new Map([[key, [activePlanSession]]]);
    }
    if (!todayOnly) return _plannedByDay;
    const d      = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const m = new Map(_plannedByDay);
    for (const k of m.keys()) { if (k !== todayKey) m.delete(k); }
    return m;
  }, [_plannedByDay, todayOnly, activePlanSession]);

  // Tooltip state for the rings view
  const [ringsTooltip, setRingsTooltip] = useState<RingsTooltip | null>(null);

  // Close scheduling view when user clicks anywhere outside the .analog container.
  // The backdrop is pointer-events:none so it won't block ring hover events.
  // When a planned session countdown is active, do NOT close on outside click.
  useEffect(() => {
    if (!schedulingViewOpen && !activePlanSession) return;
    const handle = (e: MouseEvent) => {
      if (activePlanSession) return; // countdown is running — don't close
      const analog = svgRef.current?.closest('.analog');
      if (analog && analog.contains(e.target as Node)) return;
      setRingsTooltip(null);
      onScheduleClose?.();
    };
    // Small delay so this listener doesn't fire on the same click that opened the view
    const t = window.setTimeout(() => document.addEventListener('click', handle), 50);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('click', handle);
    };
  }, [schedulingViewOpen, onScheduleClose]);

  /* Onboarding hint — lifted here so FocusRing can add ring glow class.
   * Anonymous (userId=null): hints show on every visit (alwaysShow=true).
   * Logged-in: hints show only once (alwaysShow=false, localStorage used).
   * hintBoostMs extends the idle-hint visibility while the hero message plays. */
  const { visible: hintVisible, hintKind } = useOnboardingHint(state, userId === null, hintBoostMs);
  /** Ring pulses for ALL three hints, not just the first. */
  const showingAnyHint = hintVisible;

  // Open the TagPicker exactly once per session, when click 2 just landed
  // (state becomes 'targeted' and we don't already have a tag). Closes
  // automatically when state leaves 'targeted' or when the user picks/skips.
  const prevKindRef = useRef(state.kind);
  useEffect(() => {
    const prev = prevKindRef.current;
    prevKindRef.current = state.kind;
    // Only react to the tracking→targeted transition; ignore drag updates
    // (which keep state.kind == 'targeted' across renders).
    if (prev !== 'targeted' && state.kind === 'targeted') {
      if (userIdRef.current && sessionTagRef.current === null) {
        setTagPickerOpen(true);
      }
    }
    if (state.kind === 'idle') {
      // Make sure picker is closed even if the user clicked through quickly.
      setTagPickerOpen(false);
    }
  }, [state.kind]);

  // Convert a pointer-event client position into the angular position on
  // the focus ring (0° = top / 12, clockwise). Used by both the click
  // handler and the drag handler.
  const computeAngle = useCallback(
    (clientX: number, clientY: number): number => {
      if (!svgRef.current) return 0;
      const rect = svgRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      let ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (ang < 0) ang += 360;
      return ang;
    },
    [],
  );

  // Drag-end-point feedback: pulse the end-drop circle on each minute
  // crossing using Web Animations API (restarts cleanly per call, so fast
  // drags get visible feedback at every minute boundary).
  const pulseEndDrop = useCallback(() => {
    const el = endDropRef.current;
    if (!el) return;
    try {
      el.animate(
        [
          { r: '1.4' },
          { r: '1.85', easing: 'cubic-bezier(0.4, 0, 0.2, 1)', offset: 0.4 },
          { r: '1.4' },
        ],
        { duration: 160, fill: 'forwards' },
      );
    } catch {
      /* Web Animations API unsupported — graceful degrade */
    }
  }, []);

  // Drag state for the end-point circle.
  const [dragging, setDragging] = useState(false);
  const lastDragMinuteRef = useRef<number>(-1);

  // Hover state for the end-drop tooltip (logged-in, tag selected)
  const [endDropHovered, setEndDropHovered] = useState(false);

  // ---- Subtle in-face feedback messages --------------------------------
  const [feedback, setFeedback] = useState<{ text: string; key: number; duration: number } | null>(null);
  const feedbackTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Sequential hint timers after click-2 (drag hint + clear hint). */
  const hintSeqTimersRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** True once the first drag-release message has been shown this session. */
  const dragUpdateShownRef     = useRef(false);
  /** Tracks tagPickerOpen previous value to detect close transition. */
  const prevTagPickerOpenRef   = useRef(false);
  /** Tracks state.kind previous value for transition detection. */
  const prevStateKindForMsgRef = useRef(state.kind);

  /** Show a message and auto-unmount it after duration + 200ms fade buffer. */
  const showFeedback = useCallback((text: string, duration: number) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ text, key: Date.now(), duration });
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), duration + 200);
  }, []);

  /** Cancel any queued sequential hints (e.g. on session clear). */
  const clearHintSeq = useCallback(() => {
    hintSeqTimersRef.current.forEach(t => clearTimeout(t));
    hintSeqTimersRef.current = [];
  }, []);

  /**
   * After click-2 goal is set, run an instructional sequence:
   *   t=0      "Goal set · X min"          3.5 s
   *   t=4 s    "Drag to adjust end time"   3 s   (always — teaches affordance)
   *   t=7.5 s  "Click once more to clear"  3 s   (always — teaches click-3)
   *
   * The user can drag at any point; the drag-release "End time updated"
   * message fires independently via the first-drag guard.
   */
  const startGoalHintSeq = useCallback((goalMsg: string) => {
    clearHintSeq();
    showFeedback(goalMsg, 3500);

    const t1 = setTimeout(() => {
      // Only show drag hint if the user hasn't already dragged.
      // If they dragged within the first 4s, they already know how — don't
      // tell them to do something they just finished doing.
      if (!dragUpdateShownRef.current) {
        showFeedback('Drag to adjust end time', 3000);
      }

      const t2 = setTimeout(() => {
        showFeedback('Click once more to clear', 3000);
      }, dragUpdateShownRef.current ? 500 : 3500); // shorter gap if drag hint was skipped
      hintSeqTimersRef.current.push(t2);
    }, 4000); // 0.5 s gap after goal msg ends
    hintSeqTimersRef.current.push(t1);
  }, [clearHintSeq, showFeedback]);

  // Message: Tracking started / Session cleared
  useEffect(() => {
    const prev = prevStateKindForMsgRef.current;
    prevStateKindForMsgRef.current = state.kind;

    // Click 1: idle → tracking
    if (prev === 'idle' && state.kind === 'tracking') {
      showFeedback('Tracking started', 3000);
    }

    // Click 2: tracking → targeted (anonymous user — no tag picker)
    if (prev !== 'targeted' && state.kind === 'targeted' && !userIdRef.current) {
      const mins = Math.round((state.end - state.start) / 60000);
      if (mins > 0) startGoalHintSeq(`Goal set · ${mins} min`);
    }

    // Click 3: any → idle (session cleared)
    if (prev !== 'idle' && state.kind === 'idle') {
      clearHintSeq();
      showFeedback('Session cleared', 2000);
    }
  }, [state, showFeedback, startGoalHintSeq, clearHintSeq]);

  // Click 2 for logged-in users: goal hint sequence fires when tag picker closes
  useEffect(() => {
    const wasOpen = prevTagPickerOpenRef.current;
    prevTagPickerOpenRef.current = tagPickerOpen;

    if (wasOpen && !tagPickerOpen && state.kind === 'targeted' && userIdRef.current) {
      const mins = Math.round((state.end - state.start) / 60000);
      if (mins > 0) startGoalHintSeq(`Goal set · ${mins} min`);
    }
  }, [tagPickerOpen, state, startGoalHintSeq]);
  // -----------------------------------------------------------------------

  /* ---- Current hour-hand angle — same coordinate system as planned arc paths ---- */
  const currentHourAngle = useMemo(() => {
    const { hours, minutes, seconds } = getZonedTime(now, timezone);
    return ((hours % 12) + minutes / 60 + seconds / 3600) * 30;
  }, [now, timezone]);

  /* ---- "Start now" from a planned session ---- */
  const startFromPlan = useCallback((session: PlannedSession) => {
    if (state.kind !== 'idle') return; // block if already tracking

    const nowMs = Date.now();

    // Compute planned end as absolute timestamp (today's date + planned end time)
    const [hhStr, mmStr] = session.start_time_local.split(':');
    const startH  = parseInt(hhStr ?? '0', 10);
    const startM  = parseInt(mmStr ?? '0', 10);
    const today   = new Date();
    const planned = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(),
      startH, startM + session.duration_minutes,
    );
    // If planned end is already past, give full duration from now (late start)
    const endMs = planned.getTime() > nowMs
      ? planned.getTime()
      : nowMs + session.duration_minutes * 60_000;

    // Transition directly to 'targeted' (skip the click-1/click-2 dance)
    startWithGoal(nowMs, endMs);

    // Set session metadata
    setActivePlanSession(session);
    activePlanSessionRef.current = session;
    setSessionTag(session.tag ?? null);
    planCompletionFiredRef.current = false;
    setTagPickerOpen(false);
    setRingsTooltip(null);

    // Pre-warm audio context
    prepareHaptic();
    showFeedback('Session started', 2000);
  }, [state.kind, startWithGoal, showFeedback]);

  const data = useMemo(() => {
    if (state.kind === 'idle') {
      return {
        start: null as number | null,
        end: null as number | null,
        goalEnd: null as number | null,
        bonusHead: null as number | null,
        head: null as number | null,
        elapsed: 0,
        target: null as number | null,
        bonus: 0,
        complete: false,
        lap: 1,
      };
    }

    const startZt = getZonedTime(new Date(state.start), timezone);
    const startAngle = ((startZt.minutes + startZt.seconds / 60) * 6) % 360;
    const elapsedMs = now.getTime() - state.start;
    const sweep = (elapsedMs / 60000) * 6;
    const realHead = (startAngle + sweep) % 360;
    const lap = Math.floor(elapsedMs / 3_600_000) + 1;

    if (state.kind === 'tracking') {
      return {
        start: startAngle,
        end: null,
        goalEnd: realHead,
        bonusHead: null,
        head: realHead,
        elapsed: elapsedMs,
        target: null,
        bonus: 0,
        complete: false,
        lap,
      };
    }

    const endZt = getZonedTime(new Date(state.end), timezone);
    const endAngle = ((endZt.minutes + endZt.seconds / 60) * 6) % 360;
    const targetMs = state.end - state.start;
    const complete = elapsedMs >= targetMs;

    if (!complete) {
      return {
        start: startAngle,
        end: endAngle,
        goalEnd: realHead,
        bonusHead: null,
        head: realHead,
        elapsed: elapsedMs,
        target: targetMs,
        bonus: 0,
        complete: false,
        lap,
      };
    }

    // Past target — goal arc is full (start→end), bonus arc grows past end.
    const bonusMs = elapsedMs - targetMs;
    const bonusDeg = Math.min((bonusMs / 60_000) * 6, 359.5);
    const bonusArcEnd = (endAngle + bonusDeg) % 360;

    return {
      start: startAngle,
      end: endAngle,
      goalEnd: endAngle,
      bonusHead: bonusArcEnd,
      head: realHead, // drop head always follows the real minute hand
      elapsed: elapsedMs,
      target: targetMs,
      bonus: bonusMs,
      complete: true,
      lap,
    };
  }, [state, now, timezone]);

  /* Comet animation — when a session is freshly started (idle → tracking via a
     click), a small head + fading tail orbits once from the click angle to the
     current minute-hand angle. Brief flourish, ~800 ms, then disappears. */
  const [comet, setComet] = useState<
    { from: number; to: number; key: number } | null
  >(null);
  useEffect(() => {
    if (!comet) return;
    const t = window.setTimeout(() => setComet(null), 2000);
    return () => window.clearTimeout(t);
  }, [comet]);

  /* Fire celebration animations once, on the false→true transition for `complete`.
     Won't replay on page refresh because we initialize the ref to the current
     value on first run. */
  const [celebrating, setCelebrating] = useState(false);
  const prevCompleteRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevCompleteRef.current === null) {
      prevCompleteRef.current = data.complete;
      return;
    }
    if (data.complete && !prevCompleteRef.current) {
      setCelebrating(true);
      // Audio + vibration chime to mark the goal-achievement moment.
      // The AudioContext was pre-warmed during the user's initial ring
      // interaction (see prepareHaptic in onPointerDown), so this fires
      // even though the completion itself is a passive time-based event.
      celebrate();
      const t = window.setTimeout(() => setCelebrating(false), 2200);
      prevCompleteRef.current = data.complete;
      return () => window.clearTimeout(t);
    }
    prevCompleteRef.current = data.complete;
  }, [data.complete]);

  /* ---- Auto-complete when goal reached during a planned session ----
   * data is now declared — safe to reference data.complete here.        */
  useEffect(() => {
    if (!activePlanSession || planCompletionFiredRef.current) return;
    if (!data.complete) return;

    planCompletionFiredRef.current = true;
    setPlanCompleting(true);

    // Auto-trigger click-3 (end session) after celebration has started
    const endT   = window.setTimeout(() => handleClick(0), 1_800);
    // Clear completing state after vanish animation finishes
    const clearT = window.setTimeout(() => setPlanCompleting(false), 2_200);
    return () => { window.clearTimeout(endT); window.clearTimeout(clearT); };
  }, [data.complete, activePlanSession, handleClick]);

  const onPointerDown = (e: PointerEvent<SVGElement>) => {
    const ang = computeAngle(e.clientX, e.clientY);

    // Pre-warm the AudioContext during this user gesture, so the
    // goal-achievement chime (which fires later from a time-based event,
    // not a gesture) can produce sound without being blocked by Chrome's
    // autoplay policy.
    prepareHaptic();

    // Fire the comet only when transitioning from idle → tracking (click 1).
    if (state.kind === 'idle') {
      const zt = getZonedTime(new Date(), timezone);
      const minAng = ((zt.minutes + zt.seconds / 60) * 6) % 360;
      // Comet runs at least one full revolution clockwise from click angle,
      // ending at the minute-hand angle.
      const cwDistance = ((minAng - ang) % 360 + 360) % 360;
      setComet({ from: ang, to: ang + 360 + cwDistance, key: Date.now() });
    }

    handleClick(ang);
  };

  /**
   * Pointer-down on the end-drop circle: enter drag mode.
   *
   * The drag's pointermove/pointerup/pointercancel listeners are installed
   * SYNCHRONOUSLY inside this handler — NOT inside a useEffect.
   *
   * Why this matters on mobile: a useEffect runs *after* React renders,
   * which runs *after* this event handler returns. Between the pointer-
   * down and the effect firing, the browser can already see the first
   * pointermove without any listener present — and touch UAs treat
   * un-handled pointermoves as "this is a scroll gesture", which causes
   * them to fire pointercancel and kill the drag after exactly one tick.
   * Installing listeners inside this handler guarantees they exist before
   * any move can fire.
   */
  const onEndDropPointerDown = (e: PointerEvent<SVGCircleElement>) => {
    if (state.kind !== 'targeted') return;
    e.stopPropagation();
    e.preventDefault();

    // Warm up the AudioContext inside the user gesture.
    prepareHaptic();

    const startAng = computeAngle(e.clientX, e.clientY);
    lastDragMinuteRef.current = Math.floor(startAng / 6) % 60;
    setDragging(true);

    // No message on drag-start — the automatic hint sequence already shows
    // "Drag to adjust end time" as part of the post-click-2 instruction flow.

    const pointerId = e.pointerId;
    const target = e.target as Element;
    try {
      target.setPointerCapture?.(pointerId);
    } catch {
      /* unsupported — window listeners take over */
    }

    const onMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      const a = computeAngle(ev.clientX, ev.clientY);
      const minute = Math.floor(a / 6) % 60;
      if (minute !== lastDragMinuteRef.current) {
        lastDragMinuteRef.current = minute;
        hapticTick();
        pulseEndDrop();
      }
      setDragEnd(a);
    };

    const onEnd = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      try {
        target.releasePointerCapture?.(pointerId);
      } catch {
        /* ignore */
      }
      // First drag release → "End time updated" (only once per session)
      if (!dragUpdateShownRef.current) {
        dragUpdateShownRef.current = true;
        setTimeout(() => showFeedback('End time updated', 2500), 150);
      }
    };

    // passive: false is REQUIRED — without it, preventDefault inside onMove
    // is a no-op (default for touch listeners) and the browser still claims
    // the gesture.
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  const timerPos = data.start !== null ? polar(data.start, RING_R + 4) : null;
  /* Outward direction unit vector — used to anchor the timer text
     so it extends *away* from the clock face, never over it. */
  const ox = data.start !== null ? Math.sin((data.start * Math.PI) / 180) : 0;
  const oy = data.start !== null ? -Math.cos((data.start * Math.PI) / 180) : 0;
  const ringClass = [
    'focus-ring',
    state.kind !== 'idle' ? 'is-active' : 'is-resting',
    data.complete ? 'is-complete' : '',
    celebrating ? 'is-celebrating' : '',
    comet ? 'is-comet-playing' : '',
    dragging ? 'is-dragging-end' : '',
    showingAnyHint ? 'is-hint-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  /* Keep rings overlay visible even when schedulingViewOpen is false
     if a planned session countdown is running. */
  const showRingsOverlay = schedulingViewOpen || activePlanSession !== null;
  const isInPlanSession  = activePlanSession !== null;

  return (
    <>
      {showRingsOverlay && (
        <div className="rings-backdrop" style={{ pointerEvents: 'none' }} />
      )}

      <svg
        ref={svgRef}
        className={ringClass}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        {/* Ghost track — always there, faintly */}
        <circle
          cx={C}
          cy={C}
          r={RING_R}
          fill="none"
          className="track"
          strokeWidth={STROKE * 0.65}
          strokeDasharray="0.6 1.2"
        />

        {/* Concentric day rings — visible during schedule view OR active plan countdown */}
        {showRingsOverlay && (
          <PlannedRingsLayer
            sessionsByDay={plannedByDay}
            C={C}
            svgEl={svgRef.current}
            onTooltip={setRingsTooltip}
            activePlanId={activePlanSession?.id ?? null}
            currentHourAngle={currentHourAngle}
            completingPlanId={planCompleting ? (activePlanSession?.id ?? null) : null}
          />
        )}

        {/* To-do ghost arc — hidden during plan countdown (countdown arc takes over) */}
        {data.end !== null && data.head !== null && !data.complete && !isInPlanSession && (
          <path
            d={arcPath(data.head, data.end, RING_R)}
            className="todo"
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* Goal arc — hidden during plan countdown (countdown arc is the visual) */}
        {data.start !== null && data.goalEnd !== null && !isInPlanSession && (
          <path
            d={arcPath(data.start, data.goalEnd, RING_R)}
            className="progress goal"
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* Bonus arc — only after target reached */}
        {data.complete && data.end !== null && data.bonusHead !== null && (
          <path
            d={arcPath(data.end, data.bonusHead, RING_R)}
            className="progress bonus"
            fill="none"
            strokeWidth={STROKE * 1.15}
            strokeLinecap="round"
          />
        )}

        {/* Start drop */}
        {data.start !== null &&
          (() => {
            const p = polar(data.start, RING_R);
            return <circle cx={p.x} cy={p.y} r={DROP_R} className="drop drop-start" />;
          })()}

        {/* End drop is rendered AFTER the main hit area below — see comment
            there. Removed from this slot in the DOM. */}

        {/* Drop head — current minute hand position */}
        {data.head !== null &&
          (() => {
            const p = polar(data.head, RING_R);
            return <circle cx={p.x} cy={p.y} r={DROP_R * 0.78} className="drop drop-head" />;
          })()}

        {/* Completion ripples — render only during the 2.2s celebration */}
        {celebrating &&
          data.end !== null &&
          (() => {
            const p = polar(data.end, RING_R);
            return (
              <>
                <circle cx={p.x} cy={p.y} className="ripple ripple-1" fill="none" />
                <circle cx={p.x} cy={p.y} className="ripple ripple-2" fill="none" />
              </>
            );
          })()}

        {/* Comet — one-shot orbit on session start.
            Four stacked tail arcs of decreasing length, thickness, and opacity
            create a properly tapered comet silhouette: dense at the leading
            edge, fading to nothing at the far end. No head circle — the
            rounded line-cap at the leading edge IS the head. */}
        {comet && (
          <g
            key={comet.key}
            className="comet"
            style={
              {
                '--from': `${comet.from}deg`,
                '--to': `${comet.to}deg`,
              } as React.CSSProperties
            }
          >
            <path d={arcPath(-38, 0, RING_R)} className="comet-tail comet-tail--4" fill="none" />
            <path d={arcPath(-26, 0, RING_R)} className="comet-tail comet-tail--3" fill="none" />
            <path d={arcPath(-16, 0, RING_R)} className="comet-tail comet-tail--2" fill="none" />
            <path d={arcPath(-8,  0, RING_R)} className="comet-tail comet-tail--1" fill="none" />
          </g>
        )}

        {/* Hit band — generous, only stroke catches pointer */}
        <circle
          cx={C}
          cy={C}
          r={RING_R}
          className="hit"
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_STROKE}
          onPointerDown={onPointerDown}
        />

        {/* End drop — rendered AFTER the main hit band so it sits ON TOP in
            DOM order. SVG hit-testing picks the topmost element, so
            pointer-downs on this circle reach the drag handler instead of
            the main ring's click handler (which would otherwise treat it
            as click-3 / reset).

            Two stacked circles at the same center:
              · A larger transparent hit zone (~12 viewBox units diameter)
                that catches pointer events. Big touch target on mobile,
                comfortable click target on desktop.
              · The visible end-drop circle on top, pointer-events: none —
                doesn't catch events itself (those pass through to the hit
                zone below); just renders the visual marker. */}
        {data.end !== null &&
          (() => {
            const p = polar(data.end, RING_R);
            return (
              <>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={DROP_R + 4.6}
                  className={`drop-end-hit ${dragging ? 'is-dragging' : ''}`}
                  fill="transparent"
                  onPointerDown={onEndDropPointerDown}
                  onMouseEnter={() => { if (userId && sessionTag) setEndDropHovered(true); }}
                  onMouseLeave={() => setEndDropHovered(false)}
                />
                <circle
                  ref={endDropRef}
                  cx={p.x}
                  cy={p.y}
                  r={DROP_R}
                  className="drop drop-end"
                  strokeWidth={STROKE * 1.2}
                />
              </>
            );
          })()}
      </svg>

      {/* Floating timer */}
      {data.start !== null && timerPos && (
        <div
          className="focus-timer"
          style={
            {
              left: `${timerPos.x}%`,
              top: `${timerPos.y}%`,
              '--ox': ox,
              '--oy': oy,
            } as React.CSSProperties
          }
        >
          <div className="focus-timer__line">
            {!data.complete ? (
              <>
                <span className="focus-timer__elapsed">{fmt(data.elapsed)}</span>
                {data.target !== null && (
                  <span className="focus-timer__target"> /{fmt(data.target)}</span>
                )}
              </>
            ) : (
              <>
                <span className="focus-timer__elapsed">{fmt(data.target!)}</span>
                <span className="focus-timer__bonus">+{fmt(data.bonus)}</span>
              </>
            )}
          </div>
          {data.lap >= 2 && <div className="focus-timer__lap">lap {data.lap}</div>}
        </div>
      )}

      {/* Onboarding hint — anonymous users see it every visit; logged-in once */}
      <OnboardingHint visible={hintVisible} hintKind={hintKind} />

      {/* Subtle in-face feedback message — centered inside the clock face */}
      {feedback && (
        <FocusMessage
          text={feedback.text}
          duration={feedback.duration}
          msgKey={feedback.key}
        />
      )}

      {/* Rings tooltip — glass pill above hovered/tapped segment.
          onStartPlan is omitted when a session is already running so the
          button disappears once countdown begins.
          onMouseEnter/Leave bridge the hover gap between arc and tooltip
          so the user can move the mouse from arc to "Start now" button. */}
      {ringsTooltip && (
        <RingsTooltipCard
          tooltip={ringsTooltip}
          onStartPlan={state.kind === 'idle' ? startFromPlan : undefined}
          onMouseEnter={() => { /* cancel any pending hide from arc onLeave */ }}
          onMouseLeave={() => setRingsTooltip(null)}
        />
      )}

      {/* End-drop tag tooltip — shows selected session tag on hover */}
      {endDropHovered && userId && sessionTag && data.end !== null && svgRef.current && (() => {
        const rect = svgRef.current!.getBoundingClientRect();
        const scale = rect.width / 100;
        const rad = ((data.end - 90) * Math.PI) / 180;
        const px = rect.left + rect.width / 2 + Math.cos(rad) * RING_R * scale;
        const py = rect.top + rect.height / 2 + Math.sin(rad) * RING_R * scale;
        const def = getTag(sessionTag);
        return (
          <div className="end-drop-tooltip" style={{ left: px, top: py }} aria-hidden>
            {def && <TagIcon def={def} size={11} />}
            <span>{def?.label ?? sessionTag}</span>
          </div>
        );
      })()}

      {/* Tag picker — rendered via portal to document.body so it escapes
          any ancestor stacking context (mode-layer opacity transition
          creates one, trapping z-index comparisons inside it). The portal
          guarantees z-index 50 is evaluated in the root stacking context,
          above ScheduleBadge (8) and TodaySummary (8) on all devices. */}
      {tagPickerOpen && createPortal(
        <TagPicker
          endAngleDeg={data.end ?? undefined}
          onPick={(tag) => {
            setSessionTag(tag);
            setTagPickerOpen(false);
          }}
          onManageTags={onManageTags}
        />,
        document.body,
      )}
    </>
  );
});
