import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AccountPane } from './settings/AccountPane';
import { PlanPane } from './settings/PlanPane';
import { StatsPane } from './settings/StatsPane';
import { TagsPane } from './settings/TagsPane';
import { SoundsPane } from './settings/SoundsPane';
import { AboutPane } from './settings/AboutPane';
import { GuidePane } from './settings/GuidePane';
import './SettingsDialog.css';

interface Props {
  user: User;
  initialPane?: PaneKey;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  refreshKey?: number;
  /** Increments after a planned session is saved — triggers clock ring refresh. */
  onScheduleChanged?: () => void;
  autoOpenTagAdd?: boolean;
  onManageTags?: () => void;
  /** Pre-computed streak from App so Stats shows it instantly (no wait for DB). */
  initialStreak?: number;
}

export type PaneKey =
  | 'account'
  | 'plan'
  | 'stats'
  | 'tags'
  | 'sounds'
  | 'guide'
  | 'about';

/** Feather-style SVG icon (24×24, stroke, fill=none). */
function NavIcon({ path, size = 15 }: { path: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}

const NAV: Array<{ key: PaneKey; label: string; iconPath: string }> = [
  {
    key: 'account',
    label: 'Account',
    iconPath: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  },
  {
    key: 'plan',
    label: 'Plan',
    // Calendar icon — schedule future sessions
    iconPath: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  },
  {
    key: 'stats',
    label: 'Stats',
    iconPath: 'M18 20V10M12 20V4M6 20v-6',
  },
  {
    key: 'tags',
    label: 'Tags',
    iconPath: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  },
  {
    key: 'sounds',
    label: 'Sounds',
    iconPath: 'M11 5 6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07',
  },
  {
    key: 'guide',
    label: 'Guide',
    // Book-open icon — walkthrough / help
    iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  },
  {
    key: 'about',
    label: 'About',
    iconPath: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  },
];

export function SettingsDialog({
  user,
  initialPane = 'stats',
  onClose,
  onSignOut,
  refreshKey,
  onScheduleChanged,
  autoOpenTagAdd = false,
  onManageTags,
  initialStreak = 0,
}: Props) {
  const [pane, setPane] = useState<PaneKey>(initialPane);

  // Drag-to-close: track touch on the header. Only the header responds —
  // dragging down > 60 px closes the sheet.
  const dragStartY = useRef<number | null>(null);

  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]?.clientY ?? null;
  };
  const handleHeaderTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = (e.touches[0]?.clientY ?? 0) - dragStartY.current;
    if (delta > 60) {
      dragStartY.current = null;
      onClose();
    }
  };
  const handleHeaderTouchEnd = () => { dragStartY.current = null; };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="settings-header"
          onTouchStart={handleHeaderTouchStart}
          onTouchMove={handleHeaderTouchMove}
          onTouchEnd={handleHeaderTouchEnd}
        >
          {/* Drag handle — only visible on mobile (CSS shows/hides) */}
          <span className="settings-drag-handle" aria-hidden />
          <h2>Wall Clock</h2>
          <button className="settings-close" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav" aria-label="Settings sections">
            <ul>
              {NAV.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`settings-nav__item${pane === item.key ? ' is-active' : ''}`}
                    onClick={() => setPane(item.key)}
                  >
                    <span className="settings-nav__icon">
                      <NavIcon path={item.iconPath} />
                    </span>
                    <span className="settings-nav__label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            {/* Sign out: in sidebar on desktop, hidden from nav on mobile (shown as footer) */}
            <button
              type="button"
              className="settings-nav__signout settings-nav__signout--sidebar"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </nav>

          <section className="settings-pane" data-pane={pane}>
            {pane === 'account' && <AccountPane user={user} onSignOut={onSignOut} />}
            {pane === 'plan'    && (
              <PlanPane
                user={user}
                onScheduleChanged={onScheduleChanged}
                onManageTags={onManageTags ?? (() => setPane('tags'))}
              />
            )}
            {pane === 'stats'   && (
              <StatsPane user={user} refreshKey={refreshKey} initialStreak={initialStreak} />
            )}
            {pane === 'tags'    && <TagsPane autoOpenAdd={autoOpenTagAdd} />}
            {pane === 'sounds'  && <SoundsPane />}
            {pane === 'guide'   && <GuidePane onClose={onClose} />}
            {pane === 'about'   && <AboutPane />}
          </section>
        </div>

        {/* Sign out is in the Account pane (accessible on all screen sizes).
            The sidebar sign-out button remains on desktop for quick access. */}
      </div>
    </div>
  );
}
