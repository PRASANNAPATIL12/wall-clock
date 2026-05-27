export type Mode = 'analog' | 'digital';

interface Props {
  mode: Mode;
  onChange: (m: Mode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  const isAnalog = mode === 'analog';
  return (
    <div className="seg" role="tablist" aria-label="Clock mode">
      <span
        className="seg__indicator"
        style={{ transform: isAnalog ? 'translateX(0)' : 'translateX(100%)' }}
      />
      <button
        role="tab"
        aria-selected={isAnalog}
        data-active={isAnalog}
        className="seg__btn"
        onClick={() => onChange('analog')}
      >
        Analog
      </button>
      <button
        role="tab"
        aria-selected={!isAnalog}
        data-active={!isAnalog}
        className="seg__btn"
        onClick={() => onChange('digital')}
      >
        Digital
      </button>
    </div>
  );
}
