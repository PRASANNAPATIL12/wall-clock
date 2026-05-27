import { memo } from 'react';
import { useNow } from '../hooks/useNow';
import { getZonedTime } from '../lib/timezones';
import './DigitalClock.css';

interface Props {
  timezone: string;
  format: '12' | '24';
}

const pad = (n: number) => String(n).padStart(2, '0');

export const DigitalClock = memo(function DigitalClock({ timezone, format }: Props) {
  const now = useNow('second');
  const { hours: h24, minutes, seconds } = getZonedTime(now, timezone);

  let displayHours = h24;
  let suffix: string | null = null;
  if (format === '12') {
    suffix = h24 >= 12 ? 'PM' : 'AM';
    displayHours = h24 % 12 === 0 ? 12 : h24 % 12;
  }

  return (
    <div className="digital" role="timer" aria-live="off" aria-label="Digital clock">
      <span className="d-hr">{pad(displayHours)}</span>
      <span className="d-sep">:</span>
      <span className="d-min">{pad(minutes)}</span>
      <span className="d-sep">:</span>
      <span className="d-sec">{pad(seconds)}</span>
      {suffix && <span className="d-suffix">{suffix}</span>}
    </div>
  );
});
