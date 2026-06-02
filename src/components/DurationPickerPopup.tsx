import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { tick as hapticTick } from '../lib/haptic';
import { getPickerPos } from '../lib/pickerUtils';
import { fmtDuration } from '../lib/planStore';
import '../styles/pickers.css';
import './DurationPickerPopup.css';

const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];

interface Props {
  value: string; // minutes as string
  onChange: (minutes: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export function DurationPickerPopup({ value, onChange, onClose, anchorEl }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const pos = getPickerPos(anchorEl, 180, Math.min(DURATIONS.length * 44 + 16, 320));

  return createPortal(
    <>
      <div className="picker-backdrop" onClick={onClose} />
      <div
        className="picker-popup duration-picker"
        style={{ left: pos.left, top: pos.top, width: 180 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="duration-picker__list">
          {DURATIONS.map(min => {
            const isActive = String(min) === value;
            return (
              <button
                key={min}
                className={`duration-picker__item${isActive ? ' is-active' : ''}`}
                onClick={() => {
                  hapticTick();
                  onChange(String(min));
                  onClose();
                }}
              >
                <span>{fmtDuration(min)}</span>
                {isActive && (
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}
