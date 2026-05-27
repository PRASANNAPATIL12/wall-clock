export function CoffeeLink() {
  return (
    <a
      className="coffee"
      href="https://buymeacoffee.com/pspatil"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Buy me a coffee"
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
        <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
        <path d="M7 2c0 1 1 1 1 2s-1 1-1 2M11 2c0 1 1 1 1 2s-1 1-1 2M15 2c0 1 1 1 1 2s-1 1-1 2" />
      </svg>
      <span>buy me a coffee</span>
    </a>
  );
}
