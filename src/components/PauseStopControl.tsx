import { createPortal } from 'react-dom';
import type { FocusState } from '../hooks/useFocusTrack';
import './PauseStopControl.css';

interface Props {
  state: FocusState;
  onPause:  () => void;
  onResume: () => void;
  onStop:   () => void;
}

/**
 * PauseStopControl — glass pill fixed at bottom-centre, above TodaySummary.
 *
 * Shows when state = 'targeted' (can pause or stop) or 'paused' (can resume or stop).
 * Idles-fades like other bottom controls.
 * Portal-rendered to document.body so z-index is evaluated at the root
 * stacking context (above mode-layer opacity transitions).
 */
export function PauseStopControl({ state, onPause, onResume, onStop }: Props) {
  if (state.kind !== 'targeted' && state.kind !== 'paused') return null;

  const isPaused = state.kind === 'paused';

  return createPortal(
    <div className="pause-stop-control" role="group" aria-label="Session controls">
      {/* Pause / Resume toggle */}
      <button
        className={`pause-stop-control__btn pause-stop-control__btn--primary${isPaused ? ' is-paused' : ''}`}
        type="button"
        onClick={isPaused ? onResume : onPause}
        aria-label={isPaused ? 'Resume session' : 'Pause session'}
        title={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? (
          /* Resume — play triangle */
          <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          /* Pause — two bars */
          <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        )}
        <span>{isPaused ? 'Resume' : 'Pause'}</span>
      </button>

      <span className="pause-stop-control__sep" aria-hidden />

      {/* Stop */}
      <button
        className="pause-stop-control__btn pause-stop-control__btn--stop"
        type="button"
        onClick={onStop}
        aria-label="Stop session"
        title="Stop"
      >
        <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
        <span>Stop</span>
      </button>
    </div>,
    document.body,
  );
}
