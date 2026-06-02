import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScrollPicker } from './ScrollPicker';
import { getPickerPos } from '../lib/pickerUtils';
import '../styles/pickers.css';
import './TimePickerPopup.css';

// Hour items 01–12
const HOUR_ITEMS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: String(h), label: String(h).padStart(2, '0') };
});

// Minute items 00, 15, 30, 45
const MINUTE_ITEMS = ['00','15','30','45'].map(m => ({ value: m, label: m }));

/** Parse 24h "HH:MM:00" → { hour12, minute, period } */
function parse24(s: string): { hour12: string; minute: string; period: 'AM'|'PM' } {
  const [hh, mm] = s.split(':').map(Number);
  const period = (hh ?? 0) < 12 ? 'AM' : 'PM';
  const h12 = (hh ?? 0) === 0 ? 12 : (hh ?? 0) > 12 ? (hh ?? 0) - 12 : (hh ?? 0);
  // Snap minute to nearest quarter
  const roundedMin = [0,15,30,45].reduce((a,b) => Math.abs(b-(mm??0)) < Math.abs(a-(mm??0)) ? b : a);
  return { hour12: String(h12), minute: String(roundedMin).padStart(2,'0'), period };
}

/** Combine back to 24h "HH:MM:00" */
function to24(hour12: string, minute: string, period: 'AM'|'PM'): string {
  let h = parseInt(hour12, 10);
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2,'0')}:${minute}:00`;
}

interface Props {
  value: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  anchorEl: HTMLElement | null;
}

export function TimePickerPopup({ value, onConfirm, onCancel, anchorEl }: Props) {
  const init = useMemo(() => parse24(value || '08:00:00'), [value]);
  const [hour12, setHour12]   = useState(init.hour12);
  const [minute, setMinute]   = useState(init.minute);
  const [period, setPeriod]   = useState<'AM'|'PM'>(init.period);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const pos = getPickerPos(anchorEl, 240, 310);
  const displayH = hour12.padStart(2,'0');
  const displayM = minute;

  return createPortal(
    <>
      <div className="picker-backdrop" onClick={onCancel} />
      <div
        className="picker-popup time-picker"
        style={{ left: pos.left, top: pos.top, width: 240 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Large time preview */}
        <div className="time-picker__preview">
          <span className={`time-picker__digit${period==='AM'?'':''}`}>{displayH}</span>
          <span className="time-picker__colon">:</span>
          <span className="time-picker__digit">{displayM}</span>
          <div className="time-picker__period">
            <button
              className={`time-picker__period-btn${period==='AM'?' is-active':''}`}
              onClick={() => setPeriod('AM')}
            >AM</button>
            <button
              className={`time-picker__period-btn${period==='PM'?' is-active':''}`}
              onClick={() => setPeriod('PM')}
            >PM</button>
          </div>
        </div>

        <div className="picker-divider" />

        {/* Two scroll drums */}
        <div className="time-picker__drums">
          <div className="time-picker__drum-col">
            <div className="time-picker__drum-label">Hour</div>
            <ScrollPicker
              items={HOUR_ITEMS}
              selected={hour12}
              onChange={setHour12}
              loop
            />
          </div>
          <div className="time-picker__drum-sep" aria-hidden />
          <div className="time-picker__drum-col">
            <div className="time-picker__drum-label">Min</div>
            <ScrollPicker
              items={MINUTE_ITEMS}
              selected={minute}
              onChange={setMinute}
              loop
            />
          </div>
        </div>

        <div className="picker-footer">
          <button className="picker-btn picker-btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className="picker-btn picker-btn--primary"
            onClick={() => onConfirm(to24(hour12, minute, period))}
          >
            OK
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
