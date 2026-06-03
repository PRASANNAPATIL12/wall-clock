import { HINTS_REPLAY_EVENT } from '../../hooks/useOnboardingHint';
import './GuidePane.css';

interface Props {
  onClose: () => void;
}

/**
 * GuidePane — simple, readable reference for all Wall Clock features.
 *
 * Design: plain headings + short paragraphs/bullets. No cards.
 * "Replay walkthrough" clears wall.hint.seen, dispatches the replay event
 * so the hook re-fires for the current ring state, then closes settings.
 */
export function GuidePane({ onClose }: Props) {
  const handleReplay = () => {
    try {
      localStorage.removeItem('wall.hint.seen');
      // Dispatch replay event → useOnboardingHint re-fires immediately
      // for whatever ring state is currently active (idle / tracking / targeted).
      window.dispatchEvent(new CustomEvent(HINTS_REPLAY_EVENT));
    } catch { /* ignore quota / private-mode errors */ }
    onClose();
  };

  return (
    <div className="guide-pane">
      <h3>Guide</h3>

      <button
        type="button"
        className="guide-replay-btn"
        onClick={handleReplay}
        aria-label="Replay the onboarding walkthrough"
      >
        <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor" stroke="none" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
        Replay walkthrough
      </button>

      <section className="guide-section">
        <h4>The focus ring</h4>
        <p>
          Wall Clock centres around a single ring that lives just outside the clock face.
          The whole interaction is three clicks:
        </p>
        <ul>
          <li><strong>Click 1</strong> — starts a session. The ring begins tracking elapsed time from that moment.</li>
          <li><strong>Click 2</strong> — sets a goal. The ring marks your target end time and a tag picker appears so you can categorise the session.</li>
          <li><strong>Click 3</strong> — ends and saves the session. History, streak, and stats update immediately.</li>
        </ul>
      </section>

      <section className="guide-section">
        <h4>Adjusting goal time</h4>
        <p>
          After click 2, a small dot appears at the goal position on the ring.
          Drag it clockwise or anti-clockwise to move the goal time minute by minute.
          A soft tick plays at each minute boundary so you can feel the adjustment without watching the screen.
          When you reach your goal, a chime plays and the ring switches to bonus-time mode — extra time you ran past the target.
        </p>
      </section>

      <section className="guide-section">
        <h4>Tags</h4>
        <p>
          A tag picker slides in right after you set a goal. Pick an activity — Code, Study, Design, and so on — to categorise the session.
          Tags appear in your history rows and build up a colour-coded picture of where your focus goes over time.
        </p>
        <p>
          To create a custom tag, tap the <strong>+</strong> button in the picker. This opens the Tags settings with the add form ready — type a name, hit Add, and the new tag appears in the picker immediately. Then pick it to attach it to your session.
        </p>
      </section>

      <section className="guide-section">
        <h4>Planning sessions</h4>
        <p>
          Open the <strong>Plan</strong> section to schedule focus blocks for the next few days.
          Planned sessions appear as glowing arcs on the concentric rings around the clock face.
          Tap the schedule badge (above the today summary) to toggle the rings view on and off.
          Hover or tap an arc to see the tag and time details.
        </p>
      </section>

      <section className="guide-section">
        <h4>Stats and streaks</h4>
        <p>
          The <strong>Stats</strong> section shows a focus heatmap across your chosen time window — from one week up to a full year.
          Each cell's colour intensity reflects how much time you spent focusing that day.
          The streak counter at the top tracks consecutive days with at least one session; it resets to zero if you skip a day.
        </p>
        <p>
          Session history is shown below the heatmap, grouped by day, with a bar chart showing relative session lengths.
        </p>
      </section>

      <section className="guide-section">
        <h4>Quick reference</h4>
        <ul className="guide-ref">
          <li><span className="guide-ref__key">Click 1</span> Start tracking</li>
          <li><span className="guide-ref__key">Click 2</span> Set goal · pick tag</li>
          <li><span className="guide-ref__key">Drag end point</span> Adjust goal time</li>
          <li><span className="guide-ref__key">Click 3</span> Save &amp; clear</li>
          <li><span className="guide-ref__key">Idle 5 s</span> Controls hide automatically</li>
          <li><span className="guide-ref__key">Schedule badge</span> Toggle day-ring arcs</li>
          <li><span className="guide-ref__key">Account → Export</span> Download full history as JSON</li>
        </ul>
      </section>
    </div>
  );
}
