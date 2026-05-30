import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useNow } from '../hooks/useNow';
import { useFocusTrack } from '../hooks/useFocusTrack';
import { getZonedTime } from '../lib/timezones';
import { tick as hapticTick, prepareHaptic, celebrate } from '../lib/haptic';
import { OnboardingHint } from './OnboardingHint';
import './FocusRing.css';

interface Props {
  timezone: string;
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

export const FocusRing = memo(function FocusRing({ timezone }: Props) {
  const now = useNow('second');
  const svgRef = useRef<SVGSVGElement>(null);
  const endDropRef = useRef<SVGCircleElement>(null);
  const { state, handleClick, setDragEnd } = useFocusTrack(timezone);

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
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
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

        {/* To-do ghost arc — pre-target only */}
        {data.end !== null && data.head !== null && !data.complete && (
          <path
            d={arcPath(data.head, data.end, RING_R)}
            className="todo"
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* Goal arc — start to current (pre-target) or start to end (post-target) */}
        {data.start !== null && data.goalEnd !== null && (
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

      {/* Onboarding hint — whispers to first-time users that the ring is
          interactive. Each state's hint shows at most once per user, then
          never again. Independent of every other ring element. */}
      <OnboardingHint state={state} />
    </>
  );
});
