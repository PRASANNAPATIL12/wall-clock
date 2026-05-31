import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AccountPane } from './settings/AccountPane';
import { HistoryPane } from './settings/HistoryPane';
import { StatsPane } from './settings/StatsPane';
import { TagsPane } from './settings/TagsPane';
import { SoundsPane } from './settings/SoundsPane';
import { AboutPane } from './settings/AboutPane';
import './SettingsDialog.css';

interface Props {
  user: User;
  initialPane?: PaneKey;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  /** Bumps after a session save — child panes refetch when it changes. */
  refreshKey?: number;
}

export type PaneKey =
  | 'account'
  | 'history'
  | 'stats'
  | 'tags'
  | 'sounds'
  | 'about';

const NAV: Array<{ key: PaneKey; label: string; icon: string }> = [
  { key: 'account', label: 'Account', icon: '👤' },
  { key: 'history', label: 'History', icon: '📜' },
  { key: 'stats', label: 'Stats', icon: '📊' },
  { key: 'tags', label: 'Tags', icon: '🏷️' },
  { key: 'sounds', label: 'Sounds', icon: '🔊' },
  { key: 'about', label: 'About', icon: 'ℹ️' },
];

export function SettingsDialog({ user, initialPane = 'history', onClose, onSignOut, refreshKey }: Props) {
  const [pane, setPane] = useState<PaneKey>(initialPane);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
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
        <header className="settings-header">
          <h2>Wall Clock</h2>
          <button
            className="settings-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
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
                    <span className="settings-nav__icon" aria-hidden>{item.icon}</span>
                    <span className="settings-nav__label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="settings-nav__signout"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </nav>

          <section className="settings-pane">
            {pane === 'account' && <AccountPane user={user} />}
            {pane === 'history' && <HistoryPane user={user} refreshKey={refreshKey} />}
            {pane === 'stats' && <StatsPane user={user} refreshKey={refreshKey} />}
            {pane === 'tags' && <TagsPane />}
            {pane === 'sounds' && <SoundsPane />}
            {pane === 'about' && <AboutPane />}
          </section>
        </div>
      </div>
    </div>
  );
}
