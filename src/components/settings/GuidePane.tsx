import './GuidePane.css';

interface Props {
  /** Called to close the SettingsDialog after replaying the walkthrough. */
  onClose: () => void;
}

interface FeatureCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}

function Icon({ path, path2 }: { path: string; path2?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
      {path2 && <path d={path2} />}
    </svg>
  );
}

const CARDS: FeatureCard[] = [
  {
    id: 'ring',
    icon: <Icon path="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
    title: 'The Focus Ring',
    description:
      'Click once anywhere on the ring to start tracking. Click again to set a goal time. A third click ends and saves the session. Three clicks — that\'s the whole interaction.',
    accent: '#818cf8',
  },
  {
    id: 'goals',
    icon: <Icon path="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4l3 3" />,
    title: 'Goals & Timing',
    description:
      'After click two, drag the end marker to fine-tune your goal time. The ring plays a chime when you hit your goal. Keep going and it logs bonus time automatically.',
    accent: '#34d399',
  },
  {
    id: 'tags',
    icon: <Icon path="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" />,
    title: 'Tags',
    description:
      'A tag picker appears after you set a goal. Pick an activity like Code, Study, or Design — or create your own. Tags colour-code your history and show where your focus goes over time.',
    accent: '#c084fc',
  },
  {
    id: 'plan',
    icon: <Icon path="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" />,
    title: 'Planning',
    description:
      'Open the Plan section to schedule focus blocks for the next few days. Planned sessions appear as glowing arcs around the clock face so you can see your day at a glance.',
    accent: '#60a5fa',
  },
  {
    id: 'stats',
    icon: <Icon path="M18 20V10M12 20V4M6 20v-6" />,
    title: 'Stats & Streaks',
    description:
      'Your focus heatmap shows intensity across weeks and months. Build a daily streak — it resets if you miss a day. Export your full history as JSON from the Account section anytime.',
    accent: '#fbbf24',
  },
];

/**
 * GuidePane — onboarding walkthrough replay + visual feature reference.
 *
 * Design principles:
 *   · Compact feature cards — icon, bold title, 2-sentence description.
 *   · Accent bar on the left of each card matches the feature's color.
 *   · Replay button resets wall.hint.seen so the three onboarding arrows
 *     fire again on the next ring interaction.
 *   · Responsive grid: 2 columns ≥ 480px, single column below.
 */
export function GuidePane({ onClose }: Props) {
  const handleReplay = () => {
    try {
      localStorage.removeItem('wall.hint.seen');
    } catch { /* ignore */ }
    onClose();
  };

  return (
    <div className="guide-pane">
      <div className="guide-pane__header">
        <h3>Guide</h3>
        <p className="guide-pane__subtitle">
          Everything Wall Clock can do, in one place.
        </p>
      </div>

      {/* Replay button */}
      <button
        type="button"
        className="guide-replay-btn"
        onClick={handleReplay}
        aria-label="Replay the onboarding walkthrough"
      >
        <span className="guide-replay-btn__icon" aria-hidden>
          {/* Play triangle */}
          <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" stroke="none" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        Replay walkthrough
        <span className="guide-replay-btn__hint">closes this panel</span>
      </button>

      {/* Feature cards */}
      <div className="guide-cards">
        {CARDS.map((card) => (
          <div key={card.id} className="guide-card">
            <span
              className="guide-card__accent"
              style={{ background: card.accent }}
              aria-hidden
            />
            <div className="guide-card__body">
              <div className="guide-card__title-row">
                <span
                  className="guide-card__icon"
                  style={{ color: card.accent }}
                  aria-hidden
                >
                  {card.icon}
                </span>
                <h4 className="guide-card__title">{card.title}</h4>
              </div>
              <p className="guide-card__desc">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick-reference tips */}
      <div className="guide-tips">
        <h4 className="guide-tips__heading">Quick reference</h4>
        <ul className="guide-tips__list">
          <li>
            <span className="guide-tips__key">Click 1</span>
            <span className="guide-tips__val">Start tracking</span>
          </li>
          <li>
            <span className="guide-tips__key">Click 2</span>
            <span className="guide-tips__val">Set goal time + pick a tag</span>
          </li>
          <li>
            <span className="guide-tips__key">Drag end point</span>
            <span className="guide-tips__val">Adjust goal time</span>
          </li>
          <li>
            <span className="guide-tips__key">Click 3</span>
            <span className="guide-tips__val">Save &amp; clear session</span>
          </li>
          <li>
            <span className="guide-tips__key">Idle 5 s</span>
            <span className="guide-tips__val">Controls hide automatically</span>
          </li>
          <li>
            <span className="guide-tips__key">Schedule badge</span>
            <span className="guide-tips__val">Toggle concentric day-rings</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
