import { memo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useNow } from '../hooks/useNow';
import { getZonedTime } from '../lib/timezones';
import type { FocusState } from '../hooks/useFocusTrack';
import { getAllTags, TAGS_CHANGED_EVENT } from '../lib/tags';
import { TagIcon } from './TagIcon';
import { DigitalDurationPicker } from './DigitalDurationPicker';
import './DigitalClock.css';

/* ── FocusControls interface ─────────────────────────────────────────── */

interface FocusControls {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  startWithGoalAndTag: (startMs: number, endMs: number, tag: string | null) => void;
}

/* ── Props ────────────────────────────────────────────────────────────── */

interface Props {
  timezone: string;
  format: '12' | '24';
  /** Current focus state mirrored from FocusRing via App.tsx. */
  focusState?: FocusState;
  /** Ref to live controls from FocusRing. */
  focusControlsRef?: RefObject<FocusControls | null>;
  /** Logged-in user id. Null = anonymous (timer UI hidden). */
  userId?: string | null;
  /** Opens Settings → Tags (for the "+" tag button). */
  onManageTags?: () => void;
  /**
   * True when the digital face is the active mode.
   * Prevents portal elements (Start Focus, TagPicker) from rendering
   * when the analog face is currently shown.
   */
  isVisible?: boolean;
  /**
   * True when the concentric planning rings are open (schedule view).
   * Triggers compact mode so the clock fits inside the ring center.
   */
  schedulingViewOpen?: boolean;
}

/* ── Inline TagPicker for digital flow ───────────────────────────────── */

interface DigitalTagPickerProps {
  onPick: (tag: string | null) => void;
  onManageTags?: () => void;
  onCancel: () => void;
}

function DigitalTagPicker({ onPick, onManageTags, onCancel }: DigitalTagPickerProps) {
  const [tags, setTags] = useState(() => getAllTags());
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setTags(getAllTags());
    window.addEventListener(TAGS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TAGS_CHANGED_EVENT, refresh);
  }, []);

  // Auto-dismiss with null after 6 s (no-tag chosen)
  useEffect(() => {
    if (picked !== null) return;
    const t = window.setTimeout(() => onPick(null), 6000);
    return () => window.clearTimeout(t);
  }, [picked, onPick]);

  const handlePick = (id: string) => {
    setPicked(id);
    window.setTimeout(() => onPick(id), 200);
  };

  return createPortal(
    <div className="dt-tag-picker" role="group" aria-label="Tag this session">
      <span className="dt-tag-picker__label">Tag?</span>
      <div className="dt-tag-picker__scroll">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`dt-tag-picker__btn${picked === t.id ? ' is-picked' : ''}`}
            onClick={() => handlePick(t.id)}
            aria-label={t.label}
            title={t.label}
          >
            <TagIcon def={t} size={15} />
          </button>
        ))}
        <span className="dt-tag-picker__divider" aria-hidden />
        <button
          type="button"
          className="dt-tag-picker__manage"
          onClick={() => onManageTags?.()}
          aria-label="Add custom tag"
          title="Add custom tag"
        >
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        className="dt-tag-picker__cancel"
        onClick={onCancel}
        aria-label="Cancel"
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

/* ── Main component ───────────────────────────────────────────────────── */

type TimerStep = 'idle' | 'picking-tag' | 'picking-duration';

export const DigitalClock = memo(function DigitalClock({
  timezone,
  format,
  focusState = { kind: 'idle' },
  focusControlsRef,
  userId = null,
  onManageTags,
  isVisible = false,
  schedulingViewOpen = false,
}: Props) {
  const now = useNow('second');
  const { hours: h24, minutes, seconds } = getZonedTime(now, timezone);

  const h12    = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? 'AM' : 'PM';

  /* Multi-step timer flow state */
  const [step, setStep]           = useState<TimerStep>('idle');
  const [pickedTag, setPickedTag] = useState<string | null>(null);

  // Reset flow when session ends
  useEffect(() => {
    if (focusState.kind === 'idle') {
      setStep('idle');
      setPickedTag(null);
    }
  }, [focusState.kind]);

  /**
   * Compact mode — clock shrinks to fit inside the FocusRing circle.
   * Triggered when:
   *   1. A session is running (targeted/paused/tracking)
   *   2. The scheduling/planned-rings view is open
   *
   * In compact mode: show HH:MM current time (no seconds, no AM/PM).
   * The FocusRing arc handles the visual session-progress indicator.
   * We NEVER show a countdown — always the current wall-clock time.
   */
  const isCompact = focusState.kind !== 'idle' || schedulingViewOpen;
  const isPaused  = focusState.kind === 'paused';

  /* Handlers */
  const handleStartFocus = useCallback(() => setStep('picking-tag'), []);

  const handleTagPick = useCallback((tag: string | null) => {
    setPickedTag(tag);
    setStep('picking-duration');
  }, []);

  const handleTagCancel = useCallback(() => {
    setStep('idle');
    setPickedTag(null);
  }, []);

  const handleDurationPick = useCallback((durationMs: number) => {
    const ctrl = focusControlsRef?.current;
    if (!ctrl) return;
    const startMs = Date.now();
    ctrl.startWithGoalAndTag(startMs, startMs + durationMs, pickedTag);
    setStep('idle');
    setPickedTag(null);
  }, [focusControlsRef, pickedTag]);

  const handleDurationCancel = useCallback(() => setStep('picking-tag'), []);

  /* Display helpers — always current time */
  const pad = (n: number) => String(n).padStart(2, '0');
  const hrDisplay  = format === '12' ? String(h12)  : pad(h24);
  const minDisplay = pad(minutes);
  const secDisplay = pad(seconds);

  return (
    <div className="digital-face-content">

      {/* ── Digit display — always shows current wall-clock time ── */}
      {/*    Normal mode  : HH:MM:SS  (full original size, large)   */}
      {/*    Compact mode : HH:MM     (smaller, fits inside ring)    */}
      <div
        className={[
          'digital',
          isCompact  ? 'digital--compact' : '',
          isPaused   ? 'digital--paused'  : '',
        ].filter(Boolean).join(' ')}
        role="timer"
        aria-live="off"
        aria-label={isPaused ? 'Session paused' : 'Digital clock'}
      >
        <span className="d-hr">{hrDisplay}</span>
        <span className={`d-sep${isPaused ? ' d-sep--dim' : ''}`} aria-hidden>:</span>
        <span className="d-min">{minDisplay}</span>

        {/* Seconds colon + seconds — hidden in compact mode */}
        {!isCompact && <span className="d-sep" aria-hidden>:</span>}
        {!isCompact && <span className="d-sec">{secDisplay}</span>}

        {/* Paused indicator — compact mode only */}
        {isCompact && isPaused && (
          <span className="d-paused-badge" aria-label="Paused">⏸</span>
        )}

        {/* AM/PM suffix — normal mode, 12-hour format only */}
        {!isCompact && format === '12' && (
          <span className="d-suffix">{suffix}</span>
        )}
      </div>

      {/* ── Start Focus CTA — portal to fixed bottom position ── */}
      {/*    Only renders when: digital mode active, logged-in,    */}
      {/*    session idle, no step in progress.                     */}
      {isVisible && userId && !isCompact && step === 'idle' && createPortal(
        <div className="dt-focus-cta">
          <button
            className="dt-start-btn"
            type="button"
            onClick={handleStartFocus}
            aria-label="Start focus session"
          >
            <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" stroke="none" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            Start Focus
          </button>
        </div>,
        document.body,
      )}

      {/* ── Tag picker (step 1) ── */}
      {isVisible && step === 'picking-tag' && (
        <DigitalTagPicker
          onPick={handleTagPick}
          onManageTags={onManageTags}
          onCancel={handleTagCancel}
        />
      )}

      {/* ── Duration picker (step 2) ── */}
      {isVisible && step === 'picking-duration' && (
        <DigitalDurationPicker
          onPick={handleDurationPick}
          onCancel={handleDurationCancel}
        />
      )}

    </div>
  );
});
