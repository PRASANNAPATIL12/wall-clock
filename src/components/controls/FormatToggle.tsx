export type Format = '12' | '24';

interface Props {
  format: Format;
  onChange: (f: Format) => void;
}

export function FormatToggle({ format, onChange }: Props) {
  const is12 = format === '12';
  return (
    <div className="seg seg--sm" role="tablist" aria-label="Time format">
      <span
        className="seg__indicator"
        style={{ transform: is12 ? 'translateX(0)' : 'translateX(100%)' }}
      />
      <button
        role="tab"
        aria-selected={is12}
        data-active={is12}
        className="seg__btn"
        onClick={() => onChange('12')}
      >
        12h
      </button>
      <button
        role="tab"
        aria-selected={!is12}
        data-active={!is12}
        className="seg__btn"
        onClick={() => onChange('24')}
      >
        24h
      </button>
    </div>
  );
}
