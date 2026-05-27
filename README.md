# Wall Clock

A beautiful, minimalist online wall clock for your desktop. Sweep-seconds analog and digital, world timezones, dark mode, fullscreen — built to live on a monitor and help you focus.

**Live demo:** https://wall-clock.vercel.app/ (after deploy)

## Features

- Continuous sweep-seconds analog face with JetBrains Mono numerals
- Elegant digital readout (JetBrains Mono 200, tabular numerals, red seconds)
- 23 curated world timezones (UTC, NY, London, Tokyo, IST, Sydney, …)
- Light and dark themes (with warm cream / deep-black palettes)
- True fullscreen mode for any monitor
- Liquid-glass translucent controls with Apple-curve easings
- All controls fade away after 5 s of inactivity, cursor hides
- Zero tracking, zero signup, single-page, offline-friendly

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Build for production

```bash
npm run build
npm run preview      # serve the dist/ bundle locally
```

## Deploy

Drop the repo into Vercel (or Render / Netlify) — no configuration needed; `vercel.json` is pre-wired. Once you have your final domain, find-replace `wall-clock.vercel.app` in `index.html`, `robots.txt`, `sitemap.xml` and `public/manifest.webmanifest` for SEO accuracy.

## Tech

React 18 · TypeScript · Vite · zero runtime deps beyond React.

## License

MIT
