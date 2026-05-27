interface Props {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function FullscreenToggle({ isFullscreen, onToggle }: Props) {
  return (
    <button
      className="pill pill--icon"
      onClick={onToggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      <span className="icon-swap">
        {/* Expand */}
        <svg viewBox="0 0 24 24" className={isFullscreen ? 'is-hidden' : 'is-shown'}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
        {/* Collapse */}
        <svg viewBox="0 0 24 24" className={isFullscreen ? 'is-shown' : 'is-hidden'}>
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        </svg>
      </span>
    </button>
  );
}
