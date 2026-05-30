import { memo, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import { useNow } from '../hooks/useNow';
import { useFocusTrack } from '../hooks/useFocusTrack';
import './FocusRing.css';

/* viewBox geometry — all values in viewBox units (0..100). */
const C = 50; // center
const RING_R = 46; // ring radius — sits outside the face (face occupies ~43)
const STROKE = 0.9;
const DROP_R = 1.4;

function polar(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

/** SVG arc path from one angle to another, going clockwise. */
function arcPath(fromAngle: number, toAngle: number, r: number): string {
  let delta = ((toAngle - fromAngle) % 360 + 360) % 360;
  if (delta < 0.3) return '';
  // Cap at just under full circle to keep the path well-defined
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

export const FocusRing = memo(function FocusRing() {
  const now = useNow('second');
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, handleClick } = useFocusTrack();

  const data = useMemo(() => {
    if (state.kind === 'idle') {
      return { start: null, end: null, head: null, elapsed: 0, target: null, complete: false };
    }

    const startMin = ((state.start / 60000) % 60 + 60) % 60;
    const startAngle = (startMin * 6) % 360;

    const elapsedMs = now.getTime() - state.start;
    const sweep = Math.min((elapsedMs / 60000) * 6, 359.5);
    const head = (startAngle + sweep) % 360;

    if (state.kind === 'tracking') {
      return { start: startAngle, end: null, head, elapsed: elapsedMs, target: null, complete: false };
    }

    const endMin = ((state.end / 60000) % 60 + 60) % 60;
    const endAngle = (endMin * 6) % 360;
    const targetMs = state.end - state.start;
    const complete = elapsedMs >= targetMs;
    const cappedHead = complete ? endAngle : head;
    return {
      start: startAngle,
      end: endAngle,
      head: cappedHead,
      elapsed: elapsedMs,
      target: targetMs,
      complete,
    };
  }, [state, now]);

  const onClick = (e: MouseEvent<SVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (ang < 0) ang += 360;
    handleClick(ang);
  };

  // Floating timer position — just outside the start drop, radially outward
  const timerPos =
    data.start !== null ? polar(data.start, RING_R + 5.2) : null;

  return (
    <>
      <svg
        ref={svgRef}
        className={`focus-ring ${state.kind !== 'idle' ? 'is-active' : 'is-resting'} ${data.complete ? 'is-complete' : ''}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        {/* Ghost track — always faintly visible */}
        <circle
          cx={C}
          cy={C}
          r={RING_R}
          fill="none"
          className="track"
          strokeWidth={STROKE * 0.65}
          strokeDasharray="0.6 1.2"
        />

        {/* To-do ghost arc (only in targeted state, before completion) */}
        {data.end !== null && data.head !== null && !data.complete && (
          <path
            d={arcPath(data.head, data.end, RING_R)}
            className="todo"
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* Progress arc — start to head */}
        {data.start !== null && data.head !== null && (
          <path
            d={arcPath(data.start, data.head, RING_R)}
            className="progress"
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}

        {/* Start drop — filled circle */}
        {data.start !== null && (() => {
          const p = polar(data.start, RING_R);
          return (
            <circle cx={p.x} cy={p.y} r={DROP_R} className="drop drop-start" />
          );
        })()}

        {/* End drop — open ring */}
        {data.end !== null && (() => {
          const p = polar(data.end, RING_R);
          return (
            <circle
              cx={p.x}
              cy={p.y}
              r={DROP_R}
              className="drop drop-end"
              fill="none"
              strokeWidth={STROKE * 1.2}
            />
          );
        })()}

        {/* Leading head — the "now" drop, gently pulses */}
        {data.head !== null && !data.complete && (() => {
          const p = polar(data.head, RING_R);
          return (
            <circle cx={p.x} cy={p.y} r={DROP_R * 0.78} className="drop drop-head" />
          );
        })()}

        {/* Hit area — only the stroke is clickable */}
        <circle
          cx={C}
          cy={C}
          r={RING_R}
          className="hit"
          fill="none"
          stroke="transparent"
          strokeWidth={5}
          onClick={onClick}
        />
      </svg>

      {/* Floating elapsed timer — small, muted, never aggressive */}
      {data.start !== null && timerPos && (
        <div
          className="focus-timer"
          style={{ left: `${timerPos.x}%`, top: `${timerPos.y}%` }}
          aria-live="off"
        >
          <span className="focus-timer__elapsed">{fmt(data.elapsed)}</span>
          {data.target !== null && (
            <span className="focus-timer__target">/{fmt(data.target)}</span>
          )}
        </div>
      )}
    </>
  );
});
