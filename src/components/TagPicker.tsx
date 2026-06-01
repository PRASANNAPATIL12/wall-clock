import { useEffect, useRef, useState } from 'react';
import { getAllTags, type TagDef } from '../lib/tags';
import { TagIcon } from './TagIcon';
import './TagPicker.css';

interface Props {
  /** End-point angle in degrees (0=12 o'clock, clockwise). Used for positioning. */
  endAngleDeg?: number;
  /** Called when the user picks a tag ID or auto-dismiss → null. */
  onPick: (tag: string | null) => void;
  /** Opens Settings → Tags pane. */
  onManageTags?: () => void;
}

/**
 * Compute where the picker should appear based on the end-point angle and
 * viewport size.
 *
 * On mobile portrait (≤ 640px width): always anchored to the bottom of the
 * screen, horizontally centered.
 *
 * On desktop: positioned near the end-point but just outside the clock ring.
 * We project a point at clock-ring radius + padding in the direction of the
 * end-point, then clamp so the picker stays on-screen.
 */
function computePickerStyle(
  endAngleDeg: number | undefined,
): React.CSSProperties {
  if (typeof window === 'undefined') {
    return { bottom: 24, left: '50%', transform: 'translateX(-50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobilePortrait = vw <= 640 && vh > vw;

  if (isMobilePortrait || endAngleDeg === undefined) {
    return {
      bottom: 92,
      left: '50%',
      transform: 'translateX(-50%)',
    };
  }

  // Desktop — project outside the clock ring in the direction of the end-point.
  const cx = vw / 2;
  const cy = vh / 2;
  const dim = Math.min(vw, vh);

  // Clock ring is roughly at 46 % of half the min-dimension from center.
  const clockR = dim * 0.46;
  const PADDING = dim * 0.07; // gap between ring edge and picker edge

  const rad = ((endAngleDeg - 90) * Math.PI) / 180;
  const dist = clockR + PADDING;

  const px = cx + Math.cos(rad) * dist;
  const py = cy + Math.sin(rad) * dist;

  // Picker approximate dimensions
  const PW = 320;
  const PH = 46;
  const MARGIN = 14;

  const left = Math.max(MARGIN, Math.min(vw - PW - MARGIN, px - PW / 2));
  const top  = Math.max(MARGIN, Math.min(vh - PH - MARGIN, py - PH / 2));

  return { left, top };
}

export function TagPicker({ endAngleDeg, onPick, onManageTags }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ tag: TagDef; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tags = getAllTags();

  // Auto-dismiss after 4 s if nothing was picked.
  useEffect(() => {
    if (picked !== null) return;
    const t = window.setTimeout(() => onPick(null), 4000);
    return () => window.clearTimeout(t);
  }, [picked, onPick]);

  // Scroll-hint animation: briefly peek at items to the right, then snap back.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollTo({ left: 52, behavior: 'smooth' });
      const t2 = window.setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 520);
      return () => window.clearTimeout(t2);
    }, 420);
    return () => window.clearTimeout(t);
  }, []);

  const handlePick = (id: string) => {
    setPicked(id);
    setTooltip(null);
    window.setTimeout(() => onPick(id), 220);
  };

  const handleManage = () => {
    setTooltip(null);
    onPick(null); // close picker first
    window.setTimeout(() => onManageTags?.(), 40);
  };

  const pickerStyle = computePickerStyle(endAngleDeg);

  return (
    <div
      className="tag-picker"
      style={pickerStyle}
      role="group"
      aria-label="Tag this session"
    >
      {/* Scrollable icon row */}
      <div ref={scrollRef} className="tag-picker__scroll">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tag-picker__btn${picked === t.id ? ' is-picked' : ''}`}
            onClick={() => handlePick(t.id)}
            aria-label={t.label}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTooltip({ tag: t, x: rect.left + rect.width / 2, y: rect.top });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <TagIcon def={t} size={15} />
          </button>
        ))}

        {/* Divider */}
        <span className="tag-picker__divider" aria-hidden />

        {/* Manage tags (opens Settings → Tags) */}
        <button
          type="button"
          className="tag-picker__manage"
          onClick={handleManage}
          aria-label="Manage tags"
          title=""
          onMouseEnter={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setTooltip({
              tag: { id: '__manage', label: 'Manage tags', path: 'M12 5v14M5 12h14' },
              x: rect.left + rect.width / 2,
              y: rect.top,
            });
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Glass tooltip — fixed-positioned so it's not clipped by overflow */}
      {tooltip && (
        <div
          className="tag-picker__tooltip"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
          aria-hidden
        >
          {tooltip.tag.label}
        </div>
      )}
    </div>
  );
}
