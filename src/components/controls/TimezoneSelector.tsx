import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMEZONES, formatOffset, getZonedTime } from '../../lib/timezones';

interface Props {
  value: string;
  onChange: (iana: string) => void;
}

export function TimezoneSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => TIMEZONES.find((t) => t.iana === value) ?? TIMEZONES[0],
    [value],
  );

  // Click outside / Escape closes
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Live offset list
  const now = useRef(new Date());
  useEffect(() => {
    const id = setInterval(() => {
      now.current = new Date();
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="tz" data-open={open} ref={ref}>
      <button
        type="button"
        className="pill tz__pill"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span className="tz__label">{selected.label}</span>
        <svg viewBox="0 0 24 24" className="tz__caret" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className="tz__menu" role="listbox">
        {TIMEZONES.map((t) => {
          const off = t.iana === 'local'
            ? formatOffset(getZonedTime(now.current, 'local').offsetMinutes)
            : formatOffset(getZonedTime(now.current, t.iana).offsetMinutes);
          return (
            <button
              key={t.iana}
              role="option"
              aria-selected={t.iana === value}
              data-selected={t.iana === value}
              className="tz__option"
              onClick={() => {
                onChange(t.iana);
                setOpen(false);
              }}
            >
              <span>{t.label}</span>
              <span className="tz__off">{off}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
