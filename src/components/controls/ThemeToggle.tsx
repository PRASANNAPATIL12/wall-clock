import type { Theme } from '../../hooks/useTheme';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark';
  return (
    <button
      className="pill pill--icon"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="icon-swap">
        {/* Moon — shown in light mode */}
        <svg viewBox="0 0 24 24" className={isDark ? 'is-hidden' : 'is-shown'}>
          <path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
        </svg>
        {/* Sun — shown in dark mode */}
        <svg viewBox="0 0 24 24" className={isDark ? 'is-shown' : 'is-hidden'}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
    </button>
  );
}
