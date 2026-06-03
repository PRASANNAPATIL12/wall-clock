import { useEffect, useRef, useState } from 'react';
import { AnalogClock } from './components/AnalogClock';
import { DigitalClock } from './components/DigitalClock';
import { ThemeToggle } from './components/controls/ThemeToggle';
import { FullscreenToggle } from './components/controls/FullscreenToggle';
import { TimezoneSelector } from './components/controls/TimezoneSelector';
import { ModeToggle, type Mode } from './components/controls/ModeToggle';
import { FormatToggle, type Format } from './components/controls/FormatToggle';
import { CoffeeLink } from './components/controls/CoffeeLink';
import { JoinPill } from './components/JoinPill';
import { AccountIcon } from './components/AccountIcon';
import { AuthModal } from './components/AuthModal';
import { SettingsDialog, type PaneKey } from './components/SettingsDialog';
import { TodaySummary } from './components/TodaySummary';
import { HeroMessage } from './components/HeroMessage';
import { ScheduleBadge, type ScheduleMode } from './components/ScheduleBadge';
import { useUpcomingPlanned } from './hooks/usePlannedSessions';
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

  // Daily focus goal — stored as a string (usePersistedState is string-only)
  const [dailyGoalStr] = usePersistedState<string>('wall.daily.goal', '0');
  const dailyGoalMin = parseInt(dailyGoalStr, 10) || 0;
  const dailyGoalMs  = dailyGoalMin * 60_000;
  // null when no goal set; capped at 1.0 so bar never overflows
  const goalProgress = dailyGoalMs > 0
    ? Math.min(todayStats.totalMs / dailyGoalMs, 1)
    : null;

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

      {/* Today summary — opens Stats pane (History is now embedded inside Stats) */}
      {auth.user && (
        <TodaySummary
          stats={todayStats}
          dailyGoalMs={dailyGoalMs}
          goalProgress={goalProgress}
          onClick={() => openSettings('stats')}
        />
      )}

      {/* Daily goal progress bar — 2px at absolute bottom edge, desktop only */}
      {auth.user && goalProgress !== null && (
        <div
          className="daily-goal-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(goalProgress * 100)}
          aria-label={`Daily focus goal: ${Math.round(goalProgress * 100)}%`}
        >
          <div
            className="daily-goal-bar__fill"
            style={{ width: `${goalProgress * 100}%` }}
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
