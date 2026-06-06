import { memo } from 'react';
import type { RefObject } from 'react';
import { FocusRing } from './FocusRing';
import { AnalogClock } from './AnalogClock';
import { DigitalClock } from './DigitalClock';
import type { FocusState } from '../hooks/useFocusTrack';
import './ClockCanvas.css';

/* ── Re-export the FocusControls type so consumers can import it here ── */
interface FocusControls {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  startWithGoalAndTag: (startMs: number, endMs: number, tag: string | null) => void;
}

interface Props {
  mode: 'analog' | 'digital';
  timezone: string;
  format: '12' | '24';
  userId: string | null;

  /* ── FocusRing props ───────────────────────────────────────────────── */
  onSessionSaved?: () => void;
  onManageTags?: () => void;
  hintBoostMs?: number;
  planRefreshKey?: number;
  schedulingViewOpen?: boolean;
  todayOnly?: boolean;
  onScheduleClose?: () => void;
  onPlanSessionCompleted?: () => void;
  onFocusContext?: (ctx: {
    state: FocusState;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    startWithGoalAndTag: (startMs: number, endMs: number, tag: string | null) => void;
  }) => void;

  /* ── DigitalClock display props ───────────────────────────────────── */
  /** Mirrored focus state from App.tsx (published via onFocusContext). */
  focusState?: FocusState;
  /** Stable ref to live controls from FocusRing. */
  focusControlsRef?: RefObject<FocusControls | null>;
}

/**
 * ClockCanvas — shared container for both clock modes.
 *
 * Architecture:
 *   · FocusRing is ALWAYS rendered (arcs, drops, animations work in both modes).
 *   · AnalogClock (face: ticks, numerals, hands) cross-dissolves in/out for analog mode.
 *   · DigitalClock (HH:MM display + Start Focus) cross-dissolves in/out for digital mode.
 *
 * The root div keeps the `.analog` class so all FocusRing.css hover selectors
 * (`.analog:hover .focus-ring .track`) work unchanged in both modes.
 */
export const ClockCanvas = memo(function ClockCanvas({
  mode,
  timezone,
  format,
  userId,
  onSessionSaved,
  onManageTags,
  hintBoostMs,
  planRefreshKey,
  schedulingViewOpen = false,
  todayOnly,
  onScheduleClose,
  onPlanSessionCompleted,
  onFocusContext,
  focusState,
  focusControlsRef,
}: Props) {
  const isAnalog = mode === 'analog';

  return (
    <div className={`analog${schedulingViewOpen ? ' rings-open' : ''}`}>

      {/* ── Focus ring — always rendered, always visible in both modes ── */}
      <FocusRing
        timezone={timezone}
        userId={userId}
        onSessionSaved={onSessionSaved}
        onManageTags={onManageTags}
        hintBoostMs={hintBoostMs}
        planRefreshKey={planRefreshKey}
        schedulingViewOpen={schedulingViewOpen}
        todayOnly={todayOnly}
        onScheduleClose={onScheduleClose}
        onPlanSessionCompleted={onPlanSessionCompleted}
        onFocusContext={onFocusContext}
        /* Digital mode: ring is purely visual — only colored progress arc renders.
           No track, drops, hit circles, comet, floating timer, or tag picker.
           The digital UI (Start Focus button) handles session creation separately. */
        digitalMode={!isAnalog}
      />

      {/* ── Analog face — ticks, numerals, hands ── */}
      <div className={`face-layer${isAnalog ? ' face-layer--in' : ' face-layer--out-up'}`}
           aria-hidden={!isAnalog}>
        <AnalogClock timezone={timezone} />
      </div>

      {/* ── Digital face — transparent overlay, no bezel background ── */}
      {/* No analog__face class here — the circular bezel must NOT show  */}
      {/* in digital mode. The FocusRing arc provides all visual framing. */}
      <div
        className={`face-layer digital-face-layer${!isAnalog ? ' face-layer--in' : ' face-layer--out-down'}`}
        aria-hidden={isAnalog}
      >
        <DigitalClock
          timezone={timezone}
          format={format}
          focusState={focusState}
          focusControlsRef={focusControlsRef}
          userId={userId}
          onManageTags={onManageTags}
          isVisible={!isAnalog}
          schedulingViewOpen={schedulingViewOpen}
        />
      </div>

    </div>
  );
});
