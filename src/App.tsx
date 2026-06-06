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

export default function App() {
  const [theme, , toggleTheme] = useTheme();
  const [isFs, toggleFs] = useFullscreen();
  const [mode, setMode] = usePersistedState<Mode>('wall.mode', 'analog');
  const [tz, setTz] = usePersistedState<string>('wall.tz', 'local');
  const [format, setFormat] = usePersistedState<Format>('wall.format', '24');

  const auth = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialPane, setSettingsInitialPane] = useState<PaneKey>('stats');
  /** When true, SettingsDialog opens TagsPane with the add-form pre-focused. */
  const [openTagAdd, setOpenTagAdd] = useState(false);
  /** Extra ms to extend the idle onboarding hint while the hero message plays. */
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

  // ── Focus state mirror ─────────────────────────────────────────────────
  // FocusRing (inside ClockCanvas) publishes state + controls via onFocusContext
  // so PauseStopControl and DigitalClock can consume them without lifting
  // useFocusTrack out of FocusRing.
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
    setFocusState(prev => {
      // When transitioning from idle → active, close the schedule view
      // so the PlannedRingsLayer only shows the active session's arc.
      if (prev.kind === 'idle' && ctx.state.kind !== 'idle') {
        setScheduleMode('closed');
      }
      return ctx.state;
    });
    focusControlsRef.current = ctx;
  }, []);

  // ── Logout → stop active session ──────────────────────────────────────
  // When the user signs out while a session is running, stop it first so
  // the session is saved (user is still authenticated at this moment) and
  // localStorage is cleared. Belt-and-suspenders: also fires from the
  // onSignOut handler in SettingsDialog (below) before auth.signOut().
  const prevUserRef = useRef(auth.user);
  useEffect(() => {
    const wasLoggedIn = prevUserRef.current !== null;
    prevUserRef.current = auth.user;
    if (wasLoggedIn && auth.user === null) {
      focusControlsRef.current?.stop();
    }
  }, [auth.user]);
  // ── /Focus state mirror ────────────────────────────────────────────────

  // Increments after every focus session save — triggers stats/history refetch.
  const [sessionSavedTick, setSessionSavedTick] = useState(0);
  const handleSessionSaved = () => setSessionSavedTick((n) => n + 1);

  // Increments after a planned session is saved — triggers ring arc refresh.
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const handleScheduleChanged = () => setPlanRefreshKey((n) => n + 1);

  // Schedule rings view — three states: closed / all days / today only
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('closed');
  const schedulingViewOpen = scheduleMode !== 'closed';

  const handleSelectAll   = () =>
    setScheduleMode(m => m === 'all'   ? 'closed' : 'all');
  const handleSelectToday = () =>
    setScheduleMode(m => m === 'today' ? 'closed' : 'today');

  // Upcoming planned sessions — feeds ScheduleBadge count
  const { byDay: plannedByDay, total: upcomingTotal } = useUpcomingPlanned(
    auth.user?.id ?? null,
    planRefreshKey,
  );

  // Today's key and sessions — shared by schedule badge + digital chips
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

  // Daily focus goal (optional explicit target)
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

  // Goal-reached notification — fires once per day via FocusMessage
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

  // Document title — ticks once per minute
  const now = useNow('second');
  const titleRef = useRef<string>('');
  useEffect(() => {
    const { hours, minutes } = getZonedTime(now, tz);
    const t = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · Focus Clock`;
    if (t !== titleRef.current) {
      document.title = t;
      titleRef.current = t;
    }
  }, [now, tz]);

  return (
    <main className="stage">
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

      {/* Pause / Resume / Stop — portal-rendered, shows when session active */}
      <PauseStopControl
        state={focusState}
        onPause={() => focusControlsRef.current?.pause()}
        onResume={() => focusControlsRef.current?.resume()}
        onStop={() => focusControlsRef.current?.stop()}
      />

      {/* Controls */}
      <div className="controls controls--tl">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Hero message — anonymous visitors only, once per page load */}
      {!auth.loading && !auth.user && (
        <HeroMessage onStart={setHintBoostMs} />
      )}

      {/* Account entry point */}
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

      {/* Daily goal reached */}
      {auth.user && goalMsg && (
        <FocusMessage text={goalMsg.text} duration={3500} msgKey={goalMsg.key} />
      )}

      {/* Today summary */}
      {auth.user && (
        <TodaySummary
          stats={todayStats}
          dailyGoalMs={dailyGoalMs}
          goalProgress={goalProgress}
          onClick={() => openSettings('stats')}
        />
      )}

      {/* Bottom progress bar */}
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

      {/* Schedule badge — hidden while a session is running (Pause/Stop takes its slot) */}
      {auth.user && upcomingTotal > 0 && focusState.kind === 'idle' && (
        <ScheduleBadge
          count={upcomingTotal}
          todayCount={todayPlannedCount}
          viewMode={scheduleMode}
          onSelectAll={handleSelectAll}
          onSelectToday={handleSelectToday}
        />
      )}

      {/* Modals */}
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
            // Stop any running session BEFORE signing out so it is saved
            // while the user is still authenticated.
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
