import { memo, useMemo } from 'react';
import { useNow } from '../hooks/useNow';
import { getZonedTime } from '../lib/timezones';
import { FocusRing } from './FocusRing';
import './AnalogClock.css';

interface Props {
  timezone: string;
  userId: string | null;
  onSessionSaved?: () => void;
  onManageTags?: () => void;
  hintBoostMs?: number;
  planRefreshKey?: number;
  schedulingViewOpen?: boolean;
  onScheduleClose?: () => void;
}

const C = 50; // center of 100x100 viewbox
const NUMERAL_RADIUS = 39;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

const Ticks = memo(function Ticks() {
  const ticks = [] as JSX.Element[];
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const len = major ? 4 : 1.7;
    const stroke = major ? 0.7 : 0.25;
    const opacity = major ? 1 : 0.35;
    const outer = polar(i * 6, 47);
    const inner = polar(i * 6, 47 - len);
    ticks.push(
      <line
        key={i}
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        strokeWidth={stroke}
        strokeLinecap="round"
        opacity={opacity}
      />,
    );
  }
  return <g className="ticks">{ticks}</g>;
});

const Numerals = memo(function Numerals({ currentHour }: { currentHour: number }) {
  const nums = [] as JSX.Element[];
  for (let i = 1; i <= 12; i++) {
    const { x, y } = polar(i * 30, NUMERAL_RADIUS);
    const isCurrent = i === currentHour;
    nums.push(
      <text
        key={i}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className={`numeral${isCurrent ? ' numeral--current' : ''}`}
      >
        {i}
      </text>,
    );
  }
  return <g>{nums}</g>;
});

export const AnalogClock = memo(function AnalogClock({ timezone, userId, onSessionSaved, onManageTags, hintBoostMs, planRefreshKey, schedulingViewOpen, onScheduleClose }: Props) {
  const now = useNow('frame');
  const { hours, minutes, seconds, ms } = useMemo(
    () => getZonedTime(now, timezone),
    [now, timezone],
  );

  const secAngle = (seconds + ms / 1000) * 6;
  const minAngle = (minutes + seconds / 60) * 6;
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  // 1..12 (so midnight/noon → 12) for highlighting the current numeral
  const currentHour = hours % 12 === 0 ? 12 : hours % 12;

  return (
    /* rings-open elevates the clock above the rings backdrop (z-index:6),
       so SVG ring arcs receive pointer events even when backdrop is rendered */
    <div className={`analog${schedulingViewOpen ? ' rings-open' : ''}`}>
      <FocusRing
        timezone={timezone}
        userId={userId}
        onSessionSaved={onSessionSaved}
        onManageTags={onManageTags}
        hintBoostMs={hintBoostMs}
        planRefreshKey={planRefreshKey}
        schedulingViewOpen={schedulingViewOpen}
        onScheduleClose={onScheduleClose}
      />
      <div className="analog__face" aria-hidden>
        <svg className="analog__dial" viewBox="0 0 100 100" role="img" aria-label="Analog clock face">
          <Ticks />
          <Numerals currentHour={currentHour} />
        </svg>

        {/* Hands — each absolutely positioned, full-size SVG, rotated around its own center */}
        <svg className="hand hand--hour" viewBox="0 0 100 100" style={{ transform: `rotate(${hourAngle}deg)` }}>
          <rect x={C - 0.6} y={C - 29} width={1.2} height={32} rx={0.5} />
        </svg>

        <svg className="hand hand--minute" viewBox="0 0 100 100" style={{ transform: `rotate(${minAngle}deg)` }}>
          <rect x={C - 0.35} y={C - 43} width={0.7} height={46} rx={0.35} />
        </svg>

        <svg className="hand hand--second" viewBox="0 0 100 100" style={{ transform: `rotate(${secAngle}deg)` }}>
          <line x1={C} y1={C + 10} x2={C} y2={C - 48} strokeWidth={0.3} strokeLinecap="round" />
          <circle cx={C} cy={C + 6} r={1.4} fill="none" strokeWidth={0.35} />
        </svg>

        <div className="pivot" />
      </div>
    </div>
  );
});
