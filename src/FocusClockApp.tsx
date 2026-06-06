/**
 * FocusClockApp — the full Focus Clock application surface.
 *
 * This is what users see at `/app` (standalone mode) AND inside Scene 1
 * of the cinematic landing (embedded mode). Identical code, identical
 * functionality — same clock, same controls, same 3-click focus ring,
 * same auth, same settings, everything.
 *
 * The only difference is the OUTER container's CSS class:
 *   · standalone:   <main class="stage">           → position: fixed; inset: 0
 *   · embedded:     <main class="stage stage--embedded"> → position: absolute; inset: 0
 *
 * "Embedded" means: the app lives inside a normal-flow parent (Scene 1's
 * sticky stage), so the landing-page parent can scale + fade it via
 * scroll-driven transforms while keeping every internal interaction
 * (clicks, ring drags, control toggles) fully functional.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClockCanvas } from './components/ClockCanvas';
import { PauseStopControl } from './components/PauseStopControl';
import type { FocusState } from './hooks/useFocusTrack';
import { ThemeToggle } from './components/controls/ThemeToggle';
import { FullscreenToggle } from './components/controls/FullscreenToggle';
import { TimezoneSelector } from './components/controls/TimezoneSelector';
import { ModeToggle, type Mode } from './components/controls/ModeToggle';
import { FormatToggle, type Format } from './components/controls/FormatToggle';
import { CoffeeLink } from './components/controls/CoffeeLink';
import { FocusMessage } from './components/FocusMessage';
import { JoinPill } from './components/JoinPill';
import { AccountIcon } from './components/AccountIcon';
import { AuthModal } from './components/AuthModal';
import { SettingsDialog, type PaneKey } from './components/SettingsDialog';
import { TodaySummary } from './components/TodaySummary';
import { HeroMessage } from './components/HeroMessage';
import { ScheduleBadge, type ScheduleMode } from './components/ScheduleBadge';
import { useUpcomingPlanned, useTodayPlanProgress } from './hooks/usePlannedSessions';
import { useTodayStats } from './hooks/useTodayStats';
import { useTheme } from './hooks/useTheme';
import { useFullscreen } from './hooks/useFullscreen';
import { useIdle } from './hooks/useIdle';
import { usePersistedState } from './hooks/usePersistedState';
import { useNow } from './hooks/useNow';
import { useAuth } from './hooks/useAuth';
import { getZonedTime } from './lib/timezones';

import './components/controls/Controls.css';
import './App.css';

interface Props {
  /**
   * When true, the root <main class="stage stage--embedded"> uses
   * position: absolute; inset: 0 — fills its parent instead of the
   * viewport. Use this when the app is nested inside Scene 1 of the
   * landing page. Default false → original standalone (/app) behaviour.
   */
  embedded?: boolean;
}

export function FocusClockApp({ embedded = false }: Props) {
  const [theme, , toggleTheme] = useTheme();
  const [isFs, toggleFs] = useFullscreen();
  const [mode, setMode] = usePersistedState<Mode>('wall.mode', 'analog');
  const [tz, setTz] = usePersistedState<string>('wall.tz', 'local');
  const [format, setFormat] = usePersistedState<Format>('wall.format', '24');

  const auth = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialPane, setSettingsInitialPane] = useState<PaneKey>('stats');
  const [openTagAdd, setOpenTagAdd] = useState(false);
  const [hintBoostMs, setHintBoostMs] = useState(0);

  const openSettings = (pane: PaneKey = 'stats') => {
    setSettingsInitialPane(pane);
    setSettingsOpen(true);
  };

  const openTagSettings = () => {
    setOpenTagAdd(true);
    openSettings('tags');
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setOpenTagAdd(false);
  };

  /* ── Focus state mirror ───────────────────────────────────────────── */
  const [focusState, setFocusState] = useState<FocusState>({ kind: 'idle' });
  const focusControlsRef = useRef<{
    pause: () => void;
    resume: () => void;
    stop: () => void;
    startWithGoalAndTag: (startMs: number, endMs: number, tag: string | null) => void;
  } | null>(null);

  const handleFocusContext = useCallback((ctx: {
    state: FocusState;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    startWithGoalAndTag: (startMs: number, endMs: number, tag: string | null) => void;
  }) => {
    setFocusState(ctx.state);
    focusControlsRef.current = ctx;
  }, []);

  /* ── Logout → stop active session ─────────────────────────────────── */
  const prevUserRef = useRef(auth.user);
  useEffect(() => {
    const wasLoggedIn = prevUserRef.current !== null;
    prevUserRef.current = auth.user;
    if (wasLoggedIn && auth.user === null) {
      focusControlsRef.current?.stop();
    }
  }, [auth.user]);

  /* ── Session tick refresh ─────────────────────────────────────────── */
  const [sessionSavedTick, setSessionSavedTick] = useState(0);
  const handleSessionSaved = () => setSessionSavedTick((n) => n + 1);

  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const handleScheduleChanged = () => setPlanRefreshKey((n) => n + 1);

  /* ── Schedule rings view ──────────────────────────────────────────── */
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('closed');
  const schedulingViewOpen = scheduleMode !== 'closed';

  useEffect(() => {
    if (focusState.kind !== 'idle') setScheduleMode('closed');
  }, [focusState.kind]);

  const handleSelectAll   = () =>
    setScheduleMode(m => m === 'all'   ? 'closed' : 'all');
  const handleSelectToday = () =>
    setScheduleMode(m => m === 'today' ? 'closed' : 'today');

  const { byDay: plannedByDay, total: upcomingTotal } = useUpcomingPlanned(
    auth.user?.id ?? null,
    planRefreshKey,
  );

  const todayKey = (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  })();
  const todayPlannedSessions = useMemo(
    () => plannedByDay.get(todayKey) ?? [],
    [plannedByDay, todayKey],
  );
  const todayPlannedCount = todayPlannedSessions.length;

  const todayStats = useTodayStats(auth.user?.id ?? null, tz, sessionSavedTick);

  const [dailyGoalStr] = usePersistedState<string>('wall.daily.goal', '0');
  const dailyGoalMin = parseInt(dailyGoalStr, 10) || 0;
  const dailyGoalMs  = dailyGoalMin * 60_000;

  const todayPlanProgress = useTodayPlanProgress(
    auth.user?.id ?? null,
    planRefreshKey,
  );

  const barProgress: number | null = (() => {
    if (dailyGoalMs > 0) return Math.min(todayStats.totalMs / dailyGoalMs, 1);
    return todayPlanProgress.fraction;
  })();

  const goalProgress = dailyGoalMs > 0
    ? Math.min(todayStats.totalMs / dailyGoalMs, 1)
    : null;

  /* ── Goal reached notification ────────────────────────────────────── */
  const [goalMsg, setGoalMsg]       = useState<{ text: string; key: number } | null>(null);
  const goalCelebDateRef            = useRef('');
  const prevGoalProgressRef         = useRef<number | null>(null);
  useEffect(() => {
    if (goalProgress === null) { prevGoalProgressRef.current = null; return; }
    const prev = prevGoalProgressRef.current;
    prevGoalProgressRef.current = goalProgress;
    if (goalProgress < 1 || (prev !== null && prev >= 1)) return;
    const today = new Date().toDateString();
    if (goalCelebDateRef.current === today) return;
    goalCelebDateRef.current = today;
    const h = Math.floor(dailyGoalMin / 60), m = dailyGoalMin % 60;
    const label = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
    setGoalMsg({ text: `Daily goal reached · ${label} ✓`, key: Date.now() });
    const t = window.setTimeout(() => setGoalMsg(null), 3700);
    return () => window.clearTimeout(t);
  }, [goalProgress, dailyGoalMin]);

  useIdle(5000);

  /* ── Document title (skip when embedded — landing owns the title) ── */
  const now = useNow('second');
  const titleRef = useRef<string>('');
  useEffect(() => {
    if (embedded) return;
    const { hours, minutes } = getZonedTime(now, tz);
    const t = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · Focus Clock`;
    if (t !== titleRef.current) {
      document.title = t;
      titleRef.current = t;
    }
  }, [now, tz, embedded]);

  return (
    <main className={`stage${embedded ? ' stage--embedded' : ''}`}>
      {/* ── Clock canvas — shared FocusRing + analog/digital faces ── */}
      <div className="canvas clock-canvas-layer">
        <ClockCanvas
          mode={mode}
          timezone={tz}
          format={format}
          userId={auth.user?.id ?? null}
          focusState={focusState}
          focusControlsRef={focusControlsRef}
          onFocusContext={handleFocusContext}
          onSessionSaved={handleSessionSaved}
          onManageTags={openTagSettings}
          hintBoostMs={hintBoostMs}
          planRefreshKey={planRefreshKey}
          schedulingViewOpen={schedulingViewOpen}
          todayOnly={scheduleMode === 'today'}
          onScheduleClose={() => setScheduleMode('closed')}
          onPlanSessionCompleted={handleScheduleChanged}
        />
      </div>

      <PauseStopControl
        state={focusState}
        onPause={() => focusControlsRef.current?.pause()}
        onResume={() => focusControlsRef.current?.resume()}
        onStop={() => focusControlsRef.current?.stop()}
      />

      <div className="controls controls--tl">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {!auth.loading && !auth.user && (
        <HeroMessage onStart={setHintBoostMs} />
      )}

      {!auth.loading && (
        auth.user ? (
          <AccountIcon user={auth.user} onClick={() => openSettings('account')} />
        ) : (
          <JoinPill onClick={() => setAuthModalOpen(true)} />
        )
      )}

      <div className="controls controls--tr">
        <FullscreenToggle isFullscreen={isFs} onToggle={toggleFs} />
      </div>

      <div className="controls controls--bl">
        <TimezoneSelector value={tz} onChange={setTz} />
        <ModeToggle mode={mode} onChange={setMode} />
        {mode === 'digital' && (
          <div className="fmt-mount">
            <FormatToggle format={format} onChange={setFormat} />
          </div>
        )}
      </div>

      <div className="controls controls--br">
        <CoffeeLink />
      </div>

      {auth.user && goalMsg && (
        <FocusMessage text={goalMsg.text} duration={3500} msgKey={goalMsg.key} />
      )}

      {auth.user && (
        <TodaySummary
          stats={todayStats}
          dailyGoalMs={dailyGoalMs}
          goalProgress={goalProgress}
          onClick={() => openSettings('stats')}
        />
      )}

      {auth.user && barProgress !== null && (
        <div
          className="daily-goal-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(barProgress * 100)}
          aria-label={
            dailyGoalMs > 0
              ? `Daily focus goal: ${Math.round(barProgress * 100)}%`
              : `Today's plan: ${todayPlanProgress.completed} of ${todayPlanProgress.total} done`
          }
        >
          <div
            className="daily-goal-bar__fill"
            style={{ width: `${barProgress * 100}%` }}
          />
        </div>
      )}

      {auth.user && upcomingTotal > 0 && focusState.kind === 'idle' && (
        <ScheduleBadge
          count={upcomingTotal}
          todayCount={todayPlannedCount}
          viewMode={scheduleMode}
          onSelectAll={handleSelectAll}
          onSelectToday={handleSelectToday}
        />
      )}

      {authModalOpen && (
        <AuthModal auth={auth} onClose={() => setAuthModalOpen(false)} />
      )}
      {settingsOpen && auth.user && (
        <SettingsDialog
          key={settingsInitialPane}
          user={auth.user}
          initialPane={settingsInitialPane}
          refreshKey={sessionSavedTick}
          onScheduleChanged={handleScheduleChanged}
          autoOpenTagAdd={openTagAdd}
          initialStreak={todayStats.streak}
          onClose={closeSettings}
          onSignOut={async () => {
            focusControlsRef.current?.stop();
            await auth.signOut();
            closeSettings();
          }}
          onManageTags={openTagSettings}
        />
      )}
    </main>
  );
}
