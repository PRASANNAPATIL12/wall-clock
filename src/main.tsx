import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './styles/global.css';

/**
 * The cinematic landing page is code-split — users who land on `/app`
 * (returning users, bookmarks) don't pay the landing page bundle cost.
 */
const LandingPage = lazy(() => import('./pages/LandingPage'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* `/` — Cinematic scrollytelling landing page (first-time visitors). */}
        <Route
          path="/"
          element={
            <Suspense fallback={null}>
              <LandingPage />
            </Suspense>
          }
        />
        {/* `/app` — The live focus clock application. */}
        <Route path="/app" element={<App />} />
        {/* Any other path inside the SPA falls back to the app.
            Static legal pages (/privacy, /terms) are served by _redirects
            from public/ BEFORE the SPA catch-all kicks in. */}
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
