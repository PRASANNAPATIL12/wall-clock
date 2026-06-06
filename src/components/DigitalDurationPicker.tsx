import { createPortal } from 'react-dom';
import { useState } from 'react';
import './DigitalDurationPicker.css';

interface Props {
  onPick: (durationMs: number) => void;
  onCancel: () => void;
}

const PRESETS = [
  { label: '25m',  ms: 25 * 60_000 },
  { label: '45m',  ms: 45 * 60_000 },
  { label: '1h',   ms: 60 * 60_000 },
  { label: '90m',  ms: 90 * 60_000 },
  { label: '2h',   ms: 120 * 60_000 },
] as const;

/**
 * DigitalDurationPicker — bottom-center glass pill for the digital timer flow.
 *
 * Shows after the user picks a tag in digital mode. Offers 5 preset durations
 * plus a custom minute input. Portal-rendered to body.
 */
export function DigitalDurationPicker({ onPick, onCancel }: Props) {
  const [customMin, setCustomMin] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = () => {
    const n = parseInt(customMin, 10);
    if (n > 0 && n <= 720) {
      onPick(n * 60_000);
    }
  };

  return createPortal(
    <div className="dur-picker" role="group" aria-label="Choose focus duration">
      <span className="dur-picker__label">How long?</span>

      <div className="dur-picker__presets">
        {PRESETS.map(({ label, ms }) => (
          <button
            key={label}
            type="button"
            className="dur-picker__btn"
            onClick={() => onPick(ms)}
          >
            {label}
          </button>
        ))}

        {!showCustom ? (
          <button
            type="button"
            className="dur-picker__btn dur-picker__btn--custom"
            onClick={() => setShowCustom(true)}
          >
            Custom
          </button>
        ) : (
          <span className="dur-picker__custom-wrap">
            <input
              className="dur-picker__custom-input"
              type="number"
              min={1}
              max={720}
              placeholder="min"
              value={customMin}
              autoFocus
              onChange={(e) => setCustomMin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
                if (e.key === 'Escape') { setShowCustom(false); setCustomMin(''); }
              }}
            />
            <button
              type="button"
              className="dur-picker__btn dur-picker__btn--go"
              onClick={handleCustomSubmit}
            >
              Go
            </button>
          </span>
        )}
      </div>

      <button
        type="button"
        className="dur-picker__cancel"
        onClick={onCancel}
        aria-label="Cancel"
        title="Cancel"
      >
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
          stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
