import { useEffect, useRef, useState } from 'react';
import { AnalogClock } from './components/AnalogClock';
import { DigitalClock } from './components/DigitalClock';
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
  /** When true, SettingsDialog opens TagsPane with the add-form pre-focused.
   *  Set when user taps "+" in the TagPicker; cleared when Settings closes. */
  const [openTagAdd, setOpenTagAdd] = useState(false);
  /** Extra ms to extend the idle onboarding hint while the hero message plays.
   *  Set when HeroMessage mounts (anonymous only). */
  const [hintBoostMs, setHintBoostMs] = useState(0);

  const openSettings = (pane: PaneKey = 'stats') => {
    setSettingsInitialPane(pane);
    setSettingsOpen(true);
  };

  /** Open Settings → Tags with the add form auto-focused (called from TagPicker "+"). */
  const openTagSettings = () => {
    setOpenTagAdd(true);
    openSettings('tags');
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setOpenTagAdd(false);
  };
  // Increments after every focus session save — triggers stats/history refetch.
  const [sessionSavedTick, setSessionSavedTick] = useState(0);
  const handleSessionSaved = () => setSessionSavedTick((n) => n + 1);

  // Increments after a planned session is saved — triggers ring arc refresh.
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const handleScheduleChanged = () => setPlanRefreshKey((n) => n + 1);

  // Schedule rings view — three states: closed / all days / today only
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('closed');
  const schedulingViewOpen = scheduleMode !== 'closed';

  // Tap "All sessions" → toggle all-days view; tap again → close
  const handleSelectAll   = () =>
    setScheduleMode(m => m === 'all'   ? 'closed' : 'all');
  // Tap "Today" → toggle today-only view; tap again → close
  const handleSelectToday = () =>
    setScheduleMode(m => m === 'today' ? 'closed' : 'today');

  // Upcoming planned sessions — feeds ScheduleBadge count
  const { byDay: plannedByDay, total: upcomingTotal } = useUpcomingPlanned(
    auth.user?.id ?? null,
    planRefreshKey,
  );

  // Today's planned session count for the badge "today" label
  const todayPlannedCount = (() => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return plannedByDay.get(key)?.length ?? 0;
  })();

  const todayStats = useTodayStats(auth.user?.id ?? null, tz, sessionSavedTick);

  // Daily focus goal (optional explicit target)
  const [dailyGoalStr] = usePersistedState<string>('wall.daily.goal', '0');
  const dailyGoalMin = parseInt(dailyGoalStr, 10) || 0;
  const dailyGoalMs  = dailyGoalMin * 60_000;

  /**
   * Today's planned sessions progress — how many of today's
   * scheduled sessions are done. Refreshes on every plan change.
   *
   * fraction = 0.0 → 1.0, or null when nothing is planned today.
   */
  const todayPlanProgress = useTodayPlanProgress(
    auth.user?.id ?? null,
    planRefreshKey,
  );

  /**
   * Bottom progress bar fraction (0–1):
   *   1. If an explicit daily goal is set → focus time vs goal
   *   2. Else if sessions are planned today → plan completion fraction
   *   3. Else → null (bar hidden)
   *
   * This lets the bar be useful even for users who haven't set a daily
   * goal — it just reflects "how much of today's plan is done."
   */
  const barProgress: number | null = (() => {
    if (dailyGoalMs > 0) {
      return Math.min(todayStats.totalMs / dailyGoalMs, 1);
    }
    return todayPlanProgress.fraction;   // null when nothing planned
  })();

  // Keep the old goalProgress alias for the TodaySummary pill fraction display
  const goalProgress = dailyGoalMs > 0
    ? Math.min(todayStats.totalMs / dailyGoalMs, 1)
    : null;

  // Goal-reached notification — fires once per day via FocusMessage
  const [goalMsg, setGoalMsg]         = useState<{ text: string; key: number } | null>(null);
  const goalCelebDateRef              = useRef('');
  const prevGoalProgressRef           = useRef<number | null>(null);
  useEffect(() => {
    if (goalProgress === null) { prevGoalProgressRef.current = null; return; }
    const prev = prevGoalProgressRef.current;
    prevGoalProgressRef.current = goalProgress;
    // Only fire on the crossing from <1 to >=1 (not on every render)
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

  // Document title — only ticks once per minute, cheap
  const now = useNow('second');
  const titleRef = useRef<string>('');
  useEffect(() => {
    const { hours, minutes } = getZonedTime(now, tz);
    const t = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · Wall Clock`;
    if (t !== titleRef.current) {
      document.title = t;
      titleRef.current = t;
    }
  }, [now, tz]);

  const isAnalog = mode === 'analog';

  return (
    <main className="stage">
      {/* Clock canvas with cross-dissolve between modes */}
      <div className="canvas">
        <div className={`mode-layer ${isAnalog ? 'is-in' : 'is-out-up'}`} aria-hidden={!isAnalog}>
          <AnalogClock
            timezone={tz}
            userId={auth.user?.id ?? null}
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
        <div className={`mode-layer ${!isAnalog ? 'is-in' : 'is-out-down'}`} aria-hidden={isAnalog}>
          <DigitalClock timezone={tz} format={format} />
        </div>
      </div>

      {/* Controls */}
      <div className="controls controls--tl">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Hero message — anonymous visitors only, once per page load */}
      {!auth.loading && !auth.user && (
        <HeroMessage onStart={setHintBoostMs} />
      )}

      {/* Account entry point — JoinPill for anonymous, AccountIcon for signed-in */}
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
        {!isAnalog && (
          <div className="fmt-mount">
            <FormatToggle format={format} onChange={setFormat} />
          </div>
        )}
      </div>

      <div className="controls controls--br">
        <CoffeeLink />
      </div>

      {/* Daily goal reached — top-of-screen FocusMessage (avoids z-index clash
          with ScheduleBadge that was hiding the old TodaySummary tooltip) */}
      {auth.user && goalMsg && (
        <FocusMessage text={goalMsg.text} duration={3500} msgKey={goalMsg.key} />
      )}

      {/* Today summary — opens Stats pane (History is now embedded inside Stats) */}
      {auth.user && (
        <TodaySummary
          stats={todayStats}
          dailyGoalMs={dailyGoalMs}
          goalProgress={goalProgress}
          onClick={() => openSettings('stats')}
        />
      )}

      {/* Bottom progress bar — 2px thin line at viewport edge.
          Shows today's plan completion % (or daily goal % if set).
          Visible on both desktop and mobile. */}
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

      {/* Schedule badge — shows only when sessions are planned */}
      {auth.user && upcomingTotal > 0 && (
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
            await auth.signOut();
            closeSettings();
          }}
          onManageTags={openTagSettings}
        />
      )}
    </main>
  );
}
