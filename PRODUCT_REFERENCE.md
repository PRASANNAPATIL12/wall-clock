# PRODUCT_REFERENCE.md — Wall Clock

> Single source of truth for the entire Wall Clock application.
> **Last updated: 2026-06-06** | **Latest: Digital Timer Unification (feat/digital-timer-pause merged to main)**

---

## 1. Executive Summary

| Field | Value |
|-------|-------|
| **Product Name** | Wall Clock |
| **URL** | https://wallclock.onrender.com (also https://mywallclock.onrender.com) |
| **Repository** | https://github.com/PRASANNAPATIL12/wall-clock |
| **Deploy Status** | ✅ Live on Render (auto-deploy from `main` branch) |
| **Purpose** | A focus tool disguised as a beautiful clock. Users set timed focus goals on either analog or digital display, track sessions across days, and build a visual history of their deep work. |
| **Problem** | Most productivity apps reward *planning*. Wall Clock rewards *showing up*. No task lists, no projects, no Gantt charts — just "how long did I actually focus today?" |
| **Target Users** | Knowledge workers, students, developers, designers — anyone who blocks time for deep work and wants a calm, non-gamified record of it. |
| **Key Value Prop** | The clock is always useful (anonymous, zero-config, two display modes). The productivity layer is opt-in (free account). No attention tax — controls disappear when idle. |

---

## 2. Product Vision

### Long-term Vision
Become the default "focus tab" — the browser tab people leave open on a second monitor or in the background while working. Not a Pomodoro timer (those impose structure); Wall Clock *observes* the user's natural work rhythm and reflects it back as data.

### Business Goals
1. **Organic growth** via the anonymous clock (zero friction → shareability → "what's that on your screen?")
2. **Account conversion** via the "Track your progress / Join the focus community" CTA
3. **Retention** via streaks, heatmap, and history — users return to maintain their record
4. **Monetization (future)** — premium features (team dashboards, integrations, themes) after sufficient user base

### User Goals
- **Anonymous visitor**: "I need a clean, functional clock for my second monitor."
- **Signed-in user**: "I want to see how much deep work I did this week/month/year."
- **Returning user**: "I don't want to break my streak."

### Success Metrics
| Metric | Target |
|--------|--------|
| Bounce rate (anonymous) | < 40% |
| Anonymous → account conversion | > 8% |
| D7 retention (signed-in) | > 35% |
| Average sessions/week (active user) | > 4 |
| Bundle size (gzipped) | < 150 KB |

---

## 3. System Overview

### High-level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (client)                    │
│                                                       │
│  React 18 + TypeScript + Vite (SPA)                  │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ Analog Clock  │  │ Digital Clock │   Mode toggle   │
│  │ + Focus Ring  │  │ + Focus Ring  │                  │
│  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                          │
│  ┌──────▼──────────────────▼──────┐                  │
│  │    useFocusTrack + ClockCanvas   │                  │
│  │  (shared state machine,          │                  │
│  │   both modes use same ring arc)  │                  │
│  └──────┬───────┬─────────┬───────┘                  │
│         │       │         │                          │
│  ┌──────▼──┐ ┌──▼──┐ ┌───▼────┐                      │
│  │useAuth  │ │useNow│ │useFocusTrack  │                 │
│  │(Auth)   │ │(time)│ │(state machine)│                 │
│  └──────┬──┘ └─────┘ └───┬────┘                      │
│         │                 │                          │
│  ┌──────▼─────────────────▼──────┐                  │
│  │    sessionStore.ts             │                  │
│  │  saveSession / listSessions    │                  │
│  └──────────────┬─────────────────┘                  │
│                 │ HTTPS (anon key + JWT)              │
└─────────────────┼─────────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────────┐
│              Supabase (BaaS)                           │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ PostgreSQL  │  │ Auth (GoTrue)│  │ PostgREST API │ │
│  │ + RLS       │  │ Email + OAuth│  │ (auto REST)   │ │
│  └────────────┘  └──────────────┘  └───────────────┘ │
└───────────────────────────────────────────────────────┘
```

### Major Modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| **Clock engine** | `useNow`, `AnalogClock`, `DigitalClock` | Time display (frame or second precision) |
| **Clock container** | `ClockCanvas` | Shared wrapper for both modes, FocusRing always rendered |
| **Focus ring** | `useFocusTrack`, `FocusRing` | 3-click state machine + unified countdown arc |
| **Planned rings** | `PlannedRingsLayer` | Concentric daily arcs (analog + digital use same ring) |
| **Digital timer** | `DigitalClock`, `DigitalDurationPicker` | Digital Start Focus flow (tag → duration → session) |
| **Pause/Stop** | `PauseStopControl` | Session pause/resume/stop (both modes) |
| **Haptic feedback** | `haptic.ts` | Web Audio + Vibration API, sound preferences |
| **Auth** | `useAuth`, `supabase.ts` | Supabase Auth (Google OAuth + email/password) |
| **Session persistence** | `sessionStore.ts` | CRUD against Supabase `sessions` table |
| **Settings** | `SettingsDialog` + 6 panes | Account, History, Stats, Tags, Sounds, About |
| **Onboarding** | `useOnboardingHint`, `OnboardingHint`, `HeroMessage` | First-time user guidance |
| **Tags** | `tags.ts`, `TagPicker`, `TagsPane` | 14 default + custom session categories |
| **Controls** | `ThemeToggle`, `ModeToggle`, `FormatToggle`, etc. | Corner glass pills with idle-fade |

### System Boundaries
- **No custom backend.** Supabase provides auth, database, and API.
- **No IndexedDB.** All data is cloud-only. Anonymous users get zero persistence.
- **No service worker.** The clock runs from the browser's JS engine; offline = clock works, saves don't.
- **No analytics.** Zero third-party tracking scripts.
- **Unified ring system:** Digital and analog modes share the same `PlannedRingsLayer` arc rendering. One session, one ring, both modes.

### External Systems

| System | Purpose | Integration |
|--------|---------|-------------|
| **Supabase** | Auth + Postgres + REST API | `@supabase/supabase-js` client SDK |
| **Google OAuth** | Social sign-in | Configured in Supabase Auth → Google provider |
| **Google Fonts** | Typography | `Inter`, `JetBrains Mono`, `Caveat`, `Special Elite` |
| **Render** | Static site hosting | Auto-deploy from `main` branch, `npm run build` |
| **GitHub** | Source control | `PRASANNAPATIL12/wall-clock` |

### Dependencies (production)
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | UI framework |
| `react-dom` | 18.3.1 | DOM rendering |
| `@supabase/supabase-js` | ^2.106.2 | Supabase client (auth + data) |

---

## 4. Complete Feature Inventory

### 4.1 Analog Clock

**Purpose:** Beautiful, functional wall clock with smooth sweep-second hand.

**User Flow:**
1. Page loads → clock renders at local time (or selected timezone)
2. Second hand sweeps continuously at 60 fps (requestAnimationFrame)
3. Minute/hour hands move with soft-spring transitions
4. Current hour numeral highlighted in red with scale animation

**Business Rules:**
- Always works, signed-in or not
- Timezone affects all hands
- No network dependency

**Edge Cases:**
- Midnight rollover: hour numeral transitions from 12 to 1
- DST change: clock follows `Intl.DateTimeFormat` resolution
- Tab backgrounded: RAF pauses; on foreground, hands snap to current time

**Dependencies:** `useNow('frame')`, `getZonedTime()`

---

### 4.2 Digital Clock

**Purpose:** Large monospace time display with two-state layout, alternative to analog.

**Display States:**

| State | Display | Context |
|-------|---------|---------|
| **Normal (idle)** | HH:MM:SS full-size (clamp 60-220px) | No session running, schedule view closed |
| **Compact (active/planning)** | HH:MM inside ring (clamp 56-170px) + "Xm left" text | Session running OR planning rings open |

**User Flow:**
1. User clicks ANALOG/DIGITAL toggle
2. Cross-dissolve transition (mode-layer)
3. Digital shows current wall-clock time (never countdown)
4. Format toggle (12h/24h) appears in bottom-left
5. **If session active:** compact display with remaining-time text below HH:MM
6. **Start Focus button:** appears when idle, fades after 5s inactivity

**Start Focus Flow (digital):**
1. Click "Start Focus" button
2. TagPicker appears → select tag (or auto-dismiss after 6s)
3. DurationPicker appears → select duration
4. Session starts immediately, countdown arc appears (unified ring system)
5. Compact mode activates, remaining time shows below HH:MM

**Business Rules:**
- Always shows current wall-clock time, never a countdown timer
- 12-hour format shows AM/PM suffix (normal mode only)
- Second updates at `useNow('second')` precision (not frame-level)
- Timezone selector affects displayed time
- Remaining-time text updates every second when session active
- Start Focus button portaled to `document.body`, positioned at `bottom: 112px` (above ScheduleBadge)
- Can't start two sessions (blocks if one active in analog)

---

### 4.3 Unified Focus Ring System

**Purpose:** Core productivity feature. Users set timed focus goals on either analog or digital, rendered with one synchronized ring.

**Architecture:**

- **Analog path:** Click 1/2/3 on ring → state machine handles timing
- **Digital path:** Start Focus → tag → duration → synthetic PlannedSession created, feeds through same arc rendering
- **Both paths:** `activePlanSession` state drives `PlannedRingsLayer` to render countdown arc
- **One ring:** Countdown arc at outer radius (R=56), identical animation/glow/color in both modes
- **Cross-mode sync:** Start from digital, switch to analog mid-session → same arc visible, same timer running

**Analog 3-Click Flow:**

1. **Click 1 (anywhere on ring):** 
   - State: `idle → tracking`
   - Comet orbits from click position to minute hand
   - Progress arc begins drawing from click angle
   - Timer appears showing elapsed time

2. **Click 2 (on ring):** 
   - State: `tracking → targeted`
   - End-point marker appears at clicked position
   - Progress arc shows remaining distance to goal
   - TagPicker appears (logged-in only)
   - End-point draggable

3. **Click 3 (on ring):**
   - State: `targeted → idle`
   - Session clears and is saved (if signed-in)
   - All markers disappear

**Digital Session Start:**

1. Click "Start Focus"
2. TagPicker (portal) → select tag or auto-dismiss (6s)
3. DurationPicker (portal) → select duration (15min to 6hr)
4. Session starts:
   - Synthetic PlannedSession created (id: `digital-<timestamp>`)
   - `activePlanSession` set → PlannedRingsLayer renders arc
   - Arc anchored at current minute-hand angle, shrinks 360°→0° as time passes
   - Compact mode activates, remaining-time text appears

**Countdown Arc Rendering (both modes):**

- **Ring:** PlannedRingsLayer's ArcSegment component
- **Radius:** R=56 (outer ring, not inner)
- **Animation:** `ring-arc-draw 580ms` cubic-bezier on start, `ring-arc-vanish 440ms` on completion
- **Technique:** pathLength=1000, strokeDasharray/offset trick for smooth animation
- **Color:** Tag-based (via `tagColor()` function)
- **Glow:** `filter: brightness(1.18) drop-shadow(0 0 4px rgba(...))` 
- **Hover:** Scale(1.04) on desktop, raised on mobile tap

**Completion & Bonus:**

- **Analog only:** Goal arc (start→end) drawn when targeted. Past goal → gold bonus arc grows.
- **Digital:** Arc vanishes on completion, no bonus arc (digital is always a fresh timer, no overtime concept)
- **Both:** Celebration fires (chime + vibration + ripples), auto-clears to idle

**Blocking / Mutual Exclusion:**

- If a session is running from either mode, ScheduleBadge hides (Pause/Stop shows instead)
- Digital's Start Focus button disabled if analog session active
- Analog click-1/2/3 blocked if digital session active
- Schedule view auto-closes when a session starts (either mode)

**Business Rules:**
- State machine: `idle → tracking → targeted ⇌ paused → idle`
- Goal completion: when elapsed ≥ target, celebration fires + bonus tracking begins (analog only)
- Bonus time: past-target tracking in warm gold (analog only)
- Lap counter: appears at hour boundaries (lap 2 at 60min, lap 3 at 120min)
- Drag: end-point can be repositioned while in `targeted` state (analog only)
- Sanity cap: 6-hour maximum session (localStorage cleared after)
- Pause/Resume: state → `paused`, timer freezes at `pausedAt` timestamp, can resume anytime
- Stop: ends session immediately, saves if signed-in

**Edge Cases:**
- Rapid triple-click: debounced by state transitions (each click must change state first)
- Drag past 12: angle math wraps correctly (mod 360)
- Session spans midnight: `date_local` uses the session's start timezone
- Page refresh mid-session: state restored from localStorage (`wall.track.start`, `wall.track.end`)
- Digital session → analog mode → back to digital: same session continues, timer accurate

**Permissions:**
- Anonymous: ring works fully, but nothing is saved
- Signed-in: session saved to Supabase on completion

**Dependencies:** `useFocusTrack`, `FocusRing`, `PlannedRingsLayer`, `PauseStopControl`

---

### 4.4 Planned Sessions (Analog Scheduling)

**Purpose:** Schedule focus activities in advance, rendered as concentric rings.

**User Flow:**
1. Click ScheduleBadge → "All" or "Today" view opens
2. Concentric rings appear, one per day (inner = today, outer = future days)
3. Each ring subdivided into colored arcs (one per planned session)
4. Click an arc → PlanActionCard shows below with "Start now" button
5. Click "Start now" → session starts immediately using same countdown arc

**Arc Rendering:**
- Each arc is an ArcSegment in PlannedRingsLayer
- Color: tag-based (matches session category)
- Animation: `ring-arc-draw 580ms` on enter
- Hover (desktop): scale(1.04) + glow intensifies
- Tap (mobile): selected arc raises
- At 100% completion: `ring-arc-vanish 440ms` animation fires

**When Planned Session is Active:**
- `activePlanSession` set to the PlannedSession object
- PlannedRingsLayer shows ONLY that session's arc (filtered view)
- Schedule view auto-closes
- Remaining time shows as percentage in PlanActionCard
- On completion: auto-clears and session is marked complete in Supabase

---

### 4.5 Session Tags

**Purpose:** Categorize focus sessions by activity type.

**User Flow:**
1. After click-2 (goal set) on analog, tag picker slides in near the end-point
2. Or: Start Focus → tag picker appears as portal (digital)
3. 14 default SVG-icon tags + custom tags shown in scrollable pill
4. User taps a tag → pill pulses → picker closes
5. Auto-dismiss after 6s if no selection (digital) or 4s (analog)
6. "+" button → opens Settings → Tags pane for custom tag management

**Default Tags (14):**
Code, Write, Study, Design, Rest, Meet, Exercise, Read, Plan, Research, Music, Break, Personal, Other

**Custom Tags:**
- Stored in `wall.tags.custom` (localStorage JSON array)
- Each has: id (timestamp-based), label (max 24 chars), default circle icon
- Add/delete from Settings → Tags pane
- No limit on custom tag count

**Business Rules:**
- Tag is stored in `sessions.tag` column (string ID, not emoji)
- Tag appears in countdown arc color (via `tagColor()` function)
- Tags appear in History pane per-session row
- Legacy emoji tags fall back to "Other"

---

### 4.6 Pause, Resume, and Stop Controls

**Purpose:** Session lifecycle management, shared between analog and digital modes.

**User Flow:**
1. When session is `targeted` or `paused` → PauseStopControl renders at bottom-center
2. Two buttons: Pause/Resume (toggles), Stop
3. ScheduleBadge hides (PauseStopControl takes its place)
4. Click Pause → state becomes `paused`, timer freezes at `pausedAt` timestamp
5. Click Resume → state becomes `targeted` again, timer resumes from freeze point
6. Click Stop → state becomes `idle`, session saved (if signed-in)
7. When session ends → controls disappear, ScheduleBadge reappears

**Business Rules:**
- Pause only works in `targeted` state
- Resume only works in `paused` state
- Stop works from any non-idle state
- Remaining time display updates second-by-second (both modes)
- Analog: focus arc freezes at pause time, end-drop stays in place
- Digital: compact display freezes, "Paused · Xm left" shown instead of "Xm left"

---

### 4.7 Authentication

**Purpose:** Gate productivity features behind a free account.

**User Flow:**
1. Anonymous: sees "Track your progress / Join the focus community" pill (top-left)
2. Click pill → AuthModal opens
3. Two paths:
   - **Google OAuth:** "Continue with Google" → redirect → return signed-in
   - **Email/password:** form with sign-up/sign-in toggle, min 8-char password
4. On success: modal closes, JoinPill replaced by AccountIcon (initials circle)

**Business Rules:**
- Supabase handles all token management (persist, refresh, detect URL callback)
- Email confirmation: currently OFF for v1 (reduces friction)
- Minimum password: 8 characters
- Session persistence: `localStorage` via Supabase SDK
- Sign-out: clears session, returns to anonymous state
- Multiple tabs: `onAuthStateChange` syncs across tabs

**Edge Cases:**
- OAuth popup blocked: Supabase falls back to redirect flow
- Network error during sign-in: error message shown in modal
- Token expiry: auto-refresh handled by Supabase SDK

---

### 4.8 Settings Dialog

**Purpose:** Centralized configuration and data access.

**User Flow:**
1. Click AccountIcon (top-left) → dialog opens
2. Sidebar nav with 6 panes (SVG icons, no emoji)
3. Click a pane → content swaps with 220ms fade
4. Escape or click-outside → closes
5. Mobile (≤720px): sidebar becomes horizontal icon tab bar

**Panes:**

| Pane | Content |
|------|---------|
| **Account** | Email, joined date, "Export my data" (JSON download), "Delete my account" (with confirmation), "Delete all history" |
| **History** | Paginated session list grouped by date, duration bars, tag icons, completion dots, searchable |
| **Stats** | Streak card, period total card, heatmap (1W/1M/2M/3M/4M/6M/1Y), custom dropdown, glass tooltip |
| **Tags** | Default tags (read-only with usage counts), custom tags (add/delete), SVG icon grid |
| **Sounds** | Goal sound selector (bell/tok/silent) with preview, drag-tick toggle (on/off) |
| **About** | Mission statement, design principles, privacy summary, version, GitHub link |

---

### 4.9 Stats & Heatmap

**Purpose:** Visual representation of focus consistency over time.

**User Flow:**
1. Open Settings → Stats
2. Default view: 1 month
3. Custom dropdown (glass popover): 1 week, 1 month, 2M, 3M, 4M, 6M, 1 year
4. Heatmap renders: always 18px square cells, month-block layout for 2M+
5. Hover cell (desktop) or tap cell (mobile) → glass tooltip with date + duration
6. Tooltip flips below cell when near top of pane

**Business Rules:**
- Green palette: 5 intensity buckets (0 / <30min / 30-90min / 90-180min / >3h)
- Today's cell: red outline (--hand-second)
- Streak: consecutive days from today backward with >0 focus time
- Flame icon: at streak ≥3 days
- Month blocks: 10px flex gap between months
- Horizontal scroll: when cells don't fit (scroll-hint animation plays)

---

### 4.10 Today Summary Pill

**Purpose:** At-a-glance daily stats, always visible on the main clock page.

**User Flow:**
1. Signed-in user with ≥1 session today → pill appears bottom-center
2. Shows: `Xh Ym · N sessions · K-day streak` (flame icon at streak ≥3)
3. Click → opens Settings → History pane

**Business Rules:**
- Hidden when count = 0 (no "0h 0m" shown)
- Refetches when `sessionSavedTick` increments (after any session save)
- Hides when session is active (PauseStopControl shows instead)

---

### 4.11 Onboarding Hints

**Purpose:** Teach the 3-click ring interaction to new users.

**User Flow (analog):**
1. Idle state → "click anywhere on the ring to start a tracking" (with animated arrow)
2. Tracking state → "click again to set your goal end-time"
3. Targeted state → "click once more to clear"

**User Flow (digital):**
- No hints; UI is self-explanatory (labeled buttons, clear flow)

**Business Rules:**
- Anonymous users: hints shown every session (no localStorage)
- Signed-in users: each hint shown once per lifetime (stored in `wall.hint.seen`)
- Ring breathe animation (`ring-breathe`, 2.8s) pulses during all 3 hints (analog only)
- Each hint visible for 5s + optional `extraVisibleMs` (extended during hero message)

---

### 4.12 Hero Message

**Purpose:** Welcome anonymous visitors with the product's philosophy.

**Message:** "Not here for your attention. Here for your focus."

**User Flow:**
1. Anonymous user loads page → typewriter animation begins
2. Each character appears at 68ms intervals in Special Elite font
3. "focus" word rendered in muted `--hand-second` red, 9% larger
4. 420ms pause between the two sentences
5. Hold 2.6s → 1.4s fade out → element unmounts

**Business Rules:**
- Only shown to anonymous users (never signed-in)
- Shown on every page load / refresh
- Position: `top: max(52px, 10vh)` — above clock, below controls

---

### 4.13 Sound Customization

**Purpose:** User control over audio feedback.

**Options:**

| Preference | Key | Values | Default |
|-----------|-----|--------|---------|
| Goal completion sound | `wall.sound.goal` | `bell` / `tok` / `silent` | `bell` |
| Drag tick sound | `wall.sound.ticks` | `on` / `off` | `on` |

**Business Rules:**
- Preferences stored in localStorage (device-level, not synced)
- `celebrate()` reads preference and plays appropriate sound
- `tick()` early-returns if ticks are off
- Preview plays when user changes goal sound in Settings

---

### 4.14 Theme System

**Purpose:** Light and dark modes with smooth transitions.

**User Flow:**
1. Click sun/moon toggle (top-left)
2. 700ms cross-fade on all themed elements
3. Preference persisted to `wall.theme` in localStorage
4. Grain texture switches blend mode (multiply → screen)

**Business Rules:**
- Default: follows system preference on first visit
- `data-theme` attribute on `<html>` drives all CSS
- Every color token has light and dark variants

---

## 5. User Journey Documentation

### Journey A: Anonymous First Visit

```
1. User lands on page
   → Clock renders immediately (no loading screen)
   → Hero message types: "Not here for your attention. Here for your focus."
   → Ring breathe animation pulses the ghost track
   → Onboarding hint: "click anywhere on the ring to start a tracking"

2. User clicks the ring
   → Comet orbits from click position to minute hand
   → Timer appears showing elapsed time
   → Hint: "click again to set your goal end-time"

3. User clicks ring again
   → End-point marker appears
   → Progress arc shows remaining distance
   → Hint: "click once more to clear"
   → No tag picker (anonymous)

4. User lets time elapse until goal reached
   → Celebration: bell chime + vibration + gold ripples
   → Bonus arc begins in warm gold

5. User clicks ring a third time
   → Session clears (nothing saved — anonymous)
   → "Track your progress / Join the focus community" pill visible
```

### Journey B: Digital User (Anonymous or Signed-in)

```
1. User clicks ANALOG/DIGITAL mode toggle
   → Clock face cross-dissolves
   → Digital shows large HH:MM:SS (idle mode)
   → "Start Focus" button visible

2. Click "Start Focus" button
   → TagPicker slides up (portal) — "What are you focusing on?"
   → User taps "Code" tag or auto-dismiss after 6s

3. DurationPicker appears (portal) — "How long?"
   → User selects 30 minutes
   → Confirm → session starts immediately

4. Compact digital display activates
   → Shows HH:MM inside ring center
   → Below: "30m left" countdown text
   → Countdown arc appears around ring (360° → 0°)
   → Arc color: tag-based (teal for Code)
   → Arc animation: smooth shrink as time passes

5. User can pause/resume/stop via PauseStopControl (bottom center)
   → "Paused · 25m left" shown in compact display when paused

6. Goal reached (30 min elapsed)
   → Celebration: chime + vibration + ripples
   → Arc vanishes with `ring-arc-vanish` animation
   → If signed-in: session saved to Supabase
   → Compact mode exits, full-size digital clock returns

7. (Signed-in) Can switch to ANALOG mid-session
   → Same countdown arc visible in analog mode
   → Timer continues accurately
   → Can pause/resume from either mode
```

### Journey C: Account Creation

```
1. User clicks JoinPill (anonymous)
   → AuthModal opens (frosted glass)
   
2a. Google path: "Continue with Google" → OAuth redirect → return signed-in
2b. Email path: enter email + password → "Create account" → signed in

3. Modal closes automatically
   → JoinPill disappears
   → AccountIcon (initials) appears
   → TodaySummary pill appears at bottom (if sessions exist)
   → Session saves now persist to Supabase
```

### Journey D: Scheduled Session (Planned Rings)

```
1. Click ScheduleBadge (top right) → opens "All sessions" or "Today" view
   → Concentric rings appear (one per day)
   → Each ring subdivided into colored arcs (planned sessions)

2. Click a planned session arc → PlanActionCard appears below
   → Shows session title, time, duration, "Start now" button

3. Click "Start now"
   → Session begins immediately
   → Same countdown arc used as digital Start Focus
   → Remaining time shown in PlanActionCard + Pause/Stop controls show

4. Goal reached
   → Celebration fires
   → Session marked complete in Supabase
   → Arc vanishes
   → Schedule view auto-closes (unless explicitly kept open)
```

### Journey E: Reviewing Progress

```
1. Click AccountIcon → Settings opens (History pane default)
2. See today's sessions grouped with duration bars
3. Switch to Stats → see streak card + heatmap
4. Change period dropdown to "6 months" → month-block layout with scroll
5. Hover a cell → glass tooltip: "Mon, Mar 15 — 2h 14m"
6. Switch to 1 week → single row with day abbreviations
7. Click "Export my data" → JSON file downloads
```

---

## 6. Application Flow

### Authentication Flow

```
Client                          Supabase Auth
  │                                │
  ├─ signInWithGoogle() ──────────►│ Redirect to Google OAuth
  │                                │ User consents
  │◄──────── redirect callback ────┤ JWT + refresh token
  │                                │
  ├─ onAuthStateChange ───────────►│ Subscribe to auth events
  │◄──────── SIGNED_IN event ──────┤
  │                                │
  ├─ signInWithEmail(e,p) ────────►│ Verify credentials
  │◄──────── session object ───────┤ JWT stored in localStorage
  │                                │
  ├─ signOut() ───────────────────►│ Invalidate session
  │◄──────── SIGNED_OUT event ─────┤
```

### Session Save Flow (Analog)

```
FocusRing (click 3) — analog mode
  │
  ├─ handleSessionEnd(FocusSessionEnd)
  │   ├─ userId is null? → return (anonymous, nothing saved)
  │   └─ userId exists? → saveSession({...})
  │       │
  │       ├─ Compute date_local via formatLocalDate()
  │       ├─ Convert epochs to ISO timestamps
  │       ├─ Determine tag from sessionTagRef
  │       ├─ supabase.from('sessions').insert(row)
  │       │   └─ RLS checks auth.uid() = user_id
  │       │
  │       └─ onSessionSaved() → setSessionSavedTick(n+1)
  │           ├─ useTodayStats refetches
  │           ├─ HistoryPane / StatsPane refetch via refreshKey
  │           └─ TodaySummary pill updates
```

### Session Start Flow (Digital)

```
DigitalClock (Start Focus button)
  │
  ├─ Click "Start Focus" → setStep('picking-tag')
  │   └─ DigitalTagPicker (portal) renders
  │
  ├─ User selects tag (or auto-dismisses)
  │   └─ handleTagPick(tag) → setStep('picking-duration')
  │       └─ DigitalDurationPicker (portal) renders
  │
  ├─ User selects duration → handleDurationPick(durationMs)
  │   │
  │   ├─ focusControlsRef.current.startWithGoalAndTag(startMs, startMs+durationMs, tag)
  │   │   │
  │   │   └─ FocusRing.startWithGoalAndTag()
  │   │       ├─ Create synthetic PlannedSession (id: `digital-<timestamp>`)
  │   │       ├─ setActivePlanSession() → PlannedRingsLayer renders arc
  │   │       ├─ setArcStartMinAngle() → arc anchors at current minute
  │   │       ├─ startWithGoal() → timer starts
  │   │       └─ prepareHaptic() → warm audio context
  │   │
  │   └─ DigitalClock.setStep('idle')
  │       └─ Compact mode activates, remaining-time text shows
```

### Unified Ring Arc Flow

```
Both Analog 3-Click AND Digital Start Focus
  │
  └─ setActivePlanSession(session)
      │
      ├─ plannedByDay useMemo sees activePlanSession
      │   └─ Returns filtered Map with only active session
      │
      └─ PlannedRingsLayer renders ArcSegment
          ├─ arcStartMinAngle → arc anchored at minute hand
          ├─ arcLength → (remainMs / totalMs) * 360 → shrinks 360°→0°
          ├─ Color from tagColor(session.tag)
          ├─ Animation: ring-arc-draw 580ms (smooth entry)
          ├─ On completion: ring-arc-vanish 440ms (smooth exit)
          │
          └─ Visible in BOTH modes
              ├─ Analog: outer ring, same angle as other arcs
              └─ Digital: outer ring, same angle as other arcs
```

### Data Flow

```
                    ┌─────────────────────────┐
                    │    Browser localStorage   │
                    │                           │
                    │  wall.theme               │
                    │  wall.mode                │
                    │  wall.tz                  │
                    │  wall.format              │
                    │  wall.track.start/end     │
                    │  wall.hint.seen           │
                    │  wall.sound.goal/ticks    │
                    │  wall.haptic.silent       │
                    │  wall.tags.custom         │
                    │  sb-* (Supabase tokens)   │
                    └─────────────────────────┘
                              ▲
                              │ read/write
                              ▼
                    ┌─────────────────────────┐
                    │      React State         │
                    │  (useState / useRef)      │
                    │                           │
                    │  Focus state machine      │
                    │  Auth user/session         │
                    │  Active session (unified) │
                    │  Today stats cache         │
                    │  Settings UI state         │
                    └──────────┬──────────────┘
                               │
                               │ supabase.from('sessions')
                               ▼
                    ┌─────────────────────────┐
                    │    Supabase PostgreSQL    │
                    │                           │
                    │  sessions table           │
                    │  auth.users (managed)      │
                    │  planned_sessions table   │
                    └─────────────────────────┘
```

### Error Handling Flow

| Error | Source | Handling |
|-------|--------|----------|
| Network failure during session save | `sessionStore.ts` | Swallow, log warning. Session data lost. Clock keeps working. |
| Auth token expired | Supabase SDK | Auto-refresh via `autoRefreshToken: true` |
| Google OAuth popup blocked | Browser | Supabase falls back to redirect |
| Invalid email/password | Supabase Auth | Error string displayed in AuthModal |
| RLS violation | Supabase PostgREST | Empty result returned, warning logged |
| localStorage quota exceeded | Browser | Silently catch, skip write |
| AudioContext suspended | Chrome autoplay | `prepareHaptic()` resumes in user gesture |
| Vibration API no-op | iOS Safari / desktop | Audio fallback always fires alongside |
| Digital session → sync conflict | State machine | Not possible — digital sessions are synthetic, ephemeral |

---

## 7. Domain Knowledge

### Terminology

| Term | Definition |
|------|-----------|
| **Session** | A single focus period: start time → end time, with optional goal and tag |
| **Goal** | The target end-time set on click-2 (analog) or duration (digital). Shown as the end-point or arc on the ring. |
| **Bonus** | Time tracked past the goal (analog only). Displayed as a warm gold arc. |
| **Streak** | Consecutive calendar days with ≥1 completed session |
| **Lap** | Each full hour within a session (lap 2 at 60min, lap 3 at 120min, etc.) |
| **Tag** | Activity category assigned to a session (e.g., "Code", "Study") |
| **Focus ring** | The interactive SVG overlay on the analog clock face, shared arc between modes |
| **Comet** | One-shot orbiting animation on analog session start |
| **Ghost track** | The faint dotted circle showing where the ring is (analog only) |
| **End-drop** | The draggable marker at the goal position (analog only) |
| **Head-drop** | The marker following the current minute hand (analog only) |
| **Celebration** | Audio + visual feedback when goal is reached |
| **Countdown arc** | The shrinking arc (360°→0°) in both analog and digital modes, shared PlannedRingsLayer component |
| **Planned session** | A session scheduled in advance via ScheduleBadge |
| **Synthetic session** | A PlannedSession created by digital Start Focus (id prefixed `digital-`) |

### Business Assumptions
1. Users focus in blocks of 15min–4hr. Sessions under 1 minute are valid but rare.
2. Sound preferences are device-level (silent on phone, audio on desktop) — not synced.
3. The anonymous clock is the primary acquisition channel (word of mouth, shareability).
4. Tags are personal (no shared taxonomy, no team features in v1).
5. Digital and analog modes serve different use cases (quick start vs deliberate planning) but share the same session model.

---

## 8. Architecture Documentation

### Frontend Architecture

**Framework:** React 18 with TypeScript (strict mode)  
**Build tool:** Vite 5.4  
**State management:** React hooks only — no Redux, no Zustand, no Context providers. State flows via props (intentional simplicity for v1).

**Folder Structure:**
```
src/
├── App.tsx                      # Root component
├── App.css                      # Root layout
├── main.tsx                     # ReactDOM entry
├── vite-env.d.ts                # Vite type augmentation
├── components/
│   ├── ClockCanvas.tsx/.css     # Shared container for analog + digital + ring
│   ├── AnalogClock.tsx/.css     # SVG analog face + hands
│   ├── DigitalClock.tsx/.css    # Digital readout + Start Focus flow
│   ├── FocusRing.tsx/.css       # Interactive ring overlay (unified arc)
│   ├── PlannedRingsLayer.tsx    # Concentric day rings (analog + digital)
│   ├── PauseStopControl.tsx/.css# Session pause/resume/stop (portal)
│   ├── OnboardingHint.tsx/.css  # Animated arrow + text (analog only)
│   ├── HeroMessage.tsx/.css     # Typewriter welcome
│   ├── JoinPill.tsx/.css        # Anonymous CTA
│   ├── AccountIcon.tsx/.css     # Signed-in avatar
│   ├── AuthModal.tsx/.css       # Sign-in/sign-up dialog
│   ├── SettingsDialog.tsx/.css  # Settings modal shell
│   ├── TodaySummary.tsx/.css    # Bottom-center stats pill
│   ├── TagPicker.tsx/.css       # Session tag selector (portal)
│   ├── TagIcon.tsx              # SVG tag icon renderer
│   ├── DigitalDurationPicker.tsx/.css  # Duration selector (portal)
│   ├── PlanActionCard.tsx/.css  # Planned session action card
│   ├── controls/
│   │   ├── Controls.css         # Shared glass pill styling
│   │   ├── ThemeToggle.tsx
│   │   ├── FullscreenToggle.tsx
│   │   ├── ModeToggle.tsx
│   │   ├── FormatToggle.tsx
│   │   ├── TimezoneSelector.tsx
│   │   └── CoffeeLink.tsx
│   └── settings/
│       ├── AccountPane.tsx
│       ├── HistoryPane.tsx/.css
│       ├── StatsPane.tsx/.css
│       ├── TagsPane.tsx/.css
│       ├── SoundsPane.tsx
│       └── AboutPane.tsx/.css
├── hooks/
│   ├── useAuth.ts               # Supabase auth subscription
│   ├── useFocusTrack.ts         # 3-click state machine (unified for both modes)
│   ├── useIdle.ts               # 5s inactivity detection
│   ├── useNow.ts                # RAF/second clock ticks
│   ├── useOnboardingHint.ts     # Tutorial controller
│   ├── usePersistedState.ts     # localStorage wrapper
│   ├── useTodayStats.ts         # Daily session aggregation
│   ├── useTheme.ts              # Light/dark preference
│   ├── useFullscreen.ts         # Fullscreen API wrapper
│   └── usePlannedSessions.ts    # Planned sessions from Supabase
├── lib/
│   ├── supabase.ts              # Client init + types
│   ├── sessionStore.ts          # Session CRUD
│   ├── planStore.ts             # Planned session CRUD
│   ├── tags.ts                  # Tag registry + custom tags
│   ├── haptic.ts                # Audio + vibration
│   └── timezones.ts             # IANA timezone list + zoned time
└── styles/
    └── global.css               # Design tokens + theme + reset
```

**Component Hierarchy:**
```
App
├── ClockCanvas (shared container)
│   ├── AnalogClock (or DigitalClock, mode-based)
│   └── FocusRing (always rendered, controls both modes)
│       ├── PlannedRingsLayer (concentric arcs, visible in both modes)
│       ├── OnboardingHint (analog only)
│       └── TagPicker (portal, analog)
├── DigitalClock (portal elements)
│   ├── DigitalTagPicker (portal)
│   └── DigitalDurationPicker (portal)
├── PauseStopControl (portal, when session active)
├── ThemeToggle
├── FullscreenToggle
├── TimezoneSelector
├── ModeToggle
├── FormatToggle
├── CoffeeLink
├── JoinPill / AccountIcon
├── HeroMessage
├── TodaySummary (portal, when session saved)
├── ScheduleBadge (hidden during active session)
├── PlanActionCard (portal)
├── AuthModal
└── SettingsDialog
    ├── AccountPane
    ├── HistoryPane
    ├── StatsPane
    ├── TagsPane
    ├── SoundsPane
    └── AboutPane
```

### Database Architecture

**Table: `sessions`**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique session ID |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | Owner |
| `start_time` | TIMESTAMPTZ | NOT NULL | Click-1 / Start Focus timestamp |
| `goal_time` | TIMESTAMPTZ | nullable | Click-2 timestamp (null if cleared before goal set) |
| `end_time` | TIMESTAMPTZ | NOT NULL | Click-3 / stop timestamp |
| `completed` | BOOLEAN | NOT NULL | `true` if elapsed ≥ target |
| `bonus_seconds` | INTEGER | NOT NULL DEFAULT 0 | Seconds past goal (analog only) |
| `tag` | TEXT | nullable | Tag ID (e.g., "code", "study") |
| `tz` | TEXT | NOT NULL | IANA timezone at session start |
| `date_local` | DATE | NOT NULL | Display date in session's timezone |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Write timestamp |

**Table: `planned_sessions`** (for scheduled activities)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique planned session ID |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | Owner |
| `scheduled_date` | DATE | NOT NULL | YYYY-MM-DD of planned day |
| `start_time_local` | TEXT | NOT NULL | HH:MM:SS local time |
| `duration_minutes` | INTEGER | NOT NULL | Session duration in minutes |
| `tag` | TEXT | nullable | Tag ID |
| `title` | TEXT | nullable | Custom name |
| `tz` | TEXT | NOT NULL | IANA timezone |
| `completed` | BOOLEAN | NOT NULL DEFAULT FALSE | Marked complete when worked on |
| `linked_session_id` | UUID | nullable FK | When started, linked to actual session ID |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Write timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Update timestamp |

**Indexes:**
| Name | Columns | Purpose |
|------|---------|---------|
| `sessions_user_start_idx` | (user_id, start_time DESC) | Primary query, most recent first |
| `sessions_user_date_idx` | (user_id, date_local) | Date-range queries (Stats heatmap) |
| `sessions_user_tag_idx` | (user_id, tag) | Tag filtering (future) |
| `planned_user_date_idx` | (user_id, scheduled_date) | Ring view queries |
| `planned_completed_idx` | (user_id, completed) | Show unfinished sessions |

**Row-Level Security:**
```sql
CREATE POLICY "sessions: owner only" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "planned_sessions: owner only" ON planned_sessions
  FOR ALL USING (auth.uid() = user_id);
```

### Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| **Hosting** | Render (Static Site) | Auto-deploy from `main` branch, `npm run build` |
| **Database + Auth** | Supabase (free tier) | 500 MB storage, 50K MAU, Postgres 15 |
| **DNS** | Render default | `wallclock.onrender.com` |
| **CDN** | Render built-in | Static assets served from edge |
| **Monitoring** | None (v1) | Browser console for errors |
| **Logging** | `console.warn` / `console.error` | Session save failures, RLS violations logged client-side |
| **Secrets** | `.env` (gitignored) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

---

## 9. Technical Decisions (ADR Format)

### ADR-001: Unified Ring System for Digital & Analog

**Decision:** Digital Start Focus creates a synthetic PlannedSession and renders via the same PlannedRingsLayer as analog scheduled tasks. Both modes share one countdown arc.

**Why:** Eliminates duplicate arc rendering logic, ensures visual consistency, enables cross-mode session synchronization, and simplifies state management. Users see the same arc in both modes.

**Alternatives considered:** 
- Separate digital countdown arc (rejected: two rings confuse users, harder to maintain)
- Digital timer shown as text only (rejected: users lose visual progress feedback)

**Tradeoffs:** Digital sessions create synthetic PlannedSession objects (id prefixed `digital-`), skipping Supabase `markPlannedComplete` call. Acceptable; digital sessions are ephemeral.

### ADR-002: Cloud-only, no IndexedDB

**Decision:** All session data lives in Supabase only. No offline storage.

**Why:** Eliminates sync complexity (conflict resolution, migration banners, IndexedDB versioning). The clock works offline; only saves require connectivity.

**Alternatives considered:** IndexedDB with sync-on-reconnect. Rejected: added ~2KB of SDK code, complex edge cases (merge conflicts, quota management), and minimal user benefit (focus sessions are typically online).

**Tradeoffs:** A user who works offline loses that session's data. Acceptable for v1.

### ADR-003: Supabase over custom backend

**Decision:** Use Supabase BaaS instead of a custom Express/Next.js server.

**Why:** Zero ops, free tier sufficient, auth + RLS + REST in one service. Static site deployment (Render free tier) remains viable.

**Alternatives considered:** Firebase (vendor lock-in concerns), PlanetScale + custom auth (more code), self-hosted Postgres (ops burden).

### ADR-004: Props over Context

**Decision:** All state flows via props. No React Context providers.

**Why:** The component tree is shallow (max 5 levels). Context adds indirection without solving a real problem at this scale. `refreshKey` counter pattern handles cross-component cache invalidation.

**Future:** May add Context for theme/auth if the tree deepens significantly.

### ADR-005: SVG icons over emoji

**Decision:** Replace all emoji with Feather-style SVG `<path>` icons.

**Why:** Emoji render differently across OS/browser (Android vs iOS vs Windows). SVG icons are pixel-identical everywhere. They also respect `currentColor` for theme adaptation.

### ADR-006: Sound preferences in localStorage, not Supabase

**Decision:** `wall.sound.goal` and `wall.sound.ticks` are device-local.

**Why:** Sound preferences are device-level (loud on desktop, silent on phone). Syncing them would confuse users who set different preferences per device.

### ADR-007: Special Elite for hero, not Caveat

**Decision:** Typewriter animation with Special Elite font instead of SVG handwriting.

**Why:** SVG stroke-dasharray on `<text>` traces glyph *contours* (outline paths), not writing direction. The result looked like "drawing circles" not "handwriting." Special Elite's authentic typewriter irregularity achieves the "deliberate human communication" feel through a simpler, more reliable technique.

### ADR-008: `left:0; right:0; margin:auto` for TodaySummary centering

**Decision:** Replace `left:50%; transform:translateX(-50%)` with margin-based centering.

**Why:** The transform approach couples horizontal centering with hover/active/idle transforms. Any CSS transition on `transform` (like `translateY(-1px)` on hover) caused the element to visibly jump because the browser was interpolating the X component too.

### ADR-009: Digital Mode as Opt-in, Analog as Default

**Decision:** Analog is the default display mode for browsers with large screens. Digital is a mode toggle, not the default.

**Why:** Wall Clock's core identity is the analog clock. Digital mode serves users who prefer a large time readout or quick start flows. Analog preserves the "beautiful clock" experience while digital accommodates different work styles.

**Tradeoffs:** New users must discover the mode toggle. Mitigated by mode preference persistence in localStorage.

---

## 10. API Documentation

### Supabase REST API (auto-generated from schema)

All requests include `Authorization: Bearer <JWT>` and `apikey: <anon_key>` headers, handled automatically by `@supabase/supabase-js`.

#### Insert Session
```
POST /rest/v1/sessions
Content-Type: application/json

{
  "user_id": "uuid",
  "start_time": "2026-06-06T13:00:00Z",
  "goal_time": "2026-06-06T13:30:00Z",
  "end_time": "2026-06-06T13:32:15Z",
  "completed": true,
  "bonus_seconds": 135,
  "tag": "code",
  "tz": "Asia/Kolkata",
  "date_local": "2026-06-06"
}
```

Response: `201 Created` with inserted row.

#### List Sessions (Today)
```
GET /rest/v1/sessions?user_id=eq.<uuid>&date_local=eq.2026-06-06&order=start_time.desc
```

Response: `200 OK` with array of sessions.

#### Update Planned Session Completion
```
PATCH /rest/v1/planned_sessions?id=eq.<uuid>
Content-Type: application/json

{
  "completed": true,
  "linked_session_id": "<session_uuid>"
}
```

Response: `200 OK`.

---

## 11. Deployment & Release Notes

### Latest Release: Digital Timer Unification (Merged to main, 2026-06-06)

**Branch:** `feat/digital-timer-pause` → `main` (commit `56256ef`)

**Features Added:**
- ✅ Digital Start Focus flow: tag picker → duration picker → session starts
- ✅ Unified countdown arc: single PlannedRingsLayer arc for both analog and digital modes
- ✅ Pause/Resume/Stop controls: shared between both modes
- ✅ Cross-mode synchronization: start session in digital, switch to analog, see same arc and timer
- ✅ Remaining-time text: shows below compact HH:MM in digital mode (e.g., "30m left")
- ✅ ScheduleBadge auto-hide: disappears when session active (Pause/Stop takes its slot)
- ✅ Schedule view auto-close: closes when a session starts (either mode)

**Bugs Fixed:**
- ✅ Removed separate digital countdown arc (was causing two concentric rings)
- ✅ Fixed React state updater violation (setState inside useState updater)
- ✅ Fixed temporal dead zone (TDZ) ordering (showFeedback reference before declaration)
- ✅ Restored analog click-1/2/3 functionality (pointer-events fix)

**Build Status:**
- TypeScript: 0 errors
- Vite: 160 modules, built in 6.44s
- Bundle: 470.69 KB (JS), 15.41 KB gzip (CSS), 3.82 KB gzip (HTML)

**Deploy:** Auto-deployed to Render via `main` branch. Live at https://wallclock.onrender.com.

---

## 12. Performance & Optimization Notes

### Current Bundle Size
- **Total gzipped:** ~134.5 KB (under 150 KB target ✓)
- **Breakdown:** 
  - `index-*.js`: 470.65 KB raw → 134.50 KB gzipped
  - `style-*.css`: 90.15 KB raw → 15.41 KB gzipped
  - `index.html`: 12.49 KB raw → 3.82 KB gzipped

### Optimization Opportunities (Future)
1. Code-split Settings dialog (lazy load on AccountIcon click)
2. Memoize PlannedRingsLayer SVG path calculations (current: recalc on every render)
3. Virtualize long history lists (currently all 100s of rows rendered)
4. Service worker caching (offline clock, instant page load)
5. Preload font files (currently served from Google CDN)

### Known Limitations (v1)
- No real-time session sync across tabs (only auth state syncs)
- No undo for deleted sessions (no soft-delete pattern)
- No session merging (two overlapping sessions can't be combined)
- No time-zone conversion for sessions (stored in session's local tz, can't retrospectively change)

---

## 13. Testing & QA

### Manual Test Checklist

#### Analog Mode
- [ ] Click-1/2/3 state machine works (idle → tracking → targeted → idle)
- [ ] Comet orbits on click-1
- [ ] Progress arc draws from click-1 angle
- [ ] End-point appears on click-2, draggable
- [ ] Tag picker opens on click-2 (logged-in only)
- [ ] Session saves on click-3 (logged-in only)
- [ ] Celebration fires when goal reached
- [ ] Pause/Resume works (paused state shows ⏸)
- [ ] Stop clears session

#### Digital Mode
- [ ] Full-size HH:MM:SS shows when idle
- [ ] Compact HH:MM + "Xm left" shows when session active
- [ ] Start Focus button appears when idle, fades after 5s inactivity
- [ ] TagPicker (portal) → select tag or auto-dismiss (6s)
- [ ] DurationPicker (portal) → select duration
- [ ] Session starts, countdown arc appears (matches analog arc style)
- [ ] Pause/Resume works, "Paused · Xm left" shows
- [ ] Stop clears session

#### Cross-Mode Sync
- [ ] Start session in digital, switch to analog → same arc visible, timer continues
- [ ] Start session in analog, switch to digital → same arc visible, timer continues
- [ ] Pause in digital, resume in analog (and vice versa)
- [ ] Session stops in either mode, refetch is accurate

#### Auth & Persistence
- [ ] Anonymous: sessions don't save, no JoinPill after refresh
- [ ] Google OAuth: sign in, AccountIcon appears, sessions save
- [ ] Email/password: sign up, sign in, sign out flows work
- [ ] Multiple tabs: onAuthStateChange syncs auth state across tabs
- [ ] Signed-in: TodaySummary pill appears, updates after session save

#### Settings Dialog
- [ ] Account pane: shows email, joined date
- [ ] History pane: lists today's sessions, grouped by date
- [ ] Stats pane: heatmap renders, streak shows, period dropdown works
- [ ] Tags pane: shows default + custom tags
- [ ] Sounds pane: toggle goal sound (bell/tok/silent), ticks on/off
- [ ] About pane: version, links, privacy summary
- [ ] Sidebar nav or mobile tabs: switch panes, fade transitions work
- [ ] Escape or click-outside closes dialog

#### Theme
- [ ] Light/dark toggle works
- [ ] Preference persists to localStorage
- [ ] All text/colors/grain texture transition smoothly (700ms)

#### Responsive
- [ ] Desktop (1920×1080): all controls visible, analog/digital centered
- [ ] Tablet (iPad, 768×1024): portrait mode, controls stack
- [ ] Mobile (iPhone, 375×812): portrait, all elements readable, touch-friendly
- [ ] Mobile landscape: clock resizes, hint repositions

---

## 14. Links & References

### Key Repositories & Deployments
| Resource | Link |
|----------|------|
| **GitHub Repo** | https://github.com/PRASANNAPATIL12/wall-clock |
| **Live App** | https://wallclock.onrender.com |
| **Supabase Project** | (Managed via environment variables) |
| **Render Dashboard** | https://dashboard.render.com (auto-deploy from `main`) |

### Documentation
| Topic | Link |
|-------|------|
| **README** | https://github.com/PRASANNAPATIL12/wall-clock/blob/main/README.md |
| **Issue Tracker** | https://github.com/PRASANNAPATIL12/wall-clock/issues |
| **Commit History** | https://github.com/PRASANNAPATIL12/wall-clock/commits/main |

### Design & UX
| Asset | Location |
|-------|----------|
| **Favicon** | `/public/favicon.svg`, `/public/favicon-dark.svg` |
| **Color Tokens** | `src/styles/global.css` (CSS custom properties) |
| **Fonts** | Google Fonts (Inter, JetBrains Mono, Caveat, Special Elite) |
| **Icons** | SVG paths in `TagIcon.tsx`, inline `<svg>` in components |

### External Services
| Service | Purpose | Status |
|---------|---------|--------|
| **Supabase Auth** | User sign-in (email + Google OAuth) | ✅ Configured |
| **Supabase PostgreSQL** | Session storage | ✅ Schema deployed |
| **Render** | Static hosting + auto-deploy | ✅ Live |
| **GitHub** | Source control | ✅ Active |

---

## 15. Future Roadmap (Post-MVP)

### Phase 2 Candidates
1. **Team dashboards** — View collective focus time, compare streaks
2. **Calendar integrations** — Sync with Google Calendar, Outlook
3. **Custom themes** — Users design their own color schemes
4. **Export/import** — Full data portability, backup flows
5. **Mobile app** — Native iOS/Android (React Native)
6. **Pomodoro presets** — Quick-start buttons (25m, 50m, 90m)
7. **AI insights** — "Your most productive time of day", "Recommended break duration"
8. **Community streaks** — Optional public leaderboards
9. **Focus sessions API** — Programmatic access for integrations
10. **Advanced heatmap** — Filters (by tag, by time-of-day, by duration)

### Known Technical Debt
- [ ] Settings dialog could be split via code-splitting (currently loads all panes on open)
- [ ] PlannedRingsLayer path calculations could memoize more aggressively
- [ ] History lists could virtualize (currently all rows DOM)
- [ ] Service worker + offline sync (clock works offline, but no save sync)

---

**End of PRODUCT_REFERENCE.md**

Generated by Claude Code on 2026-06-06 | Updated with Digital Timer Unification (main branch)
