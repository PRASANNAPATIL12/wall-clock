import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useNow } from '../hooks/useNow';
import { getZonedTime } from '../lib/timezones';
import type { FocusState } from '../hooks/useFocusTrack';
import type { PlannedSession } from '../lib/planStore';
import { getAllTags, TAGS_CHANGED_EVENT } from '../lib/tags';
import { TagIcon } from './TagIcon';
import { DigitalDurationPicker } from './DigitalDurationPicker';
import { DigitalPlannedCards } from './DigitalPlannedCards';
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
  /**
   * Ref to live controls from FocusRing (RefObject so callbacks always
   * read the latest value even if the initial render beat the first context fire).
   */
  focusControlsRef?: RefObject<FocusControls | null>;
  /** Logged-in user id. Null = anonymous (timer UI hidden). */
  userId?: string | null;
  /** Today's planned sessions to show as tappable chips. */
  todayPlannedSessions?: PlannedSession[];
  /** Opens Settings → Tags (for the "+" tag button). */
  onManageTags?: () => void;
}

/* ── Countdown format ─────────────────────────────────────────────────── */

/** Remaining ms → { hours: "01", minutes: "30" } — no seconds shown. */
function fmtCountdown(ms: number): { hours: string; minutes: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return {
    hours:   String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
  };
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
  todayPlannedSessions = [],
  onManageTags,
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

  /* Derived timer values */
  const isRunning = focusState.kind === 'targeted' || focusState.kind === 'paused';
  const isPaused  = focusState.kind === 'paused';

  const { remaining: remainingMs } = useMemo(() => {
    if (!isRunning) return { remaining: 0 };
    const s = focusState as { kind: 'targeted' | 'paused'; start: number; end: number; pausedAt?: number };
    const effectiveNow = isPaused ? (s.pausedAt ?? now.getTime()) : now.getTime();
    return { remaining: Math.max(0, s.end - effectiveNow) };
  }, [focusState, isRunning, isPaused, now]);

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

  const handlePlanStart = useCallback((session: PlannedSession) => {
    const ctrl = focusControlsRef?.current;
    if (!ctrl) return;
    const nowMs = Date.now();
    const [hhStr, mmStr] = session.start_time_local.split(':');
    const startH  = parseInt(hhStr ?? '0', 10);
    const startM  = parseInt(mmStr ?? '0', 10);
    const today   = new Date();
    const planned = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(),
      startH, startM + session.duration_minutes,
    );
    const endMs = planned.getTime() > nowMs
      ? planned.getTime()
      : nowMs + session.duration_minutes * 60_000;
    ctrl.startWithGoalAndTag(nowMs, endMs, session.tag ?? null);
  }, [focusControlsRef]);

  /* Display helpers */
  const pad = (n: number) => String(n).padStart(2, '0');
  const hrDisplay  = format === '12' ? String(h12)  : pad(h24);
  const minDisplay = pad(minutes);
  const secDisplay = pad(seconds);

  const { hours: cH, minutes: cM } = fmtCountdown(remainingMs);

  return (
    <div className="digital-face-content">

      {/* ── Digit display ── */}
      {isRunning ? (
        /* Timer mode: HH:MM countdown (no seconds) */
        <div
          className={`digital digital--timer${isPaused ? ' digital--paused' : ''}`}
          role="timer"
          aria-live="off"
          aria-label={isPaused ? 'Session paused' : 'Focus countdown'}
        >
          <span className="d-hr">{cH}</span>
          <span className={`d-sep${isPaused ? ' d-sep--dim' : ''}`} aria-hidden>:</span>
          <span className="d-min">{cM}</span>
          {isPaused && (
            <span className="d-paused-badge" aria-label="Paused">⏸</span>
          )}
        </div>
      ) : (
        /* Clock mode: HH:MM:SS current time */
        <div
          className="digital"
          role="timer"
          aria-live="off"
          aria-label="Digital clock"
        >
          <span className="d-hr">{hrDisplay}</span>
          <span className="d-sep" aria-hidden>:</span>
          <span className="d-min">{minDisplay}</span>
          <span className="d-sep" aria-hidden>:</span>
          <span className="d-sec">{secDisplay}</span>
          {format === '12' && <span className="d-suffix">{suffix}</span>}
        </div>
      )}

      {/* ── Start Focus CTA + planned chips — logged-in + idle only ── */}
      {userId && !isRunning && step === 'idle' && (
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

          <DigitalPlannedCards
            sessions={todayPlannedSessions}
            canStart={focusState.kind === 'idle'}
            onStart={handlePlanStart}
          />
        </div>
      )}

      {/* ── Tag picker (step 1) ── */}
      {step === 'picking-tag' && (
        <DigitalTagPicker
          onPick={handleTagPick}
          onManageTags={onManageTags}
          onCancel={handleTagCancel}
        />
      )}

      {/* ── Duration picker (step 2) ── */}
      {step === 'picking-duration' && (
        <DigitalDurationPicker
          onPick={handleDurationPick}
          onCancel={handleDurationCancel}
        />
      )}

    </div>
  );
});
