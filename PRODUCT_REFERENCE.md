# PRODUCT_REFERENCE.md — Wall Clock

> Single source of truth for the entire Wall Clock application.
> Last generated: 2026-06-01

---

## 1. Executive Summary

| Field | Value |
|-------|-------|
| **Product Name** | Wall Clock |
| **URL** | https://mywallclock.onrender.com (also https://wallclock.onrender.com) |
| **Repository** | https://github.com/PRASANNAPATIL12/wall-clock |
| **Purpose** | A focus tool disguised as a beautiful clock. Users set timed focus goals on the analog dial, track sessions across days, and build a visual history of their deep work. |
| **Problem** | Most productivity apps reward *planning*. Wall Clock rewards *showing up*. No task lists, no projects, no Gantt charts — just "how long did I actually focus today?" |
| **Target Users** | Knowledge workers, students, developers, designers — anyone who blocks time for deep work and wants a calm, non-gamified record of it. |
| **Key Value Prop** | The clock is always useful (anonymous, zero-config). The productivity layer is opt-in (free account). No attention tax — controls disappear when idle. |

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
- **Anonymous visitor**: "I need a clean clock for my second monitor."
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
│  │ + Focus Ring  │  │              │                  │
│  └──────┬───────┘  └──────────────┘                  │
│         │                                             │
│  ┌──────▼───────┐  ┌──────────────┐                  │
│  │ useFocusTrack │  │  useAuth     │                  │
│  │ (state machine)│  │ (Supabase)  │                  │
│  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                          │
│  ┌──────▼──────────────────▼──────┐                  │
│  │      sessionStore.ts           │                  │
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
| **Clock engine** | `useNow`, `AnalogClock`, `DigitalClock` | Time display at frame or second precision |
| **Focus ring** | `useFocusTrack`, `FocusRing` | 3-click state machine (idle → tracking → targeted → idle) |
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

### External Systems

| System | Purpose | Integration |
|--------|---------|-------------|
| **Supabase** | Auth + Postgres + REST API | `@supabase/supabase-js` client SDK |
| **Google OAuth** | Social sign-in | Configured in Supabase Auth → Google provider |
| **Google Fonts** | Typography | `Inter`, `JetBrains Mono`, `Caveat`, `Special Elite` |
| **Render** | Static site hosting | Auto-deploy from `main` branch |
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

**Purpose:** Large monospace time display, alternative to analog.

**User Flow:**
1. User clicks ANALOG/DIGITAL toggle
2. Cross-dissolve transition (mode-layer)
3. Digital shows HH:MM:SS in JetBrains Mono
4. Format toggle (12h/24h) appears in bottom-left

**Business Rules:**
- 12-hour format shows AM/PM suffix
- Second updates at `useNow('second')` precision (not frame-level)
- Timezone selector affects displayed time

---

### 4.3 Focus Ring (3-Click Timer)

**Purpose:** Core productivity feature. Users set timed focus goals directly on the clock face.

**User Flow:**
1. **Click 1 (anywhere on ring):** Timer starts. Comet animation orbits once. Progress arc begins drawing clockwise from the click position.
2. **Click 2 (on ring):** Sets end-time goal at the clicked position. Tag picker appears (logged-in only). End-point is draggable.
3. **Click 3 (on ring):** Clears the session. If signed-in, session is saved to Supabase.

**Business Rules:**
- State machine: `idle → tracking → targeted → idle`
- Goal completion: when elapsed ≥ target, celebration fires (chime + vibration + ripples + gold bonus arc)
- Bonus time: past-target tracking in warm gold
- Lap counter: appears at hour boundaries (lap 2, 3, etc.)
- Drag: end-point can be repositioned while in `targeted` state
- Sanity cap: 6-hour maximum session (localStorage cleared after)

**Edge Cases:**
- Rapid triple-click: debounced by state transitions (each click must change state first)
- Drag past 12: angle math wraps correctly (mod 360)
- Session spans midnight: `date_local` uses the session's start timezone
- Page refresh mid-session: state restored from localStorage (`wall.track.start`, `wall.track.end`)

**Permissions:**
- Anonymous: ring works fully, but nothing is saved
- Signed-in: session saved to Supabase on click-3

---

### 4.4 Session Tags

**Purpose:** Categorize focus sessions by activity type.

**User Flow:**
1. After click-2 (goal set), tag picker slides in near the end-point
2. 14 default SVG-icon tags + custom tags shown in scrollable pill
3. Scroll-hint animation plays (easeInOutCubic peek)
4. User taps a tag → pill pulses → picker closes
5. Auto-dismiss after 4s if no selection
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
- Legacy emoji tags (from before the SVG migration) fall back to "Other" via `getTag()`
- Tags appear in History pane per-session row

---

### 4.5 Authentication

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

**Edge Cases:**
- OAuth popup blocked: Supabase falls back to redirect flow
- Network error during sign-in: error message shown in modal
- Token expiry: auto-refresh handled by Supabase SDK
- Multiple tabs: `onAuthStateChange` syncs across tabs

---

### 4.6 Settings Dialog

**Purpose:** Centralized configuration and data access.

**User Flow:**
1. Click AccountIcon (top-left) → dialog opens
2. Sidebar nav with 6 panes (SVG icons, no emoji)
3. Click a pane → content swaps
4. Escape or click-outside → closes
5. Mobile (≤720px): sidebar becomes horizontal icon tab bar

**Panes:**

| Pane | Content |
|------|---------|
| **Account** | Email, joined date, "Export my data" (JSON download), "Delete my history" (with confirmation) |
| **History** | Paginated session list grouped by date, duration bars, tag icons, completion dots |
| **Stats** | Streak card, period total card, heatmap (1W/1M/2M/3M/4M/6M/1Y), custom dropdown, glass tooltip |
| **Tags** | Default tags (read-only), custom tags (add/delete), SVG icon grid |
| **Sounds** | Goal sound selector (bell/tok/silent), drag-tick toggle (on/off) |
| **About** | Mission statement, design principles, privacy summary |

---

### 4.7 Stats / Heatmap

**Purpose:** Visual representation of focus consistency over time.

**User Flow:**
1. Open Settings → Stats
2. Default view: 1 month
3. Custom dropdown (glass popover): 1 week, 1 month, 2M, 3M, 4M, 6M, 1 year
4. Heatmap renders: always 18px square cells, month-block layout for 2M+
5. Hover cell (desktop) or tap cell (mobile) → glass tooltip with date + duration
6. Tooltip flips below cell when near top of pane (avoids stat card overlap)

**Business Rules:**
- Green palette: 5 intensity buckets (0 / <30min / 30-90min / 90-180min / >3h)
- Today's cell: red outline (--hand-second)
- Streak: consecutive days from today backward with >0 focus time
- Month blocks: 10px flex gap between months
- Horizontal scroll: when cells don't fit container (scroll-hint animation plays)
- Row labels (M T W T F S S): only for 1-2 month views
- Column labels: dates for 1M, month names for 2M+, day abbreviations for 1W

---

### 4.8 Today Summary Pill

**Purpose:** At-a-glance daily stats, always visible on the main clock page.

**User Flow:**
1. Signed-in user with ≥1 session today → pill appears bottom-center
2. Shows: `Xh Ym · N sessions · K-day streak` (flame icon at streak ≥3)
3. Hover → "Open history" glass tooltip
4. Click → opens Settings → History pane

**Business Rules:**
- Hidden when count = 0 (no "0h 0m" shown)
- Refetches when `sessionSavedTick` increments (after any session save)
- Centering: `left:0; right:0; margin:auto` (no transform coupling)
- Matches `.pill` hover behavior exactly (translateY -1px, 320ms)

---

### 4.9 Onboarding Hints

**Purpose:** Teach the 3-click ring interaction to new users.

**User Flow:**
1. Idle state → "click anywhere on the ring to start a tracking" (with animated arrow)
2. Tracking state → "click again to set your goal end-time"
3. Targeted state → "click once more to clear"

**Business Rules:**
- Anonymous users: hints shown every session (no localStorage)
- Signed-in users: each hint shown once per lifetime (stored in `wall.hint.seen`)
- Ring breathe animation (`ring-breathe`, 2.8s) pulses during all 3 hints
- Each hint visible for 5s + optional `extraVisibleMs` (extended during hero message)
- Hint text: Caveat font (handwritten), arrow drawn via SVG stroke-dashoffset
- Layout: side (desktop landscape), portrait-top (phones), hidden if cramped

---

### 4.10 Hero Message

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
- Desktop: single row (anchor technique prevents drift)
- Mobile: two rows
- Position: `top: max(52px, 10vh)` — above clock, below controls
- Reports `HERO_TOTAL_MS` to extend the idle onboarding hint

---

### 4.11 Sound Customization

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

### 4.12 Theme System

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

### Journey B: Account Creation

```
1. User clicks JoinPill
   → AuthModal opens (frosted glass)
   
2a. Google path: "Continue with Google" → OAuth redirect → return signed-in
2b. Email path: enter email + password → "Create account" → signed in

3. Modal closes automatically
   → JoinPill disappears
   → AccountIcon (initials) appears
   → TodaySummary pill appears at bottom (if sessions exist)
```

### Journey C: Signed-in Focus Session

```
1. Click ring → timer starts
2. Click ring again → goal set, tag picker appears
3. User picks "Code" tag → picker closes
4. Hover end-drop → glass tooltip shows "Code" with icon
5. Drag end-point to adjust goal time → haptic ticks on each minute
6. Goal reached → celebration → bonus tracking begins
7. Click ring → session saved to Supabase
   → TodaySummary updates
   → History pane reflects new session
   → Stats heatmap cell darkens
```

### Journey D: Reviewing Progress

```
1. Click AccountIcon → Settings opens (History pane default)
2. See today's sessions grouped with duration bars
3. Switch to Stats → see streak card + heatmap
4. Change period dropdown to "6 months" → month-block layout with scroll
5. Hover a cell → glass tooltip: "Mon, Mar 15 — 2h 14m"
6. Switch to 1 week → single row with day abbreviations
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

### Session Save Flow

```
FocusRing (click 3)
  │
  ├─ handleSessionEnd(FocusSessionEnd)
  │   ├─ userId is null? → return (anonymous, nothing saved)
  │   └─ userId exists? → saveSession({...})
  │       │
  │       ├─ Compute date_local via formatLocalDate()
  │       ├─ Convert epochs to ISO timestamps
  │       ├─ supabase.from('sessions').insert(row)
  │       │   └─ RLS checks auth.uid() = user_id
  │       │
  │       └─ onSessionSaved() → setSessionSavedTick(n+1)
  │           ├─ useTodayStats refetches
  │           └─ HistoryPane / StatsPane refetch via refreshKey
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

---

## 7. Domain Knowledge

### Terminology

| Term | Definition |
|------|-----------|
| **Session** | A single focus period: start time → end time, with optional goal and tag |
| **Goal** | The target end-time set on click-2. Shown as the end-point on the ring. |
| **Bonus** | Time tracked past the goal. Displayed as a warm gold arc. |
| **Streak** | Consecutive calendar days with ≥1 completed session |
| **Lap** | Each full hour within a session (lap 2 at 60min, lap 3 at 120min, etc.) |
| **Tag** | Activity category assigned to a session (e.g., "Code", "Study") |
| **Focus ring** | The interactive SVG overlay on the analog clock face |
| **Comet** | One-shot orbiting animation on session start |
| **Ghost track** | The faint dotted circle showing where the ring is |
| **End-drop** | The draggable marker at the goal position |
| **Head-drop** | The marker following the current minute hand |
| **Celebration** | Audio + visual feedback when goal is reached |

### Business Assumptions
1. Users focus in blocks of 15min–4hr. Sessions under 1 minute are valid but rare.
2. Sound preferences are device-level (silent on phone, audio on desktop) — not synced.
3. The anonymous clock is the primary acquisition channel (word of mouth, shareability).
4. Tags are personal (no shared taxonomy, no team features in v1).

---

## 8. Architecture Documentation

### Frontend Architecture

**Framework:** React 18 with TypeScript (strict mode)
**Build tool:** Vite 5.4
**State management:** React hooks only — no Redux, no Zustand, no Context providers. State flows via props (intentional simplicity for v1).

**Folder Structure:**
```
src/
├── App.tsx                    # Root component
├── App.css                    # Root layout
├── main.tsx                   # ReactDOM entry
├── vite-env.d.ts              # Vite type augmentation
├── components/
│   ├── AnalogClock.tsx/.css   # SVG analog face + hands
│   ├── DigitalClock.tsx/.css  # Digital readout
│   ├── FocusRing.tsx/.css     # Interactive ring overlay
│   ├── OnboardingHint.tsx/.css# Animated arrow + text
│   ├── HeroMessage.tsx/.css   # Typewriter welcome
│   ├── JoinPill.tsx/.css      # Anonymous CTA
│   ├── AccountIcon.tsx/.css   # Signed-in avatar
│   ├── AuthModal.tsx/.css     # Sign-in/sign-up dialog
│   ├── SettingsDialog.tsx/.css# Settings modal shell
│   ├── TodaySummary.tsx/.css  # Bottom-center stats pill
│   ├── TagPicker.tsx/.css     # Session tag selector
│   ├── TagIcon.tsx            # SVG tag icon renderer
│   ├── controls/
│   │   ├── Controls.css       # Shared glass pill styling
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
│   ├── useAuth.ts             # Supabase auth subscription
│   ├── useFocusTrack.ts       # 3-click state machine
│   ├── useIdle.ts             # 5s inactivity detection
│   ├── useNow.ts              # RAF/second clock ticks
│   ├── useOnboardingHint.ts   # Tutorial controller
│   ├── usePersistedState.ts   # localStorage wrapper
│   ├── useTodayStats.ts       # Daily session aggregation
│   ├── useTheme.ts            # Light/dark preference
│   └── useFullscreen.ts       # Fullscreen API wrapper
├── lib/
│   ├── supabase.ts            # Client init + types
│   ├── sessionStore.ts        # Session CRUD
│   ├── tags.ts                # Tag registry + custom tags
│   ├── haptic.ts              # Audio + vibration
│   └── timezones.ts           # IANA timezone list + zoned time
└── styles/
    └── global.css             # Design tokens + theme + reset
```

**Component Hierarchy:**
```
App
├── AnalogClock
│   └── FocusRing
│       ├── OnboardingHint
│       └── TagPicker
├── DigitalClock
├── ThemeToggle
├── FullscreenToggle
├── TimezoneSelector
├── ModeToggle
├── FormatToggle
├── CoffeeLink
├── JoinPill / AccountIcon
├── HeroMessage
├── TodaySummary
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
| `start_time` | TIMESTAMPTZ | NOT NULL | Click-1 timestamp |
| `goal_time` | TIMESTAMPTZ | nullable | Click-2 timestamp (null if cleared before goal set) |
| `end_time` | TIMESTAMPTZ | NOT NULL | Click-3 timestamp |
| `completed` | BOOLEAN | NOT NULL | `true` if elapsed ≥ target |
| `bonus_seconds` | INTEGER | NOT NULL DEFAULT 0 | Seconds past goal |
| `tag` | TEXT | nullable | Tag ID (e.g., "code", "study") |
| `tz` | TEXT | NOT NULL | IANA timezone at session start |
| `date_local` | DATE | NOT NULL | Display date in session's timezone |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT `now()` | Write timestamp |

**Indexes:**
| Name | Columns | Purpose |
|------|---------|---------|
| `sessions_user_start_idx` | (user_id, start_time DESC) | Primary query, most recent first |
| `sessions_user_date_idx` | (user_id, date_local) | Date-range queries (Stats heatmap) |
| `sessions_user_tag_idx` | (user_id, tag) | Tag filtering (future) |

**Row-Level Security:**
```sql
CREATE POLICY "sessions: owner only" ON sessions
  FOR ALL USING (auth.uid() = user_id);
```
Every query is automatically scoped to the authenticated user. A leaked anon key cannot access another user's data.

### Infrastructure

| Component | Service | Details |
|-----------|---------|---------|
| **Hosting** | Render (Static Site) | Auto-deploy from `main` branch, `npm run build` |
| **Database + Auth** | Supabase (free tier) | 500 MB storage, 50K MAU, Postgres 15 |
| **DNS** | Render default | `mywallclock.onrender.com` |
| **CDN** | Render built-in | Static assets served from edge |
| **Monitoring** | None (v1) | Browser console for errors |
| **Logging** | `console.warn` | Session save failures logged client-side |
| **Secrets** | `.env` (gitignored) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

---

## 9. Technical Decisions (ADR Format)

### ADR-001: Cloud-only, no IndexedDB

**Decision:** All session data lives in Supabase only. No offline storage.

**Why:** Eliminates sync complexity (conflict resolution, migration banners, IndexedDB versioning). The clock works offline; only saves require connectivity.

**Alternatives considered:** IndexedDB with sync-on-reconnect. Rejected: added ~2KB of SDK code, complex edge cases (merge conflicts, quota management), and minimal user benefit (focus sessions are typically online).

**Tradeoffs:** A user who works offline loses that session's data. Acceptable for v1.

### ADR-002: Supabase over custom backend

**Decision:** Use Supabase BaaS instead of a custom Express/Next.js server.

**Why:** Zero ops, free tier sufficient, auth + RLS + REST in one service. Static site deployment (Render free tier) remains viable.

**Alternatives considered:** Firebase (vendor lock-in concerns), PlanetScale + custom auth (more code), self-hosted Postgres (ops burden).

### ADR-003: Props over Context

**Decision:** All state flows via props. No React Context providers.

**Why:** The component tree is shallow (max 4 levels). Context adds indirection without solving a real problem at this scale. `refreshKey` counter pattern handles cross-component cache invalidation.

**Future:** May add Context for theme/auth if the tree deepens significantly.

### ADR-004: SVG icons over emoji

**Decision:** Replace all emoji with Feather-style SVG `<path>` icons.

**Why:** Emoji render differently across OS/browser (Android vs iOS vs Windows). SVG icons are pixel-identical everywhere. They also respect `currentColor` for theme adaptation.

### ADR-005: Sound preferences in localStorage, not Supabase

**Decision:** `wall.sound.goal` and `wall.sound.ticks` are device-local.

**Why:** Sound preferences are device-level (loud on desktop, silent on phone). Syncing them would confuse users who set different preferences per device.

### ADR-006: Special Elite for hero, not Caveat

**Decision:** Typewriter animation with Special Elite font instead of SVG handwriting.

**Why:** SVG stroke-dasharray on `<text>` traces glyph *contours* (outline paths), not writing direction. The result looked like "drawing circles" not "handwriting." Special Elite's authentic typewriter irregularity achieves the "deliberate human communication" feel through a simpler, more reliable technique.

### ADR-007: `left:0; right:0; margin:auto` for TodaySummary centering

**Decision:** Replace `left:50%; transform:translateX(-50%)` with margin-based centering.

**Why:** The transform approach couples horizontal centering with hover/active/idle transforms. Any CSS transition on `transform` (like `translateY(-1px)` on hover) caused the element to visibly jump because the browser was interpolating the X component too.

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
  "start_time": "2026-06-01T13:00:00Z",
  "goal_time": "2026-06-01T13:30:00Z",
  "end_time": "2026-06-01T13:32:15Z",
  "completed": true,
  "bonus_seconds": 135,
  "tag": "code",
  "tz": "Asia/Kolkata",
  "date_local": "2026-06-01"
}

→ 201 Created
```

#### List Sessions by Date Range
```
GET /rest/v1/sessions
  ?user_id=eq.{uuid}
  &date_local=gte.2026-03-01
  &date_local=lte.2026-06-01
  &order=start_time.desc

→ 200 OK [SessionRow[]]
```

#### List Sessions (Paginated)
```
GET /rest/v1/sessions
  ?user_id=eq.{uuid}
  &order=start_time.desc
  &offset=0
  &limit=60

→ 200 OK [SessionRow[]]
```

#### Delete All User Sessions
```
DELETE /rest/v1/sessions
  ?user_id=eq.{uuid}

→ 204 No Content
```

**Error Responses:**
| Status | Meaning |
|--------|---------|
| 401 | JWT invalid or expired |
| 403 | RLS violation (wrong user_id) |
| 500 | Supabase internal error |

---

## 11. Data Model Documentation

### Entity: Session

| Field | Type | Nullable | Lifecycle |
|-------|------|----------|-----------|
| id | UUID | No | Generated on insert |
| user_id | UUID | No | Set once on insert (from JWT) |
| start_time | Timestamp | No | Set on click-1 |
| goal_time | Timestamp | Yes | Set on click-2 (null if session had no goal) |
| end_time | Timestamp | No | Set on click-3 |
| completed | Boolean | No | Computed: end_time ≥ goal_time |
| bonus_seconds | Integer | No | Computed: max(0, (end_time - goal_time) / 1000) |
| tag | String | Yes | Set during click-2 tag picker (null if skipped) |
| tz | String | No | IANA timezone at session start |
| date_local | Date | No | Display date in session's timezone |
| created_at | Timestamp | No | Server-side `now()` on insert |

**Relationships:**
- `user_id` → `auth.users(id)` (ON DELETE CASCADE: deleting the auth user removes all sessions)

---

## 12. Integrations

### Supabase

| Feature Used | Purpose |
|-------------|---------|
| **Auth (GoTrue)** | Email/password + Google OAuth sign-in |
| **PostgreSQL** | Session storage with RLS |
| **PostgREST** | Auto-generated REST API from schema |
| **JS Client SDK** | `@supabase/supabase-js` for auth state + data queries |

**Configuration:**
- Project URL: `https://yozoebrmcksouexlsuso.supabase.co`
- Anon key: shipped in client bundle (safe with RLS)
- Auth redirect: `window.location.origin`

### Google OAuth

| Field | Value |
|-------|-------|
| Provider | Google Cloud Console |
| Client ID | `265510158371-ae9sani29k32d9fjq6fr3rknh86s92nn.apps.googleusercontent.com` |
| Redirect URI | `https://yozoebrmcksouexlsuso.supabase.co/auth/v1/callback` |
| JS Origins | `https://wallclock.onrender.com`, `http://localhost:5173` |
| Scopes | `email`, `profile` |

### Google Fonts

| Font | Weights | Purpose |
|------|---------|---------|
| Inter | 300, 400, 500, 600 | Primary UI font (`--font-display`) |
| JetBrains Mono | 200, 300, 400, 500 | Clock numerals, timer, code feel (`--font-mono`) |
| Caveat | 400, 500 | Onboarding hints (`--font-hand`) |
| Special Elite | 400 | Hero message typewriter |

---

## 13. Security Model

### Authentication
- Supabase Auth handles all credential storage, hashing, and JWT issuance
- Passwords: min 8 chars, hashed by Supabase (bcrypt)
- JWTs: 1-hour expiry, auto-refreshed by SDK
- OAuth tokens: managed entirely by Supabase + Google

### Authorization
- **Row-Level Security (RLS):** every query is filtered by `auth.uid() = user_id`
- **Anon key:** safe to ship in client bundle — it can only perform operations RLS allows
- **No admin keys in client:** service role key never leaves the Supabase dashboard

### Data Protection
- All data transmitted over HTTPS (Supabase enforces TLS)
- Session data private to each user (RLS ensures isolation)
- No cross-user data access possible even with a valid JWT
- `.env` file gitignored — secrets never committed

### Security Assumptions
1. The Supabase anon key is public (by design — RLS is the access control)
2. No PII beyond email is collected
3. No third-party analytics or tracking scripts
4. Sound preferences stored in localStorage are not sensitive

---

## 14. Performance Considerations

### Current Performance
- **Bundle:** 416 KB JS / 120 KB gzipped + 50 KB CSS / 10 KB gzipped
- **Fonts:** 4 web fonts loaded via Google Fonts CDN (preconnected)
- **First paint:** < 1s (static HTML + inline critical CSS)
- **Time to interactive:** < 2s (single JS bundle, no code splitting needed at this size)

### Optimizations Applied
- `React.memo` on AnalogClock, FocusRing (prevents unnecessary re-renders)
- `useNow('frame')` only for analog (digital uses `'second'` — fewer renders)
- No CSS-in-JS (plain CSS files — zero runtime cost)
- SVG elements: minimal DOM nodes, GPU-accelerated transforms
- `will-change: transform` on clock hands
- `requestAnimationFrame` loop with cleanup

### Future Optimization Opportunities
- Code splitting: lazy-load SettingsDialog (only needed when opened)
- Font subsetting: reduce Google Fonts payload
- Service worker: offline clock + cached assets
- Virtual list in HistoryPane for users with 1000+ sessions

---

## 15. Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| No offline session save | Sessions during network outage are lost | Accept for v1; future: queue in memory, save on reconnect |
| No account deletion (auth row) | User can delete history but not their auth.users row | Requires Supabase Edge Function (admin API) — planned for v2 |
| No email confirmation | Risk of fake accounts | Acceptable for v1 (low spam risk for a clock app) |
| No password reset UI | Users who forget password must use Supabase reset flow directly | Future: add "Forgot password?" link |
| No real-time sync | Multiple tabs don't see each other's sessions instantly | Refresh or re-open Settings to see updates |
| No team features | Individual use only | Phase 2 |
| Tags not synced | Custom tags live in localStorage per device | Future: profiles table with tag prefs |

---

## 16. Future Roadmap

### Phase 2: Engagement
- **Weekly email digest:** "You focused 14h this week — here's your breakdown"
- **Focus goals:** Set a weekly target (e.g., "20h/week") with progress ring
- **Password reset flow:** In-app "Forgot password?" link
- **Account deletion Edge Function:** Server-side auth.users row deletion

### Phase 3: Social
- **Team dashboards:** Shared workspace, aggregate heatmaps
- **Focus rooms:** Real-time presence ("3 people focusing right now")
- **Leaderboards:** Opt-in weekly ranking by focus hours

### Phase 4: Platform
- **Browser extension:** One-click focus mode from any tab
- **Desktop app (Electron/Tauri):** Native menubar clock
- **Mobile PWA:** Installable on home screen
- **API access:** Zapier/IFTTT integrations for "log focus time to Notion"

### Architecture Evolution
- Service worker for offline session queueing
- React Query (or SWR) for data fetching + cache management
- Edge Functions for server-side logic (delete account, email digest)
- Profiles table for synced preferences

---

## 17. Development Guidelines

### Coding Standards
- **TypeScript strict mode:** no `any`, no `@ts-ignore`
- **Functional components only:** no class components
- **Hooks for all logic:** no lifecycle methods
- **Named exports:** except `App` (default export for Vite)
- **No barrel files:** import directly from source

### Architectural Principles
1. **Clock-first:** The clock always works. Auth, Supabase, settings — all optional overlays.
2. **Zero-config anonymous:** No signup wall, no cookie consent, no loading screen.
3. **Progressive enhancement:** Each feature layer adds value without breaking the previous.
4. **Device respect:** No notifications, no streak anxiety, no dark patterns.

### Design Principles
1. **Minimalism:** Every element earns its space. Controls disappear when idle.
2. **Glass language:** Frosted translucent surfaces, single hairline borders, soft shadows.
3. **Apple-curve motion:** Slow-in, fast-middle, slow-out. No linear transitions.
4. **Precision:** Pixel-aligned SVG, sub-pixel hand positioning, optical spacing.

### PR/Review Expectations
- Every PR must pass `npm run type-check` and `npm run build`
- No direct pushes to `main` (use feature branches)
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `refine:`)
- No emoji in code or commit messages (matches product's no-emoji policy)

---

## 18. AI Context Preservation Section

### Important Assumptions
1. The user (Prasannagouda Patil) is the sole developer and designer.
2. "Sophisticated" means minimal, geometric, precise — NOT ornate or decorative.
3. Emoji are NEVER used in the UI — they "look cheap." All icons are SVG.
4. The design follows Apple's visual language: translucent glass, spring physics, Inter font.
5. Desktop and mobile must always be considered together (responsive-first).
6. The user thinks like Leonardo da Vinci — every detail must be intentional and deep.

### Product Philosophy
- Wall Clock exists to help people focus, not to capture their attention.
- The clock is the hero — everything else steps aside.
- No gamification that creates anxiety (no push notifications, no "you're falling behind!").
- Data belongs to the user — export anytime, delete anytime.

### User Preferences (from conversations)
- **No emoji.** Use SVG icons always.
- **No aggressive colors.** Red is reserved for the second hand and subtle emphasis.
- **No visible scrollbars.** Use scroll-hint animations instead.
- **Transitions must be slow and smooth.** Fast = cheap. Deliberate = premium.
- **The hero message font should feel like an old typing machine.** Special Elite was the chosen solution.
- **Stats cells must always be square.** Never compress into rectangles.
- **Month blocks need visible gaps.** Users should instantly see month boundaries.
- **Tooltips must use glass design.** Native browser tooltips (`title` attribute) are forbidden.

### Architectural Philosophy
- Simplicity over completeness. Ship features that work, not frameworks that might.
- Props over abstractions. React Context, Redux, and state management libraries are not needed until proven otherwise.
- CSS files over CSS-in-JS. Zero runtime cost, full browser DevTools support.
- Plain Supabase SDK over wrappers. The SDK is already thin enough.

### Non-negotiable Decisions
1. Cloud-only data (no IndexedDB)
2. Static site deployment (no custom backend)
3. Supabase for auth + data (no Firebase, no custom auth)
4. Inter for UI, JetBrains Mono for numerals, Caveat for hints
5. Glass/translucent design language throughout
6. Controls disappear on 5s idle

### Historical Context
The project evolved through these phases:
1. **Pure clock** (tasks 1–25): Analog + digital clock with themes, timezones, fullscreen
2. **Focus ring** (tasks 26–50): 3-click timer, drag, haptics, comet, onboarding
3. **Phase 1: Focus Community** (tasks 51–61+): Supabase auth, session tracking, settings, tags, stats, hero message

The user pivoted from an IndexedDB-first architecture to cloud-only early in Phase 1, which simplified the codebase significantly. The design evolved from "function-first, polish later" to full glass-morphism polish within the same branch.

---

## 19. Change Log

| Date | Change | Reason | Author |
|------|--------|--------|--------|
| 2026-06-01 | Initial document generated | Comprehensive product reference for AI context preservation | Claude + Prasannagouda Patil |
| 2026-06-01 | Phase 1 merged to main | Focus Community feature complete | Prasannagouda Patil |
