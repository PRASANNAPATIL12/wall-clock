export function AboutPane() {
  return (
    <div>
      <h3>About</h3>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
        Wall Clock is a focus tool that lives in your browser tab. Sessions are
        private to your account; nothing is shared.
      </p>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 14 }}>
        <a
          href="https://github.com/PRASANNAPATIL12/wall-clock"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--fg)' }}
        >
          GitHub →
        </a>
      </p>
    </div>
  );
}
