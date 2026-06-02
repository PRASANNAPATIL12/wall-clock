import './AboutPane.css';


export function AboutPane() {
  return (
    <div className="about-pane">
      <h3>About</h3>

      <p className="about-pane__lead">
        Wall Clock is a focus tool built around a simple idea: the best
        way to be productive is to see exactly where your time goes.
      </p>

      <section className="about-pane__section">
        <h4>Our mission</h4>
        <p>
          Most productivity apps reward <em>planning</em>. Wall Clock rewards
          <em> showing up</em>. Set a focus ring on the clock face, work until
          it completes, and let the data speak for itself over days and weeks.
        </p>
      </section>

      <section className="about-pane__section">
        <h4>Design principles</h4>
        <ul>
          <li>The clock is always the center of attention — every control steps aside when you are not interacting.</li>
          <li>No notifications, no streaks gamified into anxiety. Just an honest record of your focus time.</li>
          <li>Sessions belong to you. Export your full history as JSON at any time from the Account tab.</li>
        </ul>
      </section>

      <section className="about-pane__section">
        <h4>Privacy</h4>
        <p>
          Sessions are stored in your account only. Nothing is shared,
          sold, or analyzed for advertising. The app works offline
          for the clock — an account is needed only for session history.
        </p>
      </section>

      <div className="about-pane__meta">
        <span>Wall Clock</span>
        <span className="about-pane__sep">·</span>
        <a href="/privacy" target="_blank" rel="noopener" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
          Privacy Policy
        </a>
        <span className="about-pane__sep">·</span>
        <a href="/terms" target="_blank" rel="noopener" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
          Terms of Service
        </a>
      </div>
    </div>
  );
}
