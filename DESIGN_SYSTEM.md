# DESIGN_SYSTEM.md — Wall Clock

> Single source of truth for all UI/UX decisions, visual language, and frontend engineering standards.
> Last generated: 2026-06-01

---

## 1. Design Philosophy

### Overall Philosophy
**Precision minimalism with organic warmth.** Every pixel serves the clock. The interface disappears when you're not using it and materializes gracefully when you need it. Nothing decorates — everything communicates.

### Product Personality
| Attribute | Meaning |
|-----------|---------|
| **Calm** | No attention-grabbing animations, no red badges, no urgency cues |
| **Precise** | Sub-pixel SVG rendering, optical spacing, geometric consistency |
| **Premium** | Glass surfaces, spring physics, Inter typeface, dark grain texture |
| **Human** | Handwritten onboarding hints, typewriter welcome, warm gold tones |
| **Honest** | Your data is yours. No dark patterns. Controls are transparent. |

### Brand Attributes
- **Sophisticated, not ornate** — complexity lives in the code, not on the screen
- **Minimalist, not sparse** — every removed element was a conscious decision
- **Apple-inspired, not Apple-cloned** — same values (precision, calm, quality), our own identity
- **Geometric, not cold** — warm beige backgrounds, gold accent, red second-hand life

### Emotional Goals
1. **First 3 seconds:** "This is beautiful. It just... works."
2. **First interaction:** "Oh, the ring is interactive. That's clever."
3. **After a session:** "I can see exactly how long I focused. Satisfying."
4. **After a week:** "My streak is building. I don't want to break it."

### UX Principles
1. **The clock is always the hero.** Controls, text, UI chrome — all subordinate.
2. **Idle = invisible.** After 5s of no input, everything fades. The clock owns the viewport.
3. **Progressive disclosure.** Anonymous users see just a clock. Signed-in users see stats. Power users find custom tags.
4. **No modality without escape.** Every modal closes on Esc and click-outside.
5. **Responsive is not an afterthought.** Mobile portrait, mobile landscape, tablet, desktop — every layout is designed, not just scaled.

---

## 2. Visual Identity

### Brand Direction
Quiet precision. Think: a Braun desk clock photographed for Kinfolk magazine. The interface is the product — no illustrations, no mascots, no marketing language (except the hero typewriter message, which is itself minimal).

### Visual Language
- **Surfaces:** Frosted glass (backdrop-filter blur) over grain-textured backgrounds
- **Borders:** Single hairline (1px at 8-12% opacity), never 2px, never outset
- **Shadows:** Multi-layered, always soft (no hard drop shadows)
- **Icons:** Feather-style SVG strokes (1.5px, round caps/joins, 24×24 viewBox)
- **Color:** Monochromatic + one accent (red second hand) + one celebration color (gold)
- **Motion:** Apple-curve easings with spring physics where appropriate

### Design Inspirations
| Reference | What We Take From It |
|-----------|---------------------|
| Apple macOS System Settings | Sidebar-nav dialog pattern, frosted glass |
| GitHub Contribution Heatmap | Green-palette activity grid, intensity buckets |
| Linear App | Glass surfaces, spring animations, keyboard-first |
| Braun/Dieter Rams | "Less but better" — every element has a clear purpose |
| Swiss watchmaking | Precision, the second hand as the hero, attention to the bezel |

---

## 3. Color System

### Light Theme (default)

#### Backgrounds
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--bg` | `#f4f1ec` | 244, 241, 236 | Page background — warm off-white (not stark white) |
| `--bg-elev` | `#fafaf7` | 250, 250, 247 | Elevated surfaces (modals, cards, clock face) |
| `--bg-tint` | `rgba(255,255,255,0.72)` | — | Light tint for overlays |
| `--bg-tint-strong` | `rgba(255,255,255,0.86)` | — | Strong tint (tooltip backgrounds) |

#### Foregrounds
| Token | Hex / RGBA | Usage |
|-------|-----------|-------|
| `--fg` | `#1a1a1a` | Primary text, hand fills, active icons |
| `--fg-muted` | `#6b6b6b` | Secondary text, labels, inactive icons |
| `--fg-faint` | `rgba(26,26,26,0.08)` | Subtle backgrounds (cards, hover states, heatmap b0) |
| `--fg-hairline` | `rgba(26,26,26,0.12)` | Borders slightly more visible than glass-border |

#### Accent Colors
| Token | Hex | Usage | Accessibility |
|-------|-----|-------|--------------|
| `--hand-second` | `#c8312b` | Second hand, current hour numeral, "focus" word, today-cell outline | 4.8:1 contrast on `--bg` ✓ |
| `--hand-second-soft` | `rgba(200,49,43,0.85)` | Second hand with slight transparency | Used only over dark surfaces |
| `--bonus` | `#b8893a` | Post-target bonus arc, celebration ripples | Decorative only — no text |
| `--bonus-soft` | `rgba(184,137,58,0.35)` | Bonus glow shadow | Decorative |

#### Glass System
| Token | Value | Usage |
|-------|-------|-------|
| `--glass-bg` | `rgba(255,255,255,0.32)` | Default glass surface |
| `--glass-bg-hover` | `rgba(255,255,255,0.50)` | Hover state elevation |
| `--glass-border` | `rgba(26,26,26,0.08)` | Hairline border on all glass elements |

#### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `--glass-shadow` | `0 10px 32px -12px rgba(26,26,26,0.18)` | Default glass pill shadow |
| `--glass-shadow-pop` | `0 24px 60px -16px rgba(26,26,26,0.28)` | Elevated state (dropdowns, tooltips) |
| `--shadow-face` | Multi-layer | Clock face — depth + ambient |
| `--shadow-pill` | Multi-layer | Smaller pills (CoffeeLink, TodaySummary) |
| `--shadow-pop` | Multi-layer | Modals, dialogs |

### Dark Theme

#### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0e0e10` | Page background — near-black (not pure black — avoids OLED smear) |
| `--bg-elev` | `#131315` | Elevated surfaces |
| `--bg-tint` | `rgba(22,22,24,0.70)` | Dark tint |
| `--bg-tint-strong` | `rgba(28,28,32,0.86)` | Tooltip backgrounds |

#### Foregrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--fg` | `#ece9e2` | Primary text — warm off-white (not blue-white) |
| `--fg-muted` | `#8a8784` | Secondary text |
| `--fg-faint` | `rgba(236,233,226,0.08)` | Card backgrounds, hover states |

#### Accent (Dark)
| Token | Hex | Note |
|-------|-----|------|
| `--hand-second` | `#e0463f` | Brighter red — compensates for dark bg reducing perceived saturation |
| `--bonus` | `#e6b85c` | Warmer honey gold — pops more on dark |

#### Glass (Dark)
| Token | Value |
|-------|-------|
| `--glass-bg` | `rgba(255,255,255,0.06)` |
| `--glass-bg-hover` | `rgba(255,255,255,0.12)` |
| `--glass-border` | `rgba(255,255,255,0.08)` |

### Heatmap Green Palette

| Bucket | Light Mode | Dark Mode | Condition |
|--------|-----------|-----------|-----------|
| b0 | `var(--fg-faint)` | `var(--fg-faint)` | No activity |
| b1 | `#4ac26b` at 30% | `#39d353` at 22% | < 30 min |
| b2 | `#2da44e` at 58% | `#39d353` at 48% | 30–90 min |
| b3 | `#1a7f37` at 82% | `#39d353` at 72% | 90–180 min |
| b4 | `#116329` at 100% | `#39d353` at 100% | > 3 hours |

---

## 4. Typography System

### Font Families

| Token | Family | Weight Range | Usage |
|-------|--------|-------------|-------|
| `--font-display` | Inter | 300–600 | All UI text: labels, buttons, headings, body |
| `--font-mono` | JetBrains Mono | 200–500 | Clock numerals, timer readout, durations, stat values |
| `--font-hand` | Caveat | 400–500 | Onboarding hint text (handwritten whisper) |
| *(hero only)* | Special Elite | 400 | Hero typewriter message |

### Font Scale

| Context | Size | Weight | Tracking | Line Height |
|---------|------|--------|----------|-------------|
| Settings heading (h3) | 15px | 500 | -0.01em | 1.3 |
| Auth modal title | 19px | 600 | -0.02em | 1.2 |
| Stat card value | 22px | 500 | -0.02em | 1.0 |
| Nav item | 13px | 400 (500 active) | 0 | 1.4 |
| Label (uppercase) | 10.5px | 500–600 | 0.04–0.06em | 1.2 |
| Body text | 13px | 400 | 0 | 1.5 |
| Muted hint | 11–12px | 400 | 0–0.02em | 1.4 |
| Clock numeral | 3.4px (SVG) | 400 (mono) | 0 | — |
| Current hour numeral | 4.6px (SVG) | 500 (mono) | 0 | — |
| Timer readout | clamp(11.5px, 1.8vmin, 14.5px) | 300 (mono) | -0.01em | — |
| Hero typewriter | clamp(12px, 1.1vw+0.4vh, 14.5px) | 400 | 0.06em | 1.5 |
| Onboarding hint | clamp(21px, 3.6vmin, 30px) | 400 italic (Caveat) | 0 | 1.3 |

### Font Features
```css
font-feature-settings: 'ss01', 'kern';
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
```

---

## 5. Spacing System

### Base Unit
No strict 4px/8px grid — spacing is optical. Values chosen per-component for visual balance.

### Common Spacings

| Token / Usage | Value | Context |
|--------------|-------|---------|
| Control corner offset | 28px (18px mobile) | ThemeToggle, FullscreenToggle, etc. |
| Control gap | 10px | Between pills in a corner group |
| Glass pill padding | 0 16px | Horizontal padding inside pills |
| Glass pill height | 38px (32px on smaller) | Standard interactive height |
| Card padding | 10–13px | Stats cards, tag badges |
| Modal padding | 26–28px | AuthModal, SettingsDialog |
| Section gap | 16–22px | Between sections in settings panes |
| Heatmap cell gap | 2px (within block) | Between grid cells |
| Month block gap | 10px | Between month blocks in heatmap |

### Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| **Mobile** | ≤ 640px | Controls shrink, Settings goes horizontal tabs, hero 2-row |
| **Tablet portrait** | ≤ 720px | Settings dialog collapses to column layout |
| **Small mobile** | ≤ 480px | Settings dialog sheets from bottom, timer text smaller |
| **Desktop** | > 720px | Full sidebar Settings, hero single-row |

---

## 6. Component Library

### 6.1 Glass Pill (`.pill`)

**Purpose:** Primary interactive surface. Used by all controls, summary pills, toggles.

| Property | Value |
|----------|-------|
| Height | 38px |
| Border radius | 999px (full round) |
| Background | `var(--glass-bg)` |
| Border | `1px solid var(--glass-border)` |
| Backdrop filter | `blur(24px) saturate(160%)` |
| Box shadow | `var(--glass-shadow)` |
| Font | Inter 13px/500, -0.005em tracking |

**States:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `--glass-bg-hover`, `translateY(-1px)` |
| Active | `scale(0.985)`, 120ms transition |
| Idle (body.idle) | `opacity: 0`, `translateY(±8px)`, `pointer-events: none` |

**Variants:**
- `.pill--icon`: 42px circular, no padding
- Coffee link: 32px height, 12px font

---

### 6.2 Segmented Toggle (`.seg`)

**Purpose:** Binary/ternary option switch (Analog/Digital, 12h/24h).

| Property | Value |
|----------|-------|
| Height | 38px |
| Indicator | Sliding background, 520ms spring easing |
| Labels | 11px uppercase, 0.14em tracking |
| Active label color | `var(--bg-elev)` (inverted) |

---

### 6.3 Glass Modal / Dialog

**Purpose:** Overlay surfaces for auth and settings.

| Property | Value |
|----------|-------|
| Backdrop | `rgba(0,0,0,0.28)`, blur 10px |
| Surface | `var(--bg-tint-strong)`, blur 40px |
| Border radius | 20px |
| Shadow | `var(--shadow-pop)` |
| Animation | scale 0.95→1, translateY 8→0, 360ms spring |
| Close | `×` icon button, Esc key, click-outside |

---

### 6.4 Glass Tooltip

**Purpose:** Contextual information on hover (TagPicker, heatmap, TodaySummary, end-drop).

| Property | Value |
|----------|-------|
| Background | `var(--bg-tint-strong)`, blur 20px |
| Border | `1px solid var(--glass-border)` |
| Border radius | 7px |
| Padding | 4px 9px |
| Font | Inter 11px/500 |
| Animation | translateY 3px→0, 110ms ease-apple |
| Positioning | `position: absolute` relative to nearest ancestor (NOT fixed — avoids backdrop-filter containing-block bug) |

---

### 6.5 Custom Dropdown (Period Selector)

**Purpose:** Replace native `<select>` with glass-styled popover.

| Property | Value |
|----------|-------|
| Trigger | Glass pill with animated chevron (rotates 180°) |
| Popover | `var(--bg-tint-strong)`, blur 32px, 12px radius |
| Shadow | `var(--shadow-pop)` |
| Items | 12.5px, hover bg `--fg-faint`, active shows checkmark |
| Animation | `translateY(-4px) scale(0.97)` → `0 scale(1)`, 180ms |
| Close | Click-outside, Escape key |

---

### 6.6 SVG Icon

**Purpose:** All icons throughout the app. No emoji ever.

| Property | Value |
|----------|-------|
| ViewBox | `0 0 24 24` |
| Fill | `none` |
| Stroke | `currentColor` |
| Stroke width | 1.5 (default), 1.6 (nav), 2 (close ×) |
| Stroke linecap | `round` |
| Stroke linejoin | `round` |
| Sizes | 11px (flame), 13px (tag manage +), 15px (tag icons, nav icons), 16px (close) |

---

### 6.7 Tag Badge (History Pane)

**Purpose:** Display session tag in a compact chip.

| Property | Value |
|----------|-------|
| Size | 26×26px |
| Border radius | 8px |
| Background | `var(--fg-faint)` |
| Icon | TagIcon at 13px, `--fg-muted` color |

---

### 6.8 Stat Card

**Purpose:** Numeric KPI display (streak, total time).

| Property | Value |
|----------|-------|
| Padding | 10–13px |
| Border radius | 12px |
| Background | `var(--fg-faint)` |
| Label | 10.5px uppercase, `--fg-muted` |
| Value | 22px/500, `--fg` |
| Mono variant | JetBrains Mono, 18–20px |

---

## 7. Layout Patterns

### Main Stage
```css
.stage { 
  height: 100dvh; 
  display: grid; 
  place-items: center; 
}
```
Clock centered via grid. Controls fixed to corners. Modals layered via z-index.

### Settings Dialog Layout
```
Desktop (>720px):           Mobile (≤720px):
┌──────┬────────────┐      ┌──────────────────┐
│ Nav  │  Content   │      │ 👤 📜 📊 🏷 🔊 ℹ│ ← icon tabs
│ 172px│  flex:1    │      ├──────────────────┤
│      │            │      │   Content area    │
│      │            │      │                   │
│signout│           │      └──────────────────┘
└──────┴────────────┘
```

### Responsive Behavior
| Element | Desktop | Mobile (≤640px) |
|---------|---------|----------------|
| Hero message | Single row | Two rows |
| Controls | 28px from corners | 18px from corners |
| Settings dialog | Sidebar nav | Horizontal icon tabs |
| Settings modal | Centered, max 760×600 | Bottom sheet, 90vh |
| TagPicker | Near end-point | Bottom-center fixed |
| Timer text | clamp max 14.5px | clamp max 12.5px |

---

## 8. Interaction Design

### Hover States
- **Glass pill:** `translateY(-1px)`, background brightens to `--glass-bg-hover`
- **Nav item:** background `--fg-faint`, color brightens to `--fg`
- **Heatmap cell:** `scale(1.22)`, box-shadow depth, `brightness(1.1)`, 220ms soft-spring
- **Tag badge (history):** background `--fg-faint` on row hover
- **Dropdown item:** background `--fg-faint`, color `--fg`

### Active States
- **Glass pill:** `scale(0.985)`, 120ms transition (snappy feedback)
- **Tag picker button:** `scale(1.22)` pulse animation, 240ms spring
- **Segmented toggle:** Sliding indicator, 520ms spring

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--hand-second);
  outline-offset: 3px;
  border-radius: 8px;
}
```

### Disabled States
- `opacity: 0.4–0.5`
- `cursor: not-allowed`
- No hover/active transitions

### Drag States
- **End-drop hit zone:** `cursor: grab` → `cursor: grabbing` during drag
- **Visible drop:** `stroke-width: 1.4` on hover (thickens to signal grabbability)
- **Ring class:** `is-dragging-end` applied during drag

---

## 9. Animation System

### Motion Philosophy
**Deliberate, not decorative.** Every animation communicates state change. No animation exists purely for visual interest. Speed is inversely proportional to the element's importance: the clock hands are continuous (∞ duration), the comet is a 1.9s flourish, a tooltip appears in 110ms.

### Easing Standards

| Token | Curve | Character | Usage |
|-------|-------|-----------|-------|
| `--ease-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard deceleration | Fades, opacity transitions |
| `--ease-apple` | `cubic-bezier(0.32, 0.72, 0, 1)` | Apple-signature smooth | Most UI transitions (pills, modals) |
| `--ease-spring` | `cubic-bezier(0.5, 1.5, 0.4, 0.97)` | Pronounced overshoot | Toggle indicators, comet orbit |
| `--ease-soft-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Gentle overshoot | Heatmap cell hover, celebrations |

### Duration Standards

| Token | Value | Usage |
|-------|-------|-------|
| `--d-fast` | 220ms | Quick state changes (icon swap, tooltip) |
| `--d-base` | 360ms | Standard transitions (modal, panel) |
| `--d-slow` | 650ms | Elaborate animations (mode cross-dissolve) |
| `--d-theme` | 700ms | Theme color transitions (everything changes at once) |

### Key Animations

| Name | Duration | Easing | Trigger | Purpose |
|------|----------|--------|---------|---------|
| `ring-reveal` | 3.6s | ease-apple | Page load | Flash the ghost track to show ring exists |
| `ring-breathe` | 2.8s ∞ | ease-in-out | Onboarding hint active | Pulse track during tutorial |
| `comet-orbit` | 1.9s | cubic-bezier(0.6,0.05,0.25,1) | Click-1 (session start) | One-shot tail orbit from click to minute hand |
| `goal-glow` | 1.4s | ease-apple | Goal reached | Arc glow brightens |
| `bonus-breath` | 6s ∞ | ease-apple | Post-goal | Gentle gold arc pulse |
| `drop-end-pop` | 1.2s | spring | Goal reached | End marker scale bounce |
| `ripple-out` | 1.4s | ease-apple | Goal reached | Two gold expanding circles |
| `head-pulse` | 2.2s ∞ | ease-apple | Tracking/targeted | Minute-head opacity oscillation |
| `timer-in` | 480ms | ease-apple | Timer appears | Scale 0.94→1, fade in |
| `tag-picked-pulse` | 240ms | spring | Tag selected | Scale 1→1.22→1 |
| `hint-line-draw` | 1.9s | cubic-bezier(0.4,0.05,0.2,1) | Hint appears | SVG stroke-dashoffset 100→0 |
| `hint-arrow-travel` | 1.9s | same as line | Hint appears | offset-distance 0→100% |
| `numeral-rise` | 900ms | ease-apple | Hour changes | Current numeral scale + glow |
| `cursor-blink` | 0.6s ∞ | step-end | Hero typing | Block cursor 0→55%→0 |
| `dd-in` | 180ms | ease-apple | Dropdown opens | Scale 0.97→1, translateY -4→0 |
| `stats-tip-in` | 120ms | ease-apple | Heatmap cell hover | Tooltip fade + slight translate |

### Scroll Hint Animation (TagPicker / Stats)
```
t=0      Wait (element just appeared)
t=350ms  Ease-in-out scroll right 40–48px over 750ms
t=1100ms Hold at scroll position for 650ms
t=1750ms Ease-in-out scroll back to 0 over 550ms
```
Uses `requestAnimationFrame` with hand-crafted `easeInOutCubic`: `t < 0.5 ? 4t³ : 1 - (-2t+2)³/2`. NOT browser `behavior:'smooth'` (unpredictable velocity).

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```
All animations instantly resolve to their end state. Functionality is preserved.

---

## 10. Accessibility Standards

### Keyboard Navigation
- `Tab` navigates between interactive elements
- `Escape` closes all modals and dialogs
- `Enter` activates buttons and menu items
- Focus ring: 2px `--hand-second`, 3px offset, 8px radius

### Contrast
- Primary text (`--fg` on `--bg`): >15:1 (both themes)
- Muted text (`--fg-muted` on `--bg`): >4.5:1
- Second-hand red on background: >4.5:1
- Glass surfaces: reliance on backdrop-filter for legibility (acceptable per WCAG for decorative UI)

### Screen Readers
- `aria-label` on all icon-only buttons
- `aria-hidden` on decorative elements (grain, vignette, icons, hero message)
- `role="dialog"` + `aria-modal="true"` on modals
- `role="img"` + `aria-label` on heatmap
- `role="listbox"` on custom dropdown
- `.sr-only` class for SEO `<h1>` and supplementary text

### Touch Targets
- Minimum 32px (mobile pills)
- End-drop hit zone: ~74px on desktop, ~34px on mobile
- Ring hit band: 10 viewBox units wide (~60px at 620px clock)

---

## 11. Responsive Design Standards

### Mobile-first Strategy
CSS is written desktop-first (due to the clock's landscape-optimal nature), with `@media (max-width)` breakpoints for mobile adaptation.

### Breakpoints

| Width | Name | Key Changes |
|-------|------|-------------|
| ≤ 480px | Small mobile | Settings → bottom sheet; timer → smaller font |
| ≤ 640px | Mobile | Controls shrink; hero → 2 rows; TagPicker → bottom-center |
| ≤ 720px | Tablet portrait | Settings → horizontal tabs; dialog → 90vh |
| > 720px | Desktop | Full sidebar Settings; hero single-row; all features visible |

### Layout Adaptation Rules
1. The clock always fills `min(70vmin, 620px)` — never distorts
2. Corner controls reposition from 28px → 18px
3. Settings dialog: sidebar → tab bar (no intermediate state)
4. TagPicker: angle-positioned → bottom-center fixed
5. Onboarding hint: side layout → portrait-top layout (based on aspect ratio, not width)

---

## 12. UX Patterns

### Empty States
- History (no sessions): "No sessions yet. Click on the focus ring around the clock to start one."
- Stats (loading): "Loading…" in muted text
- TodaySummary: hidden entirely when count = 0

### Loading States
- History pane: "Loading…" text (no spinner — too mechanical for this product)
- Stats pane: "Loading…" text
- Auth: button text changes to "Please wait…"

### Error States
- Auth error: Red-tinted panel in AuthModal (background `rgba(200,49,43,0.1)`)
- Session save failure: Silent (console.warn only) — the clock must never feel broken

### Validation
- Email: HTML5 `type="email"` + `required`
- Password: `minLength={8}` + `required`
- Custom tag: `maxLength={24}`, trimmed on submit
- Session: endTime > startTime (enforced in `sessionStore.ts`)

### Confirmation
- Delete history: two-step — "Delete my history" → "Yes, delete everything" + "Cancel"
- Sign out: single click (no confirmation — low-risk action)

---

## 13. Design Tokens

### Complete Token Reference

```css
/* Typography */
--font-display: 'Inter', system-ui, sans-serif
--font-mono: 'JetBrains Mono', monospace
--font-hand: 'Caveat', cursive

/* Easing */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-apple: cubic-bezier(0.32, 0.72, 0, 1)
--ease-spring: cubic-bezier(0.5, 1.5, 0.4, 0.97)
--ease-soft-spring: cubic-bezier(0.34, 1.56, 0.64, 1)

/* Duration */
--d-fast: 220ms
--d-base: 360ms
--d-slow: 650ms
--d-theme: 700ms

/* Radius */
999px     — pills, toggle indicators, tags
20px      — modals, dialogs
16px      — settings dialog (pre-2026)
12px      — stat cards, input fields, dropdown lists
10px      — buttons (auth submit, Google)
9px       — tooltips
8px       — nav items, input fields, close buttons
7px       — glass tooltips
2px       — heatmap cells

/* Shadows — documented in Color System section */

/* Z-index scale */
0   — grain texture, vignette
7   — hero message
8   — TagPicker, TodaySummary
9   — JoinPill, AccountIcon, end-drop tooltip
10  — corner controls
20  — heatmap tooltip
50  — custom dropdown popover
90  — SettingsDialog
100 — AuthModal
200 — (reserved for future toasts/alerts)
```

---

## 14. Frontend Engineering Standards

### CSS Architecture
- **One CSS file per component** (co-located: `Component.tsx` + `Component.css`)
- **Global tokens in `global.css`** only — no component defines its own color variables
- **BEM-inspired naming:** `.component__element--modifier` (e.g., `.hero-msg__line--2`)
- **No CSS-in-JS:** Zero runtime cost. Browser DevTools can inspect everything.
- **No Tailwind:** The glass design system doesn't map well to utility classes.

### Naming Conventions
- Components: PascalCase (`StatsPane.tsx`)
- Hooks: camelCase with `use` prefix (`useFocusTrack.ts`)
- Library modules: camelCase (`sessionStore.ts`, `haptic.ts`)
- CSS classes: kebab-case (`.settings-nav__item.is-active`)
- CSS state classes: `.is-*` prefix (`.is-active`, `.is-dragging`, `.is-fading`)
- CSS custom properties: `--category-name` (e.g., `--glass-bg`, `--hand-second`)

### Component Patterns
- **Functional only.** No class components.
- **`memo()` for expensive renders:** AnalogClock, FocusRing, OnboardingHint, Ticks, Numerals.
- **Refs for imperative DOM:** `svgRef` for getBoundingClientRect, `endDropRef` for Web Animations.
- **Inline styles for dynamic values:** CSS custom properties set via `style={{...}}` (e.g., grid template columns, tooltip position).
- **No forwardRef unless needed:** Only used when parent needs imperative access.

### Reusability Guidelines
- **TagIcon:** Single component renders any TagDef as SVG — reused in TagPicker, TagsPane, HistoryPane, end-drop tooltip.
- **Glass surface pattern:** Copy the `--glass-bg` + `backdrop-filter` + `--glass-border` + `--glass-shadow` quartet. Don't create a wrapper component — the CSS is simpler.
- **animateScroll():** Shared easeInOutCubic scroll utility — extracted into TagPicker, reusable from StatsPane.

---

## 15. Future Design Rules

### What Future Designs MUST Follow
1. **Glass surfaces for all floating UI.** Every pill, tooltip, modal, dropdown uses the backdrop-filter glass pattern.
2. **SVG icons only.** Never emoji, never icon fonts, never images for icons.
3. **Inter for UI text.** No font mixing within the UI layer (Caveat/Special Elite are for specific storytelling moments only).
4. **Spring easing for interactive feedback.** Hover lifts, toggle slides, modal entrances.
5. **Apple-curve easing for fades and slides.** Content transitions, theme changes, idle states.
6. **Idle-fade on all floating elements.** `body.idle` → `opacity:0, translateY(±8px), pointer-events:none`.
7. **Tooltips via position:absolute** (never position:fixed — backdrop-filter creates containing blocks).
8. **Scrollbar hiding** with scroll-hint animation for overflow content.
9. **2px `--hand-second` red** outline for "today" indicators.
10. **Warm palette.** Backgrounds are off-white/near-black, never stark white/pure black.

### What Future Designs MUST Avoid
1. **No emoji anywhere in the product.** They render inconsistently and read as cheap.
2. **No visible scrollbars.** `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`.
3. **No native browser tooltips.** Never use `title` attributes for information display.
4. **No linear easing.** Linear motion reads as mechanical/digital — antithetical to the organic feel.
5. **No solid color backgrounds for interactive elements.** Always glass (translucent + blur).
6. **No border-width > 1px.** Hairlines only.
7. **No pure black (#000) or pure white (#fff).** Always warm-shifted.
8. **No font-weight > 600.** The design is light and quiet, not bold and loud.
9. **No box-shadow with zero blur.** All shadows must be soft/diffuse.
10. **No z-index wars.** Follow the documented z-index scale.

### Consistency Requirements
- Every new modal/dialog must close on Esc + click-outside
- Every new floating element must idle-fade at 5s
- Every new glass surface must use the same 4-token pattern (bg + border + blur + shadow)
- Every new button must respond to hover (+lift) and active (+scale)
- Every new stat/duration must use `--font-mono`

---

## 16. AI Design Context Preservation

### Why These Design Decisions Were Made

**Glass surfaces:** The clock is a physical object metaphor. Glass controls float in front of it like a transparent overlay on a real wall clock. This is the core visual metaphor — not "glassmorphism for aesthetics" but "these are controls on top of an object."

**Red second hand as the only color accent:** A physical clock's second hand is the only moving, colored element. Everything else is monochrome. We follow the same principle — red means "time is moving, pay attention here."

**Gold for celebration:** The bonus arc and completion ripples use warm gold because gold is the color of achievement in physical culture (trophies, medals, gold stars). It's instinctive.

**Controls disappear on idle:** A wall clock on your wall doesn't have visible buttons. You only see the face. Our idle state recreates that experience — when you're focused, only the clock exists.

**Spring physics on toggles but not on modals:** Toggles are physical switches — they overshoot and settle. Modals are surfaces — they slide into place and stop cleanly. The physics match the metaphor.

### Visual Priorities
1. Clock face legibility (always)
2. Timer readout visibility (during session)
3. Ring interaction affordance (for new users)
4. Settings information density (when actively managing)

### UX Priorities
1. Zero-friction first experience (no signup, no loading)
2. Non-disruptive feedback (celebration is visual + audio, never a blocking modal)
3. Data sovereignty (export, delete — always accessible)
4. Device respect (no push notifications, no wake locks)

### Design Constraints
- **Bundle size:** Total < 150 KB gzipped (currently 120 KB)
- **No images:** Everything is SVG, CSS, or generated (grain noise is inline SVG)
- **No build-time assets:** Google Fonts loaded at runtime
- **4 font families maximum:** Inter + JetBrains Mono + Caveat + Special Elite

### Non-negotiable Patterns
1. The clock is ALWAYS the largest element on screen
2. Glass blur is ALWAYS `blur(24px) saturate(160%)` for standard elements
3. The second hand is ALWAYS the brightest color on the page
4. Transitions are ALWAYS slower than the developer's instinct (320ms minimum for UI, 700ms for theme)
5. Hover lifts are ALWAYS exactly `-1px` (not -2px, not 0)

---

## 17. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-06-01 | Initial document generated | Comprehensive design system for AI context preservation |
| 2026-06-01 | Phase 1 design complete | Glass modals, SVG icons, heatmap, typewriter hero, all polished |
