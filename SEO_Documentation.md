# 🔍 Complete SEO Ranking Guide — Technical + Content + Authority
> A comprehensive, implementation-ready reference for ranking a software/SaaS website at the top of Google Search.
> Covers every factor that has worked, currently works, and will continue to work based on Google's core algorithm signals.

---

## TABLE OF CONTENTS

1. [How Google's Algorithm Actually Works](#1-how-googles-algorithm-actually-works)
2. [Technical SEO — The Foundation](#2-technical-seo--the-foundation)
3. [On-Page SEO — Content Signals](#3-on-page-seo--content-signals)
4. [Keyword Research Strategy](#4-keyword-research-strategy)
5. [FAQ Schema & Featured Snippets](#5-faq-schema--featured-snippets)
6. [Structured Data (Schema Markup)](#6-structured-data-schema-markup)
7. [Core Web Vitals & Page Experience](#7-core-web-vitals--page-experience)
8. [Link Building & Authority (Off-Page SEO)](#8-link-building--authority-off-page-seo)
9. [E-E-A-T: Experience, Expertise, Authoritativeness, Trust](#9-e-e-a-t-experience-expertise-authoritativeness-trust)
10. [Content Strategy for SaaS / Software Websites](#10-content-strategy-for-saas--software-websites)
11. [Local SEO (if applicable)](#11-local-seo-if-applicable)
12. [Mobile SEO](#12-mobile-seo)
13. [Indexing & Crawl Optimization](#13-indexing--crawl-optimization)
14. [Meta Tags — Complete Reference](#14-meta-tags--complete-reference)
15. [Open Graph & Social Signals](#15-open-graph--social-signals)
16. [Image SEO](#16-image-seo)
17. [Internal Linking Architecture](#17-internal-linking-architecture)
18. [URL Structure](#18-url-structure)
19. [Site Architecture & Information Hierarchy](#19-site-architecture--information-hierarchy)
20. [Analytics & Search Console Setup](#20-analytics--search-console-setup)
21. [Competitor & SERP Analysis](#21-competitor--serp-analysis)
22. [What No Longer Works (Avoid These)](#22-what-no-longer-works-avoid-these)
23. [Implementation Checklist](#23-implementation-checklist)

---

## 1. How Google's Algorithm Actually Works

Google uses **200+ ranking signals**. The core pillars are:

| Pillar | What It Means |
|---|---|
| **Relevance** | Does your page answer the query better than others? |
| **Authority** | Do other trusted sites vouch for yours via links? |
| **Page Experience** | Is the page fast, stable, mobile-friendly, secure? |
| **E-E-A-T** | Does the content show real expertise and trustworthiness? |
| **Freshness** | Is the content current and regularly updated? |
| **Intent Match** | Does the format (article, tool, landing page) match what the user expects? |

### Core Algorithm Updates to Understand

- **Panda** — Penalizes thin, duplicate, low-quality content
- **Penguin** — Penalizes spammy/paid link profiles
- **Hummingbird** — Semantic search; understands meaning, not just keywords
- **RankBrain** — ML-based; learns from user behavior (CTR, dwell time)
- **BERT/MUM** — Natural language understanding; rewards conversational, thorough content
- **Helpful Content System (2022+)** — Penalizes AI-spun or people-not-first content
- **Core Updates** — Periodic rebalancing of E-E-A-T signals

---

## 2. Technical SEO — The Foundation

Nothing else works if the technical foundation is broken. Fix these first.

### 2.1 HTTPS

```html
<!-- Ensure site runs on HTTPS. Google gives ranking preference. -->
<!-- Redirect all HTTP → HTTPS in your server config or .htaccess -->
```

**Implementation:** Force HTTPS redirect at the server/CDN level. Use HSTS header:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### 2.2 robots.txt

Located at `yourdomain.com/robots.txt`. Controls what Googlebot can crawl.

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /api/
Sitemap: https://yourdomain.com/sitemap.xml
```

**Rules:**
- Never block CSS/JS files that render your page (Google renders JS)
- Never disallow your main content pages
- Always link your sitemap here

---

### 2.3 XML Sitemap

Located at `yourdomain.com/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yourdomain.com/features</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Add all important pages -->
</urlset>
```

**Rules:**
- Only include pages you want indexed (no duplicate/thin pages)
- Submit to Google Search Console
- Auto-regenerate on new content publish

---

### 2.4 Canonical Tags

Prevents duplicate content issues.

```html
<!-- In <head> of every page -->
<link rel="canonical" href="https://yourdomain.com/page-url/" />
```

- Self-referencing canonicals on every page
- Use when similar content exists at multiple URLs (e.g., filter pages)
- Never canonical a page to a different page unless intentionally consolidating

---

### 2.5 Structured 404 Page

```html
<!-- Custom 404 should return HTTP 404 status code, not 200 -->
<!-- Include navigation links to guide users back -->
<!-- Do NOT include content that competes with real pages -->
```

---

### 2.6 Page Speed (Critical)

```html
<!-- In <head> -->

<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload critical above-the-fold assets -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/images/hero.webp" as="image" />

<!-- Defer non-critical JS -->
<script src="/js/analytics.js" defer></script>
<script src="/js/chat-widget.js" defer></script>

<!-- Lazy load below-fold images -->
<img src="feature.webp" loading="lazy" alt="Feature description" />
```

---

### 2.7 Core Web Vitals Targets

| Metric | Target | Meaning |
|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | How fast main content loads |
| **INP** (Interaction to Next Paint) | < 200ms | Responsiveness to clicks/taps |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability; no jumping elements |

**How to fix CLS:**
```html
<!-- Always define width and height on images -->
<img src="hero.webp" width="1200" height="600" alt="..." />

<!-- Reserve space for ads/embeds -->
<div style="min-height: 250px;">
  <!-- Ad or dynamic content goes here -->
</div>
```

---

## 3. On-Page SEO — Content Signals

### 3.1 Title Tag

The single most important on-page signal.

```html
<title>Primary Keyword — Secondary Keyword | Brand Name</title>
```

**Rules:**
- 50–60 characters max (about 580px wide)
- Primary keyword near the beginning
- Each page must have a **unique** title
- Include brand name at the end, separated by `|` or `—`
- Write for humans, not just crawlers — CTR matters

**Examples for a SaaS clock/focus app:**
```html
<!-- Homepage -->
<title>Wall Clock — Minimalist Focus Timer for Professionals | WallClock</title>

<!-- Features page -->
<title>Focus Tracking Features — Session Analytics & Streaks | WallClock</title>

<!-- Blog post -->
<title>How to Track Deep Work Sessions: 7 Science-Backed Methods | WallClock Blog</title>
```

---

### 3.2 Meta Description

Not a direct ranking factor but heavily influences **click-through rate (CTR)**, which is a ranking signal.

```html
<meta name="description" content="Your compelling 150–160 character description that includes the primary keyword naturally and a clear value proposition or call to action." />
```

**Rules:**
- 150–160 characters
- Include primary keyword (Google bolds it in results)
- Include a CTA or value statement: "Try free," "Start tracking today," etc.
- Unique for every page
- Write as if it's an ad — it IS your first impression

---

### 3.3 Heading Hierarchy (H1–H6)

```html
<!-- ONE H1 per page — the main topic -->
<h1>Minimalist Focus Timer That Lives in Your Browser Tab</h1>

<!-- H2s for major sections -->
<h2>Track Your Deep Work Sessions Automatically</h2>
<h2>How It Works</h2>
<h2>Features</h2>
<h2>Frequently Asked Questions</h2>

<!-- H3s for subsections under H2s -->
<h3>Session Streaks and Heatmaps</h3>
<h3>Weekly Focus Summary</h3>
```

**Rules:**
- H1 must contain your primary keyword
- H2s should include secondary/related keywords naturally
- Don't skip levels (no H1 → H3)
- Headings should read as a logical outline of the page

---

### 3.4 Keyword Placement Checklist

Place your primary keyword in:
- [ ] Page `<title>`
- [ ] `<meta name="description">`
- [ ] H1
- [ ] First 100 words of body content
- [ ] At least one H2
- [ ] Image `alt` attribute
- [ ] URL slug
- [ ] Canonical URL

---

### 3.5 Content Length Guidelines

| Page Type | Recommended Length |
|---|---|
| Homepage | 600–1,000 words (focus on clarity) |
| Feature/product page | 800–1,500 words |
| Blog post (informational) | 1,500–3,000 words |
| Pillar/ultimate guide | 3,000–6,000+ words |
| Landing page | 500–1,200 words |
| FAQ page | 1,000–2,500 words |

---

## 4. Keyword Research Strategy

### 4.1 Keyword Types to Target

| Type | Example | Intent |
|---|---|---|
| **Head keyword** | "focus timer" | Informational / Navigational |
| **Long-tail keyword** | "best minimalist focus timer for mac" | Transactional |
| **Question keyword** | "how do I track my deep work time?" | Informational |
| **Comparison keyword** | "wall clock vs. forest app" | Commercial investigation |
| **Feature keyword** | "browser tab clock with session tracking" | Navigational / Transactional |

### 4.2 Keyword Research Process

1. **Seed keywords** — Brainstorm 10–20 core terms (focus timer, productivity clock, session tracker, deep work tool, time tracker browser tab)
2. **Expand** — Use Google's autocomplete, "People Also Ask," and "Related Searches" sections
3. **Validate volume** — Use free tools: Google Keyword Planner, Ubersuggest, Ahrefs Free, AnswerThePublic
4. **Prioritize by**:
   - Search volume × relevance × competition difficulty
   - High intent + low competition = fastest wins
5. **Group by intent** — One primary keyword cluster per page

### 4.3 Keyword Density

- Primary keyword: ~1–2% density (don't force it)
- Use **LSI keywords** (Latent Semantic Indexing) — related words Google expects:
  - For "focus timer": productivity, Pomodoro, deep work, time blocking, session, concentration, distraction-free
- Use keywords naturally in body, not stuffed

---

## 5. FAQ Schema & Featured Snippets

This is one of the **highest-impact quick wins** for appearing in position 0 (featured snippets) and "People Also Ask" boxes.

### 5.1 FAQ Schema Implementation

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a browser tab clock?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A browser tab clock is a web-based clock that lives permanently in a pinned browser tab, showing the current time and optionally tracking focus sessions. It's designed for professionals who use multiple monitors and want an always-visible time display without a separate device."
      }
    },
    {
      "@type": "Question",
      "name": "How do I track my deep work sessions online?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can track deep work sessions using a browser-based focus timer that logs active session time, tracks streak consistency, and provides weekly summaries. Tools like Wall Clock automatically detect presence and record sessions without requiring manual start/stop interactions."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between a Pomodoro timer and a focus session tracker?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Pomodoro timer enforces fixed 25-minute work intervals with mandatory breaks. A focus session tracker is passive — it records how long you actually worked without interrupting your flow. Session trackers are better for experienced deep workers who already have discipline and want data, not enforcement."
      }
    },
    {
      "@type": "Question",
      "name": "Is Wall Clock free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Wall Clock is free to use with full access to the core clock and session tracking features. A Pro plan is available for cloud sync, advanced analytics, and weekly email digests."
      }
    },
    {
      "@type": "Question",
      "name": "Does Wall Clock work offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Wall Clock stores session data locally in your browser and continues working without an internet connection. Data syncs to the cloud when you reconnect if you have a Pro account."
      }
    }
  ]
}
</script>
```

### 5.2 How to Find the Best FAQ Questions

Mine these sources:
- Google "People Also Ask" boxes for your keywords
- Reddit threads (r/productivity, r/digitalnomad, r/deepwork)
- Quora questions around your topic
- AnswerThePublic.com
- Google Search Console "Queries" report (what people already search and find you for)
- Amazon/Product Hunt reviews of competitors (real user language)

### 5.3 Optimizing for Featured Snippets

Google pulls featured snippets from pages that answer a question **clearly and concisely** early in the content.

```html
<!-- Structure your answers like this: -->
<h2>How does focus session tracking work?</h2>
<p>
  Focus session tracking automatically monitors browser activity and records time
  spent actively using an application. It uses tab visibility, mouse movement,
  and keyboard activity to calculate "active minutes" — giving you an accurate
  picture of genuine focused work rather than just time with the tab open.
</p>
<!-- Follow with deeper explanation, bullet points, examples -->
```

**Snippet formats Google loves:**
- **Paragraph** (40–60 words answering "what is" / "how does")
- **List** (step-by-step "how to" content)
- **Table** (comparisons, specifications)

---

## 6. Structured Data (Schema Markup)

Structured data helps Google understand your content and unlock **rich results** (star ratings, breadcrumbs, sitelinks, etc.).

### 6.1 SoftwareApplication Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Wall Clock",
  "operatingSystem": "Web Browser",
  "applicationCategory": "ProductivityApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "124"
  },
  "description": "A minimalist, browser-based analog and digital clock with passive focus session tracking, streaks, and analytics for productivity-focused professionals.",
  "url": "https://yourdomain.com",
  "screenshot": "https://yourdomain.com/images/app-screenshot.png",
  "featureList": "Analog clock, Digital clock, Session tracking, Timezone selector, Dark/light theme, Streak tracking, Focus heatmap"
}
</script>
```

### 6.2 WebSite Schema with Sitelinks Search Box

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Wall Clock",
  "url": "https://yourdomain.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://yourdomain.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

### 6.3 Organization Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Wall Clock",
  "url": "https://yourdomain.com",
  "logo": "https://yourdomain.com/logo.png",
  "sameAs": [
    "https://twitter.com/yourhandle",
    "https://github.com/yourrepo",
    "https://www.linkedin.com/company/yourcompany"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "support@yourdomain.com"
  }
}
</script>
```

### 6.4 BreadcrumbList Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://yourdomain.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Features",
      "item": "https://yourdomain.com/features"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Session Tracking",
      "item": "https://yourdomain.com/features/session-tracking"
    }
  ]
}
</script>
```

### 6.5 Article Schema (for Blog Posts)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Build a Deep Work Habit in 30 Days",
  "image": "https://yourdomain.com/blog/deep-work-habit.jpg",
  "datePublished": "2024-01-15T08:00:00+00:00",
  "dateModified": "2024-02-01T10:00:00+00:00",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://yourdomain.com/author/name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Wall Clock",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yourdomain.com/logo.png"
    }
  },
  "description": "A practical 30-day program to develop deep work habits using passive session tracking and streak accountability."
}
</script>
```

---

## 7. Core Web Vitals & Page Experience

### 7.1 LCP Optimization

```html
<!-- 1. Preload hero image -->
<link rel="preload" as="image" href="/images/hero.webp" />

<!-- 2. Use modern image formats -->
<picture>
  <source srcset="/images/hero.avif" type="image/avif" />
  <source srcset="/images/hero.webp" type="image/webp" />
  <img src="/images/hero.jpg" alt="Wall Clock app interface" width="1200" height="700" />
</picture>

<!-- 3. Inline critical CSS in <head> — do not load it from external file -->
<style>
  /* Only the CSS needed to render above-the-fold content */
  body { margin: 0; font-family: 'Fraunces', serif; background: #1a1a1a; }
  .hero { display: flex; align-items: center; min-height: 100vh; }
</style>

<!-- 4. Load web fonts efficiently -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&display=swap" rel="stylesheet" />
```

### 7.2 CLS Prevention

```html
<!-- Always define dimensions on images and video -->
<img src="feature.webp" width="800" height="450" alt="Feature showcase" />
<video width="800" height="450" controls preload="none">...</video>

<!-- Reserve space for dynamic content (ads, embeds) -->
<div style="aspect-ratio: 16/9; background: #f0f0f0;">
  <!-- Lazy-loaded content -->
</div>

<!-- Never insert content above existing content dynamically -->
<!-- Use CSS transforms for animations instead of top/left/width/height -->
```

### 7.3 INP Optimization

```javascript
// Break long tasks into smaller chunks
// Bad: one 500ms synchronous block
function processLargeDataset(data) {
  // ... 500ms of work
}

// Good: yield to the browser between chunks
async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i += 100) {
    processChunk(data.slice(i, i + 100));
    await new Promise(resolve => setTimeout(resolve, 0)); // yield
  }
}
```

---

## 8. Link Building & Authority (Off-Page SEO)

Domain Authority (DA) is built through **external links pointing to your site**. Quality > Quantity.

### 8.1 High-Value Link Sources for a SaaS/Software Product

| Source | Strategy |
|---|---|
| **Product Hunt launch** | Launch on PH — gets do-follow links from PH + press coverage |
| **Hacker News (Show HN)** | Post "Show HN: [Your Product]" — massive traffic + links |
| **GitHub** | Open-source part of the project or link to your app from repo README |
| **Reddit** | Organic mentions in r/productivity, r/webdev, r/MacApps |
| **Software directories** | AlternativeTo, G2, Capterra, Slant, ToolsForHumans, SaaSHub |
| **Blog guest posts** | Write for productivity/dev blogs with a link back |
| **Resource pages** | Find "best productivity tools" listicles and pitch to be included |
| **HARO / Connectively** | Answer journalist queries; get cited in articles |
| **YouTube** | Create demo videos; link in description |
| **Newsletter mentions** | Reach out to productivity-focused newsletters |

### 8.2 Link-Building Rules

- Never buy links — Penguin penalty risk
- Prioritize topically relevant links over high-DA irrelevant ones
- Anchor text should vary: branded, generic ("click here"), partial match, exact match (~5%)
- One great link from a DR70+ site beats 100 links from DR10 sites
- Disavow spammy/toxic links via Google Search Console if needed

### 8.3 Internal vs External Links

- **External links you give out**: Link to authoritative sources (MDN, research papers) — signals quality to Google
- **External links coming in**: The real authority signal — focus link-building efforts here

---

## 9. E-E-A-T: Experience, Expertise, Authoritativeness, Trust

This is Google's quality framework post-2022. Critical for ranking in competitive niches.

### 9.1 Experience

Show that real people with real experience built/use this product:
```html
<!-- Include: -->
<!-- - Founder/team page with real names and photos -->
<!-- - Case studies with real metrics -->
<!-- - "Built by" attribution with LinkedIn profiles -->
<!-- - User testimonials with names, photos, titles -->
```

### 9.2 Expertise

```html
<!-- Blog posts authored by named experts -->
<!-- Author bio pages with credentials -->
<!-- Citations to research and data -->
<!-- Deep, accurate content that only someone who knows the domain could write -->
```

### 9.3 Authoritativeness

```html
<!-- Press mentions page: "As seen in..." -->
<!-- Third-party reviews and ratings -->
<!-- Number of users/sessions served (social proof) -->
<!-- Awards or recognition -->
```

### 9.4 Trust

```html
<!-- HTTPS (already covered) -->
<!-- Privacy Policy page (required by Google) -->
<!-- Terms of Service page -->
<!-- Clear contact information -->
<!-- Real business address (even for solo projects) -->
<!-- Security badges / SOC2 / GDPR compliance if applicable -->
```

**Implementation in `<head>`:**
```html
<!-- Link to trust pages in footer and sitemap -->
<!-- Include author markup on all blog content -->
<!-- Display real user counts where possible -->
```

---

## 10. Content Strategy for SaaS / Software Websites

### 10.1 Content Pillars for a Focus/Productivity App

Create content around these clusters:

**Cluster 1: Deep Work**
- "What is deep work?" (informational)
- "How to do deep work" (how-to)
- "Deep work schedule template" (tool/resource)
- "Best deep work tools" (comparison — rank your product)
- "Cal Newport deep work summary" (informational — high volume)

**Cluster 2: Focus & Productivity**
- "How to improve focus at work"
- "Focus timer techniques"
- "Pomodoro vs time blocking"
- "Best productivity apps for developers"

**Cluster 3: Time Tracking**
- "How to track productive time"
- "Passive time tracking vs manual"
- "Time tracking for freelancers"
- "Best browser-based time trackers"

**Cluster 4: Remote Work / Developer Tools**
- "Best tools for remote developers"
- "How to stay focused working from home"
- "Browser extensions for productivity"

### 10.2 Content Format Priority

```
Homepage          → Conversion-focused, keyword-rich, social proof
Features pages    → One per major feature, deep keyword coverage
Blog posts        → Informational/educational, builds topical authority
Comparison pages  → "[Your product] vs [Competitor]" — high commercial intent
Use case pages    → "Wall Clock for developers", "Wall Clock for writers"
Changelog/Updates → Shows freshness signal to Google
FAQ page          → Targets question keywords, FAQ schema
```

### 10.3 Content Freshness Signals

```html
<!-- Add datePublished and dateModified to all content -->
<time datetime="2024-01-15" itemprop="datePublished">January 15, 2024</time>

<!-- Regularly update key pages — even small updates help -->
<!-- Add "Last updated: [date]" visible to users -->
<!-- Keep a changelog or "What's New" section -->
```

---

## 11. Local SEO (if applicable)

If your product has a physical business or targets specific regions:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Wall Clock",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94102",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
</script>
```

For a pure SaaS, skip local schema but DO ensure:
- Content targets global English-speaking audience by default
- Use `hreflang` tags if you have multiple language versions

---

## 12. Mobile SEO

Google uses **mobile-first indexing** — your mobile version IS your ranking version.

### 12.1 Viewport Meta Tag

```html
<!-- Required in <head> -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 12.2 Mobile-Friendly Rules

```css
/* Minimum touch target size: 48x48px */
button, a {
  min-height: 48px;
  min-width: 48px;
}

/* Font size minimum: 16px to prevent iOS zoom */
input, select, textarea {
  font-size: 16px;
}

/* No horizontal scrolling */
body {
  overflow-x: hidden;
}
```

### 12.3 Testing

- Use Google's Mobile-Friendly Test tool
- Test in Google Search Console under "Mobile Usability"
- Test on real devices, not just Chrome DevTools

---

## 13. Indexing & Crawl Optimization

### 13.1 Control What Gets Indexed

```html
<!-- Pages you WANT indexed: canonical + in sitemap -->

<!-- Pages you DON'T want indexed: -->
<meta name="robots" content="noindex, nofollow" />
<!-- Use on: thank-you pages, admin pages, duplicate content, pagination beyond page 2 -->

<!-- Pages you want indexed but not followed: -->
<meta name="robots" content="index, nofollow" />
```

### 13.2 Crawl Budget Optimization

For larger sites (100+ pages):
- Block non-essential pages in robots.txt (admin, API, internal search results)
- Ensure no redirect chains (A → B → C — fix to A → C)
- Fix broken links (404s waste crawl budget)
- Use internal links to point Googlebot to important pages

### 13.3 JavaScript SEO

Google can render JavaScript but it's slower and uses more crawl budget.

```javascript
// Prefer server-side rendering (SSR) or static generation (SSG) for critical content
// Next.js: use getStaticProps or getServerSideProps for SEO-critical pages

// If content MUST be client-side:
// Ensure it renders within ~5 seconds
// Test with "Fetch as Google" in Search Console
// Use dynamic rendering as a fallback if needed
```

---

## 14. Meta Tags — Complete Reference

```html
<head>
  <!-- Required -->
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Primary Keyword — Secondary | Brand Name</title>
  <meta name="description" content="150–160 char description with primary keyword and CTA." />
  <link rel="canonical" href="https://yourdomain.com/page-url/" />

  <!-- Robots -->
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

  <!-- Open Graph (Facebook, LinkedIn) -->
  <meta property="og:title" content="Page Title Here" />
  <meta property="og:description" content="Same or similar to meta description." />
  <meta property="og:image" content="https://yourdomain.com/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="https://yourdomain.com/page-url/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Wall Clock" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@yourtwitterhandle" />
  <meta name="twitter:title" content="Page Title Here" />
  <meta name="twitter:description" content="Description here." />
  <meta name="twitter:image" content="https://yourdomain.com/twitter-image.jpg" />

  <!-- Favicon set -->
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />

  <!-- Theme color (Chrome address bar) -->
  <meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#f5f0e8" media="(prefers-color-scheme: light)" />

  <!-- Verification tags (add yours) -->
  <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />

  <!-- All structured data scripts go here -->
</head>
```

---

## 15. Open Graph & Social Signals

OG image specifications:
- **Dimensions**: 1200 × 630px (Twitter), 1200 × 628px (Facebook/LinkedIn)
- **Format**: JPG or PNG (no transparency for OG)
- **File size**: Under 1MB
- **Content**: Include your brand, page title, and a visual hook — text should be legible at small sizes

Social signals (likes, shares) are **not** a direct ranking factor but drive:
- Traffic → dwell time signal
- Link acquisition (people share, bloggers link)
- Brand searches (a strong indirect signal)

---

## 16. Image SEO

```html
<!-- Always include alt text -->
<img
  src="/images/focus-session-dashboard.webp"
  alt="Wall Clock focus session dashboard showing weekly heatmap and streak counter"
  width="1200"
  height="675"
  loading="lazy"
/>

<!-- Use descriptive filenames (kebab-case) -->
<!-- Good:  focus-session-heatmap-weekly.webp -->
<!-- Bad:   IMG_20240115_1234.jpg -->

<!-- Image format guide: -->
<!-- Photos: WebP (primary) + JPEG (fallback) -->
<!-- Graphics/logos/icons: SVG > WebP > PNG -->
<!-- Animations: WebP (animated) > GIF -->
```

**Compression targets:**
- Hero images: under 200KB
- Blog images: under 100KB
- Icons/UI elements: under 20KB
- Use tools: Squoosh, Sharp (Node.js), ImageOptim

---

## 17. Internal Linking Architecture

Internal links distribute **PageRank** throughout your site and help Google understand content hierarchy.

### 17.1 Hub-and-Spoke Model

```
Homepage (hub)
  ├── /features (hub)
  │     ├── /features/session-tracking (spoke)
  │     ├── /features/streaks (spoke)
  │     └── /features/heatmap (spoke)
  ├── /blog (hub)
  │     ├── /blog/deep-work-guide (spoke)
  │     ├── /blog/pomodoro-vs-time-blocking (spoke)
  │     └── /blog/best-focus-tools-2024 (spoke)
  └── /pricing (spoke)
```

### 17.2 Internal Link Rules

```html
<!-- Use descriptive, keyword-rich anchor text -->
<!-- Good: -->
<a href="/features/session-tracking">passive focus session tracking</a>

<!-- Bad: -->
<a href="/features/session-tracking">click here</a>
<a href="/features/session-tracking">learn more</a>

<!-- Link from high-authority pages (homepage, popular blog posts) to pages
     you want to rank higher -->

<!-- Aim for 3–10 contextual internal links per page -->
<!-- Add breadcrumb navigation to all non-homepage pages -->
```

---

## 18. URL Structure

```
# Optimal URL patterns:

Homepage:        https://yourdomain.com/
Features:        https://yourdomain.com/features/
Feature detail:  https://yourdomain.com/features/session-tracking/
Blog index:      https://yourdomain.com/blog/
Blog post:       https://yourdomain.com/blog/how-to-track-deep-work/
Pricing:         https://yourdomain.com/pricing/
About:           https://yourdomain.com/about/
```

**URL Rules:**
- All lowercase
- Hyphens (`-`) to separate words (NOT underscores `_`)
- No special characters, no parameters in indexable URLs
- Short and descriptive — include primary keyword
- Consistent trailing slash (pick one and canonicalize the other)
- Never change URLs after publishing without a 301 redirect

---

## 19. Site Architecture & Information Hierarchy

```
# Maximum crawl depth from homepage: 3 clicks
# Every important page should be reachable in ≤ 3 clicks

Homepage → Category page → Individual page = 3 levels deep ✓
Homepage → Category → Sub-category → Page = 4 levels deep ✗ (for small sites)
```

**Navigation recommendations:**
- Global header nav: Homepage, Features, Pricing, Blog, Login/Sign Up
- Footer nav: About, Privacy Policy, Terms of Service, Contact, Changelog, Sitemap
- Breadcrumbs on all pages except homepage
- Sidebar or related content links on blog posts

---

## 20. Analytics & Search Console Setup

### 20.1 Google Search Console (Free — Critical)

Actions to take immediately:
1. Verify ownership via DNS TXT record (most reliable)
2. Submit your sitemap
3. Monitor "Coverage" report for indexing errors
4. Check "Core Web Vitals" report
5. Review "Performance" → "Queries" to see what you rank for
6. Set up email alerts for manual penalties

```html
<!-- Add GSC verification meta tag to <head> -->
<meta name="google-site-verification" content="YOUR_CODE_FROM_GSC" />
```

### 20.2 Google Analytics 4 (GA4)

```html
<!-- Add after </head> or use GTM -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 20.3 Key Metrics to Track

| Metric | Why It Matters |
|---|---|
| Organic search traffic | Primary growth metric |
| CTR by page | Indicates title/description quality |
| Average position by keyword | Shows ranking trends |
| Bounce rate / Engagement rate | Indicates content quality match |
| Conversion from organic | Ultimate ROI of SEO |
| Page speed (GSC CWV report) | Direct ranking signal |

---

## 21. Competitor & SERP Analysis

### 21.1 Analyze Top-Ranking Pages

For each target keyword, study the top 5 results:
- What content format is Google rewarding? (Article? Tool? List?)
- What is the average word count?
- What sections/headings do all top pages have?
- What questions do they answer?
- What are they missing that you can do better?

### 21.2 Tools for Competitor Research (Free Tier Available)

| Tool | Use Case |
|---|---|
| Ahrefs Webmaster Tools | Your site's backlinks + ranking keywords |
| Ubersuggest | Competitor keywords and content ideas |
| Semrush (free tier) | Domain overview, keyword gaps |
| SimilarWeb | Traffic estimation |
| MozBar (Chrome extension) | Quick DA check while browsing |
| Screaming Frog (free up to 500 URLs) | Technical crawl of competitors |

---

## 22. What No Longer Works (Avoid These)

| Tactic | Why It's Dead |
|---|---|
| **Keyword stuffing** | Panda/Hummingbird penalties; content reads poorly |
| **Exact-match anchor text spam** | Penguin penalty |
| **Buying links** | Manual penalty + link devaluation |
| **Article spinning** | Helpful Content system penalizes this |
| **Private Blog Networks (PBNs)** | Penguin/Manual penalties |
| **Meta keywords tag** | Google ignores it (has since 2009) |
| **Doorway pages** | Google manually penalizes these |
| **Cloaking** | Immediate manual penalty |
| **Comment spam for links** | Nofollow by default; zero value |
| **Thin affiliate pages** | Panda penalty |
| **Copied/scraped content** | Filtered from index |
| **Keyword-exact domain names** (EMDs) | EMD update devalued these |

---

## 23. Implementation Checklist

### 🔴 Priority 1 — Do This Week (Foundation)

- [ ] HTTPS enabled and HTTP redirects to HTTPS
- [ ] `robots.txt` created and correct
- [ ] XML sitemap created and submitted to Google Search Console
- [ ] Google Search Console verified and sitemap submitted
- [ ] GA4 / analytics installed
- [ ] `<meta name="viewport">` present on all pages
- [ ] Every page has unique `<title>` (50–60 chars with keyword)
- [ ] Every page has unique `<meta name="description">` (150–160 chars)
- [ ] Every page has a self-referencing canonical tag
- [ ] H1 tag on every page (only one per page)
- [ ] HTTPS / SSL certificate valid
- [ ] 404 page returns correct HTTP 404 status code
- [ ] No broken internal links

### 🟠 Priority 2 — Do This Month (On-Page + Technical)

- [ ] Core Web Vitals passing (measure in PageSpeed Insights)
- [ ] All images have descriptive `alt` text
- [ ] Images in WebP format with width/height defined
- [ ] Structured data: SoftwareApplication schema on homepage
- [ ] Structured data: Organization schema
- [ ] Open Graph tags on all pages
- [ ] Twitter card tags on all pages
- [ ] FAQ schema on homepage and FAQ page
- [ ] Breadcrumb navigation + BreadcrumbList schema
- [ ] Internal linking: 3–5 contextual links per page
- [ ] URL structure: lowercase, hyphens, keyword-included
- [ ] Footer links: Privacy Policy, Terms of Service, Contact

### 🟡 Priority 3 — Do This Quarter (Content + Authority)

- [ ] 5–10 foundational blog posts targeting cluster keywords
- [ ] "People Also Ask" FAQ section on homepage
- [ ] Listed on: Product Hunt, AlternativeTo, SaaSHub, G2
- [ ] Posted on Hacker News Show HN (or scheduled)
- [ ] Author bio page created with E-E-A-T signals
- [ ] Testimonials/reviews section with Schema markup
- [ ] Competitor comparison pages (your product vs alternatives)
- [ ] Use case pages (for developers, for writers, etc.)

### 🟢 Priority 4 — Ongoing (Authority + Freshness)

- [ ] Publish 2–4 blog posts per month targeting long-tail keywords
- [ ] Monthly Google Search Console review (fix crawl errors)
- [ ] Monthly backlink acquisition (1–3 quality links/month)
- [ ] Update top pages quarterly (add new sections, refresh stats)
- [ ] Monitor Core Web Vitals and fix regressions
- [ ] Track keyword rankings monthly
- [ ] Add new FAQs based on support questions and GSC queries

---

## Quick-Reference: What to Put in `<head>` for Maximum SEO

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO Core -->
  <title>Primary Keyword — Secondary Keyword | Brand</title>
  <meta name="description" content="155-char description with keyword + CTA." />
  <link rel="canonical" href="https://yourdomain.com/this-page/" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

  <!-- Performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" href="/images/hero.webp" as="image" />
  <style>/* Critical inline CSS */</style>

  <!-- Social -->
  <meta property="og:title" content="Page Title" />
  <meta property="og:description" content="Description" />
  <meta property="og:image" content="https://yourdomain.com/og.jpg" />
  <meta property="og:url" content="https://yourdomain.com/this-page/" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Page Title" />
  <meta name="twitter:description" content="Description" />
  <meta name="twitter:image" content="https://yourdomain.com/twitter.jpg" />

  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />

  <!-- Verification -->
  <meta name="google-site-verification" content="YOUR_CODE" />

  <!-- Structured Data -->
  <script type="application/ld+json">{ "@context": "https://schema.org", ... }</script>

  <!-- Analytics (end of head or body) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>
</head>
```

---

*Last updated: 2024 | Based on Google's published guidelines, quality rater documentation, confirmed algorithm signals, and SEO community research (Ahrefs, Semrush, Moz, Search Engine Journal, Google Search Central blog).*