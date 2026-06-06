# CINEMATIC_LANDING_PLAN.md — Focus Clock

> **Branch:** `feat/cinematic-landing-page`
> **Director's brief:** Transform the homepage into a cinematic, scroll-driven film where the existing clock is the protagonist. The user scrolls through scenes — pinned cameras, parallax depths, zoom transforms, horizontal sequences — and lands in the live app at the end.
> **Audience:** Desktop-first professionals, designers, developers, students. Mobile graceful (not flagship).
> **Tone:** Premium, restrained, observational. Apple's keynote pacing × Awwwards craft × Notion's clarity.
> **Last updated:** 2026-06-06

---

## TABLE OF CONTENTS

1. [Step 1 — Comprehensive Analysis & Vision](#step-1--comprehensive-analysis--vision)
2. [Step 2 — Scene-by-Scene Storyboard](#step-2--scene-by-scene-storyboard)
3. [Step 3 — Implementation Guidance](#step-3--implementation-guidance)
4. [Routing & Mounting Strategy](#routing--mounting-strategy)
5. [Asset Inventory (GIFs, Logos, Screens)](#asset-inventory-gifs-logos-screens)
6. [Performance & Accessibility Budget](#performance--accessibility-budget)
7. [SEO Considerations](#seo-considerations)
8. [Mobile Adaptation Strategy](#mobile-adaptation-strategy)
9. [Build Order (Incremental, Buildable Steps)](#build-order-incremental-buildable-steps)
10. [Risks & Edge Cases](#risks--edge-cases)
11. [Validation Checklist](#validation-checklist)

---

# Step 1 — Comprehensive Analysis & Vision

## 1.1 Current Homepage — What We Have Today

| Layer | Current State |
|-------|--------------|
| **Visual identity** | Apple-restrained: warm off-white (`#f4f1ec`) / near-black (`#0e0e10`), red second-hand accent (`#c8312b`). Fonts: Inter (UI), JetBrains Mono (digital), Caveat (handwritten hints), Special Elite (hero typewriter). |
| **Layout** | Single-stage fullscreen app. `position: fixed; inset: 0` covers the entire viewport. No scrolling exists. |
| **Content** | Live clock (analog OR digital) + interactive focus ring + corner controls (theme, fullscreen, timezone, mode, format, coffee). For signed-in users: AccountIcon, TodaySummary pill, ScheduleBadge. For anonymous: HeroMessage typewriter ("Not here for your attention. Here for your focus."). |
| **Static SEO content** | `#app-landing` div with hidden H1, three paragraphs of description, hidden by inline `display:none` script when JS runs. Visible only to bots. |
| **Microinteractions** | 5s idle-fade on all controls, ring breathe animation, comet on first click, onboarding hints (handwritten arrows), haptic ticks, celebration ripples, glass-pill hovers. |

## 1.2 Existing Narrative — What Story Are We Telling?

The current app *implies* a philosophy but doesn't *show* it:

> "A clock that respects your attention. Track focus without being tracked. Beautiful, calm, observational."

But there's **no journey**. A first-time visitor sees the clock, doesn't know what it does, may never click the ring, and leaves. The "story" lives only inside the product once you've used it.

## 1.3 Strengths to Preserve

✅ **The clock IS the brand.** It must remain the protagonist. Do not bury it behind a marketing wall.
✅ **Restraint is the differentiator.** Notion has clarity. Apple has restraint. Linear has speed. Focus Clock has *calm*. No bright gradients, no carousel of screenshots, no testimonial slider.
✅ **Live, working clock as the hero.** Visitors arrive at a real, functioning clock — not a static screenshot. This is rare and powerful.
✅ **Dark/light theme tokens already exist** (`global.css` lines 21–115). Cinematic scenes can drive theme transitions during scroll.
✅ **Refined typography stack** already loaded (Inter, JetBrains Mono, Caveat, Special Elite).

## 1.4 Gaps & Opportunities

❌ **No feature discovery.** Visitor can't learn that streaks, heatmap, tags, planned sessions exist without signing in.
❌ **No social proof.** Trust signals ("Used by 1M+ humans at Harvard, MIT, Apple, Netflix, Amazon") are absent.
❌ **No future roadmap visible.** Users don't know that themes/wallpapers, background ambient audio (rain, café noise) are coming.
❌ **No footer with brand identity.** No company name "Focus Log," no privacy/terms hub, no contact, no GitHub credit.
❌ **No conversion path beyond Join pill.** The CTA is buried in the corner.
❌ **No "wow moment."** Once you've seen the clock, you've seen the page.

## 1.5 The Vision — "A Quiet Film About Focus"

Treat the homepage like a **short film, 6 minutes of scroll, 8 scenes**. The user controls the camera. The clock is the only character. Each scene is a meditation on one aspect of focus — and a reveal of one product feature.

**The emotional arc:**

| Beat | Scene | Feeling |
|------|-------|---------|
| **Hook** | The clock is alive | Curiosity, calm |
| **Inciting moment** | Zoom into the dial — your time is finite | Reverence, urgency |
| **Promise** | Set goals on the ring | Anticipation |
| **Discovery** | Tag, plan, track, streak, heatmap | Empowerment |
| **Future** | Ambient sounds, themed wallpapers coming soon | Possibility |
| **Authority** | Trusted by 1M+ at Harvard, MIT, Apple… | Validation |
| **Invitation** | Sign in / Start using | Decision |
| **Credits** | Footer | Resolution |

**Length:** ~12,000–14,000px of scroll (≈ 8 viewport heights on a 1080p screen). Pacing: slow at start (linger on the clock), brisk through features (rapid reveals), slow again at footer (let it breathe).

**Key user takeaway:** "This is not a productivity app. It's a clock that quietly helps me notice how I spend my time."

## 1.6 Cinematic Techniques We'll Use

| Technique | Where |
|-----------|-------|
| **Sticky/pinned camera** | The clock stays centered for Scenes 1–3 while content scrolls past it |
| **Scroll-driven zoom** | Scene 2 — camera dives into the clock face, reveals microscopic detail |
| **Parallax depth** | Scenes 4–6 — feature cards float at different scroll speeds |
| **Horizontal scroll-in-vertical** | Scene 4 — feature gallery scrolls sideways inside a pinned panel |
| **Scrubbed video/GIF** | Each feature has a screen recording GIF that "plays" based on scroll position |
| **Magnetic cursor + custom pointer** | Desktop only — circular pointer pulls toward CTAs |
| **Text reveals** | Word-by-word fade (or "split text" mask reveals) for headlines |
| **Number counters** | "1,000,000+ humans" counts up as it enters viewport |
| **Logo grid morph** | "Trusted by…" logos fade in stagger, slight rise from below |
| **Credits roll** | Footer scrolls like film credits — names, links, version |

## 1.7 Theme Strategy — REFINED

**Decision:** Support BOTH light and dark themes **fully throughout** the cinematic experience.

**Reasoning:**
- The user's theme preference is sacred. We don't override it during marketing.
- The "scroll-driven theme switch" originally proposed for Scene 5/6 (light → dark) is removed. It's gimmicky and breaks user trust.
- Both themes already have complete design tokens (`global.css` lines 21–115).
- Every scene must be designed and tested in both themes.

**Theme toggle visibility:**
- **Scene 1 only:** Existing theme toggle (top-left) remains visible — exactly as the current app.
- **Scene 2 onward:** Theme toggle fades out (along with all other controls). Why? The cinematic flow demands a clean canvas. Returning to Scene 1 (or smooth-scroll to top) restores them.
- **Footer:** Theme toggle does NOT reappear. Users can toggle theme from `/app` if needed.

**Visual treatment per theme:**

| Element | Light Theme | Dark Theme |
|---------|------------|-----------|
| Background (default scenes) | `#f4f1ec` warm cream | `#0e0e10` near-black |
| Background (Scene 2 blackout) | Deep charcoal `#1a1a1a` with vignette | Pure black `#000` with vignette |
| Headlines | `#1a1a1a` near-black | `#ece9e2` warm white |
| Feature card glass | `rgba(255,255,255,0.32)` | `rgba(255,255,255,0.06)` |
| Logo grid | Logos at 60% opacity desaturated, full color on hover | Logos at 50% opacity inverted, full color on hover |
| Particle dots (Scene 5) | `rgba(0,0,0,0.15)` | `rgba(255,255,255,0.10)` |
| CTA primary | Red `#c8312b` | Red `#e0463f` |

All scenes use existing CSS custom properties — no hardcoded colors. Theme switches at Scene 1 will visually propagate through all scenes via the cascade.

---

# Step 2 — Scene-by-Scene Storyboard

> **Format note:** Each scene specifies *visual composition*, *animations & easings*, *scroll timing*, *narrative purpose*, and *mobile adaptation*.

## SCENE 0 — Pre-roll: Quiet Loading (0–400ms before paint)

**Visual:** Pure background color (`--bg`). No clock yet. A single 4px circle pulses once at center. Fade out.
**Purpose:** Reduce CLS, signal premium load. Like the Universal Studios pre-roll before a film.
**Easing:** `cubic-bezier(0.32, 0.72, 0, 1)` over 400ms.
**Mobile:** Same. Identical experience.

---

## SCENE 1 — "The Clock Is Alive" (Viewport 0–1)

**Visual composition:**
```
        Top: small theme toggle, account icon (existing controls)
        
                           ╭───────────╮
                          │   12 1 2   │
                          │ 11   ·   3 │  ← The existing live clock,
                          │ 10   ·   4 │     full size, beating at 60fps
                          │   9 6 5    │
                           ╰───────────╯
        
                   "Not here for your attention."  ← Special Elite typewriter
                   "Here for your focus."
        
                           ↓ scroll
```

**What it is:** The current homepage, **unchanged**. The clock at center, controls in corners, hero message typewriter for anonymous visitors. The existing app, exactly as users see it today.

**Scroll behavior:** Static. The clock and controls live on a `position: fixed` layer (current behavior preserved). The scroll-narrative layer begins **below** this viewport. A subtle scroll-hint chevron (1.2s pulse) appears at the bottom of the screen 4 seconds after load.

**Narrative purpose:** Anchor expectation. The visitor immediately sees what the product *is* (a working clock). Nothing to interpret yet.

**Mobile:** Identical to current. Scroll hint visible at bottom.

---

## SCENE 2 — "Your Time Is Finite" (Viewport 1–2.5)

**Visual composition:**
```
[Scroll begins. Clock starts moving.]

Frame at scroll 0%:    Clock centered, full size, dimming background grain
Frame at scroll 50%:   Camera zooms in 1.6× — we see the dial detail,
                       tick marks become large, second hand sweeps massively
Frame at scroll 100%:  Camera passes THROUGH the dial. The clock fades 
                       into a soft radial blur, and a single sentence 
                       fades in over black:
                       
                       "Every moment you don't measure
                                  is one you can't get back."
                       
                       — fades word by word, 240ms stagger, ease-apple
```

**Effects in detail:**
- **Sticky parent:** The whole Scene 2 is wrapped in a `position: sticky; top: 0; height: 150vh` container. The clock scales from `scale(1)` to `scale(1.6)` to `scale(2.4)` as scroll progresses.
- **Background:** Vignette intensifies from current `--vignette` to `radial-gradient(transparent 20%, #000 95%)` at end of scene.
- **Existing controls:** Fade to `opacity: 0` between scroll progress 0.2 and 0.4. No idle-fade interference — overridden by scroll position.
- **The static text** (Special Elite) appears at scroll 0.7 → 1.0, word-by-word reveal with `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`.

**Easing:** Zoom uses `cubic-bezier(0.4, 0, 0.2, 1)` (Apple's standard `--ease-out`). Word reveals use `--ease-apple`.

**Narrative purpose:** This is the *inciting incident* of the film. We move from "a pretty clock" to "this is about your finite time." Like the opening of *Interstellar* or the watch-winding scene in *About Time*.

**Mobile:** Zoom scale reduced (max 1.4× instead of 2.4×) — too much zoom on small screens loses the dial detail. Word stagger 180ms.

---

## SCENE 3 — "Set a Goal in One Click" (Viewport 2.5–4)

**Visual composition:**
```
[Camera pulls back from the black. The clock returns at 0.9× scale,
 positioned slightly LEFT of center. To its right, a column of text.]

  ╭─────────╮      ╭─────────────────────────╮
  │  Clock  │      │  Click 1                │
  │  with   │      │  Begin a focus session  │
  │  ring   │      ╰─────────────────────────╯
  │  high-  │      
  │  lighted│      ╭─────────────────────────╮
  ╰─────────╯      │  Click 2                │
                   │  Set your goal time     │
                   ╰─────────────────────────╯
                   
                   ╭─────────────────────────╮
                   │  Click 3                │
                   │  Done. Session saved.   │
                   ╰─────────────────────────╯
```

**What animates:**
- **The clock is the same instance** from Scene 2 — it never unmounts. It eases from center to left-third (`transform: translateX(-25vw) scale(0.9)`).
- **Three feature cards** enter from the right, staggered 200ms apart, each with `translateX(40px) opacity:0` → `translateX(0) opacity:1`.
- **The focus ring on the clock animates in sync.** As card 1 enters, the ring pulses (existing breathe animation). As card 2 enters, a synthetic click triggers the existing tracking state → ring shows progress arc. As card 3 enters, ring completes and celebration ripples fire.
- This is **the real, live clock running a fake 30-second session as you scroll**. Powerful. Unique.

**Effects:**
- Sticky container: `height: 300vh`, clock stays pinned in left column.
- Cards have `transform-style: preserve-3d` + slight `rotateY(-2deg)` on enter for cinematic feel.
- Subtle parallax: cards 1, 2, 3 move at 95%, 100%, 105% scroll speed respectively (depth illusion).

**Narrative purpose:** *Show, don't tell.* The clock literally demonstrates the 3-click flow while you read about it. No screenshot needed — the real product is the demo.

**Mobile:** Layout flips to vertical stack. Clock pinned at top (smaller), cards stack below in sequence with scroll-trigger reveal. No left-right split.

---

## SCENE 4 — "Five Ways to Use Your Time" (Viewport 4–6.5) — HORIZONTAL SCROLL

**Visual composition:**
```
[Vertical scroll pauses. Horizontal scroll engages inside a pinned panel.]

Sticky frame at top: "Five ways to use your time."

Inside the pinned panel, content scrolls horizontally:

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  TAG     │ │ STREAKS  │ │ HEATMAP  │ │ PLAN     │ │ ANALYZE  │
  │ [GIF]    │ │ [GIF]    │ │ [GIF]    │ │ [GIF]    │ │ [GIF]    │
  │          │ │          │ │          │ │          │ │          │
  │ Code,    │ │ Build a  │ │ See your │ │ Schedule │ │ Patterns │
  │ Study,   │ │ daily    │ │ year of  │ │ deep work│ │ in your  │
  │ Design…  │ │ rhythm.  │ │ focus.   │ │ in       │ │ focused  │
  │          │ │          │ │          │ │ advance. │ │ hours.   │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
  
        ▶ → → → → vertical scroll drives horizontal motion → → → ▶
```

**What animates:**
- Outer wrapper: `height: 500vh`. Inner track: `position: sticky; top: 0; height: 100vh; overflow: hidden`.
- Inner content: `transform: translateX(calc(var(--scroll-progress) * -80%))`.
- Each card has its own scroll-progress sub-range. When card N enters the viewport center, its embedded GIF plays (or scrubs based on scroll for ultimate control).
- Cards have soft glass background (`var(--glass-bg)`), 1px hairline border (`var(--glass-border)`), shadow `var(--shadow-pop)`. Same design language as existing pills.

**The 5 feature cards (final content):**

| # | Title | Body | GIF/Asset |
|---|-------|------|-----------|
| 1 | **Tag your work** | "Code, Study, Design, Read — 14 tags out of the box. Add your own." | `/landing/tag-picker.gif` (showing tag picker slide-in) |
| 2 | **Track streaks** | "Build a daily rhythm. Miss a day, lose your streak. Honest." | `/landing/streak.gif` (streak number animating up) |
| 3 | **Year-long heatmap** | "See up to 12 months of focused hours. Spot your patterns." | `/landing/heatmap.gif` (heatmap fading in) |
| 4 | **Plan in advance** | "Schedule tomorrow's deep work. Concentric rings on the clock. Start with one tap." | `/landing/planned-rings.gif` (concentric rings animation) |
| 5 | **Analyze your time** | "Period totals, day-of-week breakdowns, tag distributions." | `/landing/stats.gif` (stats pane) |

**Narrative purpose:** Feature reveal. After the philosophical first three scenes, this is where we deliver on "but what does it actually do?"

**Mobile:** Horizontal scroll is awkward on touch. Switch to vertical stack with snap-scroll behavior. Each card takes full viewport, snaps cleanly. GIFs autoplay when card is centered.

---

## SCENE 5 — "Coming Soon" (Viewport 6.5–7.5)

**Visual composition:**
```
[Background gradually transitions from current theme to dark theme.
 This scene IS theme-switching as a narrative beat.]

                    ┌──────────────────────────┐
                    │                          │
                    │   Coming soon            │
                    │                          │
                    └──────────────────────────┘

       ╭─────────────╮       ╭─────────────╮       ╭─────────────╮
       │  🎵         │       │  🎨         │       │  📁         │
       │  Ambient    │       │  Themes &   │       │  Export to  │
       │  sounds     │       │  wallpapers │       │  Notion,    │
       │             │       │             │       │  Obsidian   │
       │  Rain, café,│       │  Dress the  │       │             │
       │  white noise│       │  clock for  │       │  Roadmap.   │
       │  in tab.    │       │  your room. │       │             │
       ╰─────────────╯       ╰─────────────╯       ╰─────────────╯
```

**What animates:**
- Cards float in from below (`translateY(40px) opacity:0` → settled), staggered 280ms with `--ease-spring`.
- Subtle particle field behind cards: 20 dots drifting upward at 0.5px/frame. Suggests "potential, coming, brewing."
- Each card has a soft glow (`box-shadow` with the tag color from `PlannedRingsLayer`).
- Theme stays consistent with user's preference (no forced theme swap).

**Narrative purpose:** Signal momentum. The product is not stagnant. Future features = reason to bookmark / sign up now.

**Mobile:** Vertical stack. Particle field reduced to 8 dots (battery / paint cost).

---

## SCENE 6 — "Trusted by Humans Who Focus" (Viewport 7.5–8.5)

**Visual composition:**
```
              ┌─────────────────────────────────────┐
              │                                     │
              │      Trusted by 1,000,000+         │  ← count-up
              │      humans who focus.              │     animation
              │                                     │
              └─────────────────────────────────────┘

     Logos (grayscale, hover → full color):

     [Harvard] [MIT] [Stanford] [Apple] [Netflix] [Amazon] 
     [Stripe] [Google] [Figma] [Notion] [Linear] [Vercel]
     
     [↑ logos in 2 rows, scroll-drift subtle: top row drifts LEFT slowly,
        bottom row drifts RIGHT slowly — calm, never frenetic]
     
     ╭────────────────────────────────────────────╮
     │ "Focus Clock changed how I think about my   │
     │  workday. I close the tab and feel calm."   │
     │                                             │
     │  — Hypothetical user, Stanford PhD          │
     ╰────────────────────────────────────────────╯
```

**What animates:**
- The number "1,000,000+" counts up from 0 over 2 seconds when the headline enters the viewport. Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- Logos fade in stagger (40ms per logo), from bottom-up.
- Logo rows drift opposite directions at 0.2px/frame — extremely subtle, not distracting.
- Hover (desktop): logo desaturates from gray → full color. Cursor magnet pulls slightly.
- Testimonial card slides up from below as final element of the scene.

**Trust copy (final, to be confirmed):**
> *Note: per user request, claim is "Trusted by 1M+ humans at top schools and companies including Harvard, MIT, Apple, Netflix, Amazon…" The number/claim should be verified for legal accuracy before launch. If we don't have data to support 1M+, soften to "Used in classrooms, offices, and home studios — including by people at Harvard, MIT, Apple, Netflix, Amazon."*

**Narrative purpose:** Social proof. Authority. *E-E-A-T*. This is the moment a skeptical visitor decides "okay, this is legitimate."

**Mobile:** Logos in 3-column grid (4 rows). Drift disabled (battery). Hover state replaced with no-op (touch).

---

## SCENE 7 — "Start Now" — The Invitation (Viewport 8.5–9.5)

**Visual composition:**
```
[The clock returns. It's been hidden since Scene 4. Now it floats up
 from the bottom of the viewport like a moon rising. Full size. Live.
 Surrounded by a soft glow.]

                          ╭───────────╮
                         │   12 1 2   │
                         │ 11   ·   3 │
                         │ 10   ·   4 │
                         │   9 6 5    │
                          ╰───────────╯
              
              "Click the ring. Begin a session.
                That's all there is to it."
              
              ╭──────────────────────╮       ╭──────────────────────╮
              │  Continue without    │       │  Join with Google or │
              │  an account →        │       │  email →             │
              ╰──────────────────────╯       ╰──────────────────────╯
              
              (Both buttons use existing glass-pill design language)
```

**What animates:**
- Clock rises from `translateY(80vh) scale(0.7) opacity: 0` → `translateY(0) scale(1) opacity: 1` as scroll progresses through the scene.
- A soft `box-shadow: 0 0 200px var(--hand-second-soft)` pulses at 4s breath cycle.
- The two CTA buttons enter staggered from the bottom, with magnetic cursor pull on desktop.
- Clicking "Continue without an account" → smooth scroll to top (back to Scene 1's clock).
- Clicking "Join with Google or email" → opens existing `AuthModal`.

**Narrative purpose:** Conversion. Two clear paths. No hidden costs. No "demo," no "trial." Just *begin*.

**Mobile:** CTAs stack vertically (full-width). Clock smaller, but still risen with glow.

---

## SCENE 8 — Footer / "Credits Roll" (Viewport 9.5–10.5)

**Visual composition:**
```
[Dark theme locked in. Quiet. Final.]

────────────────────────────────────────────────────────────────────

   FOCUS CLOCK                                Made in 2026
   focusclock.app                             A quiet project
   
   ╭─────────────╮ ╭─────────────╮ ╭─────────────╮ ╭─────────────╮
   │  Product    │ │  Company    │ │  Legal      │ │  Connect    │
   │  Features   │ │  About      │ │  Privacy    │ │  GitHub     │
   │  Pricing    │ │  Roadmap    │ │  Terms      │ │  Twitter    │
   │  Roadmap    │ │  Contact    │ │  Cookies    │ │  Email      │
   │  Changelog  │ │             │ │  License    │ │             │
   ╰─────────────╯ ╰─────────────╯ ╰─────────────╯ ╰─────────────╯
   
   ────────────────────────────────────────────────────────
   
   © 2026 Focus Clock. All rights reserved.
   Built with care by Prasannagouda Patil.
   
   ↑ Back to top
```

**What animates:**
- Footer scrolls in like film credits — the entire footer block starts below the viewport and ascends at 1.0× scroll speed (no parallax — match film credit pacing exactly).
- "↑ Back to top" sticky in lower-right of footer scene; click smooth-scrolls to Scene 1.
- "© 2026 Focus Clock" text uses Special Elite (typewriter) — visual rhyme with Scene 1's hero message.

**Footer columns (final structure):**

**Product** — Features · Pricing (Free) · Roadmap · Changelog · Status
**Company** — About · Mission · Contact · Press kit
**Legal** — Privacy Policy · Terms of Service · Cookie Policy · License (MIT)
**Connect** — GitHub · Twitter · Email · RSS

**Narrative purpose:** Closure. Trust signals (real human name credit, MIT license, contact). The film ends. The audience knows where to go for more.

**Mobile:** Columns collapse to 2×2 grid. "Back to top" remains.

---

# Step 3 — Implementation Guidance

## 3.1 Architecture Overview

We will introduce a **second top-level route**: `/landing` (or use `/` for the cinematic page and `/app` for the live clock). The current app lives at a different path.

**Recommended:** **Two-path setup**
- `/` → Cinematic landing page (NEW — what this plan describes)
- `/app` → Existing live clock app (current `App.tsx`, completely unchanged)

The landing page itself **embeds** the existing clock components for Scenes 1, 3, and 7 (live, breathing clock). This is the "build on top of existing assets" requirement — we reuse `ClockCanvas`, `AnalogClock`, `FocusRing` directly.

**Why two paths, not one with scroll-up-to-app:**
1. **Performance.** Scroll-driven animation engines (Lenis, GSAP ScrollTrigger) add ~30KB. Users who land on `/app` (existing users with bookmarks) should not pay this cost.
2. **SEO.** `/` becomes the marketing page with rich content. `/app` is the application surface.
3. **Conversion clarity.** A first-time visitor sees the marketing journey. A returning user goes straight to their tool.

**Routing change:**
- Add `react-router-dom@^6` (already a lightweight dep) or roll our own minimal route check (`window.location.pathname`).
- `main.tsx` reads pathname:
  - `/` → render `<LandingPage />`
  - `/app` (or anything else) → render existing `<App />`
  - Existing routes `/privacy`, `/terms` continue to work.

## 3.2 HTML Skeleton (Landing Page)

```html
<!-- Inside the new LandingPage component -->
<div class="landing">

  <!-- Scene 1: Hero (live clock) -->
  <section class="scene scene--hero" data-scene="1">
    <div class="hero-clock-mount">
      <!-- Embeds existing <ClockCanvas /> here -->
    </div>
    <div class="hero-message">
      <!-- "Not here for your attention. Here for your focus." -->
    </div>
    <div class="scroll-hint" aria-hidden="true">↓</div>
  </section>

  <!-- Scene 2: Zoom & Inciting Sentence -->
  <section class="scene scene--zoom" data-scene="2">
    <div class="zoom-sticky">
      <!-- Sticky clock with scale transform -->
      <div class="zoom-blackout">
        <h2 class="zoom-headline">
          <span>Every moment you don't measure</span>
          <span>is one you can't get back.</span>
        </h2>
      </div>
    </div>
  </section>

  <!-- Scene 3: Three Clicks (with live demo) -->
  <section class="scene scene--three-clicks" data-scene="3">
    <div class="clicks-sticky">
      <div class="clicks-clock"><!-- existing clock --></div>
      <div class="clicks-cards">
        <article data-step="1"><h3>Click 1</h3><p>…</p></article>
        <article data-step="2"><h3>Click 2</h3><p>…</p></article>
        <article data-step="3"><h3>Click 3</h3><p>…</p></article>
      </div>
    </div>
  </section>

  <!-- Scene 4: Horizontal Features Gallery -->
  <section class="scene scene--features" data-scene="4">
    <div class="features-sticky">
      <h2>Five ways to use your time.</h2>
      <div class="features-track">
        <article class="feature-card" data-feature="tag">
          <img src="/landing/tag-picker.gif" alt="Tag picker UI" />
          <h3>Tag your work</h3>
          <p>Code, Study, Design, Read — 14 tags out of the box. Add your own.</p>
        </article>
        <!-- 4 more feature-cards -->
      </div>
    </div>
  </section>

  <!-- Scene 5: Coming Soon -->
  <section class="scene scene--roadmap" data-scene="5">
    <h2>Coming soon</h2>
    <div class="roadmap-grid">
      <article><h3>Ambient sounds</h3><p>Rain, café, white noise.</p></article>
      <article><h3>Themes & wallpapers</h3><p>Dress the clock for your room.</p></article>
      <article><h3>Export integrations</h3><p>Notion, Obsidian — roadmap.</p></article>
    </div>
  </section>

  <!-- Scene 6: Social Proof -->
  <section class="scene scene--trust" data-scene="6">
    <h2>Trusted by <span class="counter" data-target="1000000">0</span>+ humans who focus.</h2>
    <div class="logo-grid">
      <div class="logo-row" data-direction="left">
        <img src="/landing/logos/harvard.svg" alt="Harvard" />
        <!-- + MIT, Stanford, Apple, Netflix, Amazon -->
      </div>
      <div class="logo-row" data-direction="right">
        <!-- + Stripe, Google, Figma, Notion, Linear, Vercel -->
      </div>
    </div>
    <blockquote class="testimonial">…</blockquote>
  </section>

  <!-- Scene 7: Invitation -->
  <section class="scene scene--invite" data-scene="7">
    <div class="invite-clock"><!-- existing clock rising --></div>
    <p class="invite-copy">Click the ring. Begin a session.</p>
    <div class="invite-ctas">
      <a href="/app" class="cta cta--ghost">Continue without an account →</a>
      <button class="cta cta--primary">Join with Google or email →</button>
    </div>
  </section>

  <!-- Scene 8: Footer / Credits -->
  <footer class="scene scene--footer" data-scene="8">
    <div class="footer-cols">
      <section><h4>Product</h4>…</section>
      <section><h4>Company</h4>…</section>
      <section><h4>Legal</h4>…</section>
      <section><h4>Connect</h4>…</section>
    </div>
    <div class="footer-meta">
      <p>© 2026 Focus Clock. All rights reserved.</p>
      <p>Built with care by Prasanna Patil.</p>
      <a href="#top">↑ Back to top</a>
    </div>
  </footer>

</div>
```

## 3.3 CSS Strategy

**Layout primitives:**
```css
/* Each scene is at minimum 1 viewport tall — adjusted per scene */
.scene {
  position: relative;
  min-height: 100vh;
  padding: 0;
}

/* Sticky containers for scroll-driven animation */
.scene--zoom { height: 250vh; }     /* 1.5 extra viewports for zoom */
.scene--three-clicks { height: 300vh; }  /* 2 extra viewports for 3 card reveals */
.scene--features { height: 500vh; }      /* 4 extra viewports for horizontal scroll */

.zoom-sticky,
.clicks-sticky,
.features-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}
```

**Reuse existing design tokens:**
```css
.feature-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--shadow-pop);
  backdrop-filter: blur(24px);
}

.cta--primary {
  background: var(--hand-second);
  color: white;
  /* etc — match existing pill design */
}
```

**Theme transition during scroll (Scene 5 → 6):**
```css
.landing[data-scroll-theme="dark"] {
  --bg: #0e0e10;
  --fg: #ece9e2;
  /* transition for 600ms when this attribute is set by JS */
}
```

## 3.4 JavaScript / Animation Engine

**Library choice:** **Lenis** (smooth scroll, 4KB gzipped) + **vanilla `IntersectionObserver` + `requestAnimationFrame`** for scroll-tied transforms.

**Why not GSAP?** GSAP ScrollTrigger is the obvious choice but adds ~50KB gzipped. For our 8-scene scope, we can hand-roll the scroll math in ~3KB of TypeScript.

**Why not Framer Motion?** It's React-idiomatic but its scroll-driven motion (`useScroll`, `useTransform`) is fine — we may use it if already comfortable. Decision: **use Framer Motion** if we want to ship faster (one-time bundle cost ~28KB), otherwise hand-rolled. Defer until implementation.

**Core scroll utility (vanilla, no deps):**
```typescript
// useScrollProgress.ts
// Returns 0..1 progress of an element through the viewport.
export function useScrollProgress(ref: RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress = 0 when top of el enters bottom of viewport
      // progress = 1 when bottom of el leaves top of viewport
      const total = rect.height + vh;
      const passed = vh - rect.top;
      setProgress(Math.max(0, Math.min(1, passed / total)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
  return progress;
}
```

**Scene 2 — Zoom example:**
```tsx
function ZoomScene() {
  const sceneRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(sceneRef);
  const scale = 1 + progress * 1.4; // 1 → 2.4

  return (
    <section ref={sceneRef} className="scene scene--zoom">
      <div className="zoom-sticky">
        <div
          className="zoom-clock-wrap"
          style={{ transform: `scale(${scale})` }}
        >
          {/* embed clock here */}
        </div>
        {progress > 0.7 && <ZoomHeadline progress={(progress - 0.7) / 0.3} />}
      </div>
    </section>
  );
}
```

**Scene 4 — Horizontal scroll inside vertical:**
```tsx
function FeaturesScene() {
  const sceneRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(sceneRef);
  // Convert vertical scroll progress (0..1) to horizontal translation
  const translateX = -progress * 80; // 0 to -80%

  return (
    <section ref={sceneRef} className="scene scene--features">
      <div className="features-sticky">
        <h2>Five ways to use your time.</h2>
        <div
          className="features-track"
          style={{ transform: `translateX(${translateX}%)` }}
        >
          {features.map(f => <FeatureCard key={f.id} {...f} />)}
        </div>
      </div>
    </section>
  );
}
```

**Magnetic cursor (desktop only, optional polish):**
```tsx
function useMagneticCursor(targetRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.25;
      const dy = (e.clientY - cy) * 0.25;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const handleLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [targetRef]);
}
```

## 3.5 Existing Components We'll Reuse

| Component | Used in Scene(s) | Purpose |
|-----------|------------------|---------|
| `ClockCanvas` | 1, 3, 7 | The live clock. Same instance, embedded in landing layout. |
| `FocusRing` | 3 | Demonstrate 3-click flow via synthetic state changes. |
| `AnalogClock` | (within ClockCanvas) | The face. |
| `HeroMessage` | 1 | Existing typewriter, reused. |
| `AuthModal` | 7 | Existing sign-up modal, reused. |
| `JoinPill` | 7 | Optionally, as one of the CTAs. |
| `useTheme` | 5–6 | Drive the theme transition during scroll. |
| Design tokens (`global.css`) | All | All colors, typography, easings reused. |

**Components that must NOT appear on landing page:** `TodaySummary`, `ScheduleBadge`, `PauseStopControl`, all `controls--*`, idle-fade behavior. The landing page has its own simpler UI.

---

# Routing & Mounting Strategy

**Implementation:**

1. **Install router** (lightweight): `react-router-dom@^6.x` (~12KB gzipped) OR roll a 30-line vanilla path check.
2. **Update `main.tsx`:**
   ```tsx
   import { BrowserRouter, Routes, Route } from 'react-router-dom';
   import LandingPage from './pages/LandingPage';
   import App from './App';
   import PrivacyPage from './pages/PrivacyPage';
   import TermsPage from './pages/TermsPage';
   
   createRoot(document.getElementById('root')!).render(
     <BrowserRouter>
       <Routes>
         <Route path="/" element={<LandingPage />} />
         <Route path="/app" element={<App />} />
         <Route path="/privacy" element={<PrivacyPage />} />
         <Route path="/terms" element={<TermsPage />} />
       </Routes>
     </BrowserRouter>
   );
   ```
3. **Update existing references:** Anything that currently assumes the user lands on `/` and sees the app needs to know about `/app`. This is mostly auth callback URLs (Supabase) — verify Supabase redirect URL in dashboard includes `/app`.
4. **Update sitemap.xml** to include both `/` and `/app`.

---

# Asset Inventory (GIFs, Logos, Screens)

## To Be Created (Design / Recording Work)

| Asset | Type | Spec | Notes |
|-------|------|------|-------|
| `/landing/tag-picker.gif` | Screen recording | 800×500, 8–15fps, <500KB | Show tag picker slide-in |
| `/landing/streak.gif` | Screen recording | 600×400, <300KB | Streak counter animating up |
| `/landing/heatmap.gif` | Screen recording | 900×500, <600KB | Heatmap fading in over 12 months |
| `/landing/planned-rings.gif` | Screen recording | 700×700, <500KB | Concentric planned rings appearing |
| `/landing/stats.gif` | Screen recording | 900×500, <600KB | Stats pane reveal |
| `/landing/logos/*.svg` | Logo SVGs | Grayscale baseline, color on hover | 12 logos (see Scene 6) |
| `/og-image.png` | Marketing | 1200×630, <500KB | Replace SVG og-image with landing screenshot |

**GIF best practices:**
- Use [Gifski](https://gif.ski) or `ffmpeg` with high-quality palette.
- Or better: **encode as WebM/MP4** (silent autoplay, loop, `playsinline`) — 1/10th the size of GIF for same quality.
- All GIFs/videos lazy-load (`loading="lazy"` for IMG, `preload="none"` for VIDEO).
- Provide a `<picture>` fallback or static poster image.

**Legal note on logos:**
- Using third-party logos (Apple, Netflix, etc.) without permission may violate trademark guidelines.
- **Recommendation:** Soften the claim. Either:
  1. Use logos only if we have written permission, OR
  2. Replace with neutral icons + text ("Used at top universities and companies") without specific brand logos, OR
  3. Use *category logos* (a library icon, a startup icon) instead of specific brands.

---

# Performance & Accessibility Budget

## Performance Targets

| Metric | Target | Current (live app) | Landing budget |
|--------|--------|---------------------|----------------|
| **LCP** | < 2.5s | ~1.8s | < 2.5s (allow +0.7s for hero clock + GIFs) |
| **INP** | < 200ms | ~120ms | < 200ms |
| **CLS** | < 0.1 | 0.02 | < 0.1 (all media has fixed dimensions) |
| **Total page weight** | < 800KB gzipped | ~150KB | < 800KB (GIFs/WebM dominate) |
| **JS bundle delta** | — | 134KB gzip | +30KB max (scroll utility + landing components) |

## Performance Tactics

1. **Lazy-load all GIFs/videos.** Use `IntersectionObserver` to start loading only when 200px from viewport.
2. **Encode media as WebM** (VP9), not GIF. 10× smaller. `<video autoplay loop muted playsinline>` is silent and works everywhere.
3. **Code-split the landing page.** `React.lazy(() => import('./pages/LandingPage'))`. The existing `App.tsx` doesn't load landing code.
4. **Preload only Scene 1 critical assets.** Everything else loads as you scroll.
5. **Hardware-accelerated transforms only.** `translate3d`, `scale`, `opacity` — never `width`/`height`/`top`/`left`.
6. **`will-change` sparingly.** Only on actively animating elements. Remove after animation.
7. **Reduce-motion respect:** All scroll-tied animations disabled if `prefers-reduced-motion: reduce`. Static fallback (cards just appear).

## Accessibility

1. **Semantic HTML:** `<section>`, `<article>`, `<h2>`, `<h3>` — proper outline.
2. **Skip link:** "Skip to content" hidden until focused, jumps past hero.
3. **ARIA:**
   - `aria-hidden="true"` on purely decorative scroll-hint chevron and particle dots.
   - `role="region" aria-label="…"` on each scene.
   - `<img alt="…">` mandatory on every GIF / logo.
4. **Keyboard navigation:** All CTAs reachable via Tab. Focus visible (existing `:focus-visible` styles).
5. **Reduce motion:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     .scene * { animation: none !important; transition: none !important; }
     .scene--zoom .zoom-clock-wrap { transform: scale(1) !important; }
     .scene--features .features-track { transform: none !important; }
   }
   ```
6. **Color contrast:** All text meets WCAG AA. Special Elite light gray must be ≥ 4.5:1 against background.
7. **Screen reader test:** Read every scene as plain content with linear flow. No animation-only information.

---

# SEO Considerations

## Why this matters more than the current app

The landing page becomes the **primary indexable surface**. The current app (`/app`) is fine to be `noindex` or have minimal indexed content — but `/` must rank for "focus timer," "productivity tracker," "browser focus app," etc.

## Required SEO Additions on Landing Page

1. **Update `<title>`** for `/` to a focused keyword string: e.g., `"Focus Clock — A Beautiful Browser-Based Focus Timer & Productivity Tracker"`.
2. **Update `<meta name="description">`** to 155 chars with primary keyword + CTA.
3. **Headings hierarchy:**
   - H1 (once): "A clock that respects your attention." (or similar — the *hero promise*).
   - H2s: One per scene — "Every moment you don't measure," "Set a goal in one click," "Five ways to use your time," "Coming soon," "Trusted by humans who focus," "Start now."
4. **FAQ schema (Scene 5 or a dedicated FAQ section):**
   - Add 4–6 FAQ items via `FAQPage` schema.
   - Suggested questions: "Is Focus Clock free?", "Do I need an account?", "Does it work offline?", "How does focus tracking work?", "Can I export my data?"
5. **`SoftwareApplication` schema** (already in `index.html`, verify it stays).
6. **Internal linking:** Footer links create the hub-and-spoke architecture (Product → Features → individual feature anchors).
7. **`<noscript>` fallback:** Must contain semantic markup with all key content as text (this is what Google bots and JS-off users see). Current `<noscript>` is minimal — expand it.
8. **Canonical URL:** `<link rel="canonical" href="https://focusclock.app/" />` on landing, separate canonical on `/app`.

## URL Structure Update

| URL | Indexable | Purpose |
|-----|-----------|---------|
| `/` | ✅ Yes — primary SEO surface | Cinematic landing |
| `/app` | ⚠️ Yes but lower priority | Live application |
| `/privacy` | ✅ Yes | Privacy policy |
| `/terms` | ✅ Yes | Terms of service |
| Future: `/features/tags`, `/features/streaks`, etc. | ✅ Yes | Topical authority |

---

# Mobile Adaptation Strategy

> **The user explicitly said:** "mostly for desktops. In the meantime, we'll also try to handle it on mobile also."

**Approach:** **Desktop-first cinematic, mobile graceful.**

| Scene | Mobile Strategy |
|-------|-----------------|
| **1 — Hero** | Identical. Live clock + typewriter. |
| **2 — Zoom** | Zoom range reduced (1× → 1.4× instead of 2.4×). |
| **3 — Three Clicks** | Cards stack vertically below clock. Clock pinned smaller at top. |
| **4 — Features (horizontal)** | **Switch to vertical scroll-snap.** Each card = full viewport, snaps. |
| **5 — Coming Soon** | Vertical stack of 3 cards. Particle field disabled. |
| **6 — Trust** | Logos in 3×4 grid. Counter still animates. Drift disabled. |
| **7 — Invite** | CTAs stack vertically. Clock smaller. |
| **8 — Footer** | 4 columns → 2×2 grid. |

**Performance tuning for mobile:**
- All scroll-driven transforms throttled to 30fps (vs 60fps desktop).
- No particle systems. No magnetic cursor.
- WebM/MP4 dimensions halved.
- `prefers-reduced-data: reduce` → skip GIFs entirely, show static posters.

---

# Build Order (Incremental, Buildable Steps)

> Each step is independently buildable and verifiable. Ship in 9 small PRs (or 1 with these as commits).

| Step | Deliverable | Hours est. |
|------|-------------|-----------|
| **0** | This plan document ✅ | Done |
| **1** | Routing scaffold — `/` shows placeholder `<LandingPage />`, `/app` shows existing `<App />`. Verify privacy/terms still work. | 2h |
| **2** | Build `<LandingPage />` shell — 8 empty `<section>` containers, basic CSS, vertical scroll works. | 2h |
| **3** | Scene 1 — embed existing `ClockCanvas`, hero message, scroll-hint. | 2h |
| **4** | Scene 2 — sticky container, scroll-tied zoom transform, headline reveal. | 4h |
| **5** | Scene 3 — three cards, synthetic ring demo (or static composition first, real demo later). | 5h |
| **6** | Scene 4 — horizontal scroll mechanism, 5 feature cards with placeholder GIFs. | 6h |
| **7** | Scene 5 — Coming Soon cards, theme transition during scroll. | 3h |
| **8** | Scene 6 — logo grid, counter animation, testimonial. | 4h |
| **9** | Scene 7 — invitation, CTAs, magnetic cursor (desktop). | 3h |
| **10** | Scene 8 — footer with all four columns, back-to-top. | 2h |
| **11** | GIF assets — record + encode 5 feature videos. | 4h |
| **12** | Mobile pass — every scene adapted per the table above. | 6h |
| **13** | Performance pass — lazy load, code split, lighthouse audit, fix CLS/LCP. | 4h |
| **14** | Accessibility pass — reduce-motion, screen reader, keyboard. | 3h |
| **15** | SEO pass — meta tags, schema, FAQ, sitemap update. | 2h |
| **16** | QA + cross-browser test + PR + merge. | 3h |
| | **Total** | **~55h** |

---

# Risks & Edge Cases

| Risk | Mitigation |
|------|------------|
| **Trademark issues with logos** | Replace specific brand logos with neutral icons OR confirm logo permissions before launch. |
| **"1,000,000+" claim unverifiable** | Soften to "Used by people at top schools and companies" — no specific number unless we have data. |
| **GIF bundle balloon** | Use WebM, lazy-load, hard cap each at 500KB. |
| **Scroll jank on low-end devices** | Throttle scroll handler to 30fps, disable particles, prefer `transform`/`opacity` only. |
| **Auth redirect breaks** | Confirm Supabase redirect URL in dashboard supports `/app`. Test sign-in flow end-to-end. |
| **Existing users bookmark `/` and now see landing** | Add a one-time check: if localStorage has session data, auto-redirect `/` → `/app` for returning users. |
| **`/` and `/app` divergence over time** | Document that the live clock embedded in landing must reuse the same `ClockCanvas` component — no fork. |
| **SEO regression from JS-rendered landing** | Keep robust `<noscript>` block with all key content as text. Consider SSG (Vite SSG plugin) for `/` only if rankings suffer. |
| **CLS from late-loading GIFs** | Use `aspect-ratio` CSS property on every GIF container — reserves space before load. |
| **Custom cursor breaks accessibility** | Hide on touch devices; keep default cursor reachable via keyboard. |

---

# Validation Checklist

## Functional
- [ ] `/` renders LandingPage (Scene 1 visible immediately).
- [ ] `/app` renders the existing focus clock application unchanged.
- [ ] `/privacy` and `/terms` still work.
- [ ] Scrolling through Scenes 1→8 plays correctly on desktop.
- [ ] Clicking "Continue without an account" smooth-scrolls to top.
- [ ] Clicking "Join with Google or email" opens AuthModal.
- [ ] All footer links navigate correctly.
- [ ] Returning users with active sessions auto-redirect `/` → `/app`.

## Visual
- [ ] Scene 1 looks identical to current homepage.
- [ ] Scene 2 zoom is smooth (no jitter at 60fps).
- [ ] Scene 3 cards stagger in, clock demo runs.
- [ ] Scene 4 horizontal scroll engages and disengages cleanly.
- [ ] Scene 5 theme switches from light to dark mid-scroll.
- [ ] Scene 6 counter reaches target value.
- [ ] Scene 7 clock rises with glow.
- [ ] Scene 8 footer columns align correctly.

## Performance
- [ ] PageSpeed Insights: Performance ≥ 85, LCP < 2.5s, CLS < 0.1, INP < 200ms.
- [ ] Initial JS bundle delta ≤ +30KB gzipped over current.
- [ ] All GIFs/videos lazy-loaded (verified in Network panel).
- [ ] No console errors.

## Accessibility
- [ ] All scenes pass `axe-core` audit.
- [ ] Reduce-motion users see static content (no zoom/parallax).
- [ ] Tab order is logical (top to bottom through scenes).
- [ ] Screen reader linearly narrates every scene as readable content.
- [ ] All images have meaningful `alt` text.

## SEO
- [ ] Updated `<title>` and `<meta name="description">` for `/`.
- [ ] H1 is present once and contains primary keyword.
- [ ] FAQ schema validates in Google Rich Results Test.
- [ ] `<noscript>` block contains key content.
- [ ] Updated `sitemap.xml` includes `/`, `/app`, `/privacy`, `/terms`.

## Mobile
- [ ] All scenes render correctly at 375px (iPhone SE), 414px (iPhone Pro Max), 768px (iPad).
- [ ] Horizontal scroll in Scene 4 is replaced by vertical snap on touch devices.
- [ ] Performance on mid-tier Android (Moto G Power) is acceptable (no jank).

---

## Closing Note

This plan is the **map**. Implementation will reveal edge cases and creative opportunities that the plan doesn't anticipate. Treat each scene as a film *take* — we may need to reshoot Scene 2 three times until the zoom feels right. That's normal. The map gets us moving.

The goal is **emotion, not features.** Every visitor who scrolls through this page should feel:

1. Calm (the clock is alive, restrained, beautiful)
2. Awe (zoom transitions, "your time is finite")
3. Confidence ("I understand what this does in 3 cards")
4. Curiosity (the future features tease imagination)
5. Trust (the institutions, the number, the testimonial)
6. Decision (the two clear paths)
7. Closure (the footer credits)

If a visitor scrolls all the way down and doesn't sign up — that's fine. They've absorbed the story. They'll be back.

— *Generated by Claude Code on 2026-06-06 for branch `feat/cinematic-landing-page`*
