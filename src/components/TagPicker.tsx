import { useEffect, useRef, useState } from 'react';
import { getAllTags, TAGS_CHANGED_EVENT } from '../lib/tags';
import { TagIcon } from './TagIcon';
import './TagPicker.css';

interface Props {
  endAngleDeg?: number;
  onPick: (tag: string | null) => void;
  onManageTags?: () => void;
}

/** True when the viewport is portrait-mobile (phone, tablet portrait). */
function isMobilePortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 640 && window.innerHeight > window.innerWidth;
}

/* ---- Position helpers ---- */

/**
 * Desktop vertical: 178 × ~280 px popover near the focus ring end-point.
 * Mobile/portrait:  fixed at bottom-centre (unchanged from original).
 */
function computePickerStyle(
  endAngleDeg: number | undefined,
  vertical: boolean,
): React.CSSProperties {
  if (typeof window === 'undefined')
    return { bottom: 24, left: '50%', transform: 'translateX(-50%)' };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!vertical || endAngleDeg === undefined) {
    return { bottom: 170, left: '50%', transform: 'translateX(-50%)' };
  }

  // Position near the ring end-point
  const cx = vw / 2, cy = vh / 2;
  const dim = Math.min(vw, vh);
  const clockR = dim * 0.46;
  const PADDING = dim * 0.07;
  const rad = ((endAngleDeg - 90) * Math.PI) / 180;
  const px = cx + Math.cos(rad) * (clockR + PADDING);
  const py = cy + Math.sin(rad) * (clockR + PADDING);
  const PW = 178, PH = 280, MARGIN = 14;
  const left = Math.max(MARGIN, Math.min(vw - PW - MARGIN, px - PW / 2));
  const top  = Math.max(MARGIN, Math.min(vh - PH - MARGIN, py - PH / 2));
  return { left, top };
}

/* ---- Scroll animation helpers (easeInOutCubic) ---- */
function animateScroll(
  el: HTMLElement,
  axis: 'left' | 'top',
  from: number,
  to: number,
  duration: number,
  onDone?: () => void,
): () => void {
  let raf = 0;
  const t0 = performance.now();
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now: number) => {
    const p = Math.min((now - t0) / duration, 1);
    if (axis === 'left') el.scrollLeft = from + (to - from) * ease(p);
    else                  el.scrollTop  = from + (to - from) * ease(p);
    if (p < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* =========================================================================
   TagPicker
   =========================================================================
   Desktop (non-portrait, endAngleDeg provided):
     Vertical glass popover — icon + label per row, scrollable, 178 px wide.
     Entrance: same scale(0.94)+translateY(6px) spring as horizontal.
     Selection: icon pulses with tag-picked-pulse (same keyframe).
     Scroll hint: nudges down then back to reveal more rows below.

   Mobile / portrait (or fallback):
     Horizontal pill — icon-only, scroll hint right.
     Completely unchanged from original.
   ========================================================================= */

export function TagPicker({ endAngleDeg, onPick, onManageTags }: Props) {
  const vertical = !isMobilePortrait() && endAngleDeg !== undefined;

  const [picked,   setPicked]   = useState<string | null>(null);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [tooltipX,  setTooltipX]  = useState(0);
  const [tags,     setTags]     = useState(() => getAllTags());
  const [extended, setExtended] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Reactive tag list — refreshed whenever a custom tag is added/deleted */
  useEffect(() => {
    const refresh = () => setTags(getAllTags());
    window.addEventListener(TAGS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TAGS_CHANGED_EVENT, refresh);
  }, []);

  /* Auto-dismiss:
     · Normal:   5 s  (1 s more than old 4 s — vertical list has more to browse)
     · Extended: 60 s (user went to Settings to add a tag; will return)          */
  useEffect(() => {
    if (picked !== null) return;
    const t = window.setTimeout(() => onPick(null), extended ? 60_000 : 5_000);
    return () => window.clearTimeout(t);
  }, [picked, onPick, extended]);

  /* Scroll hint — vertical: nudge down; horizontal: nudge right */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let cancel: (() => void) | null = null;
    let t1 = 0, t2 = 0;
    const axis = vertical ? 'top' : 'left';
    t1 = window.setTimeout(() => {
      cancel = animateScroll(el, axis, 0, 52, 900, () => {
        t2 = window.setTimeout(() => {
          cancel = animateScroll(el, axis, 52, 0, 700);
        }, 800);
      });
    }, 600);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); cancel?.(); };
  }, [vertical]);

  const handlePick = (id: string) => {
    setPicked(id);
    setTooltipId(null);
    window.setTimeout(() => onPick(id), 220);
  };

  /* "+" button — keep picker open, extend timer, open Settings → Tags */
  const handleManage = () => {
    setTooltipId(null);
    setExtended(true);
    onManageTags?.();
  };

  /* Tooltip helpers (horizontal only) */
  const handleEnter = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const picker = pickerRef.current;
    if (!picker) return;
    const pr = picker.getBoundingClientRect();
    const br = e.currentTarget.getBoundingClientRect();
    setTooltipX(br.left - pr.left + br.width / 2);
    setTooltipId(id);
  };
  const handleLeave = () => setTooltipId(null);

  const pickerStyle = computePickerStyle(endAngleDeg, vertical);

  /* ── DESKTOP: vertical list ─────────────────────────────────────────── */
  if (vertical) {
    return (
      <div
        ref={pickerRef}
        className="tag-picker tag-picker--vert"
        style={pickerStyle}
        role="group"
        aria-label="Tag this session"
      >
        <div ref={scrollRef} className="tag-picker__list">

          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tag-picker__row${picked === t.id ? ' is-picked' : ''}`}
              onClick={() => handlePick(t.id)}
              aria-label={t.label}
            >
              <span className="tag-picker__row-icon">
                <TagIcon def={t} size={14} />
              </span>
              <span className="tag-picker__row-label">{t.label}</span>
            </button>
          ))}

          {/* Horizontal divider before "+" row */}
          <span className="tag-picker__row-sep" aria-hidden />

          {/* Add custom tag row */}
          <button
            type="button"
            className="tag-picker__row tag-picker__row--add"
            onClick={handleManage}
            aria-label="Add custom tag"
          >
            <span className="tag-picker__row-icon tag-picker__row-icon--add">
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
            <span className="tag-picker__row-label tag-picker__row-label--add">
              Add custom tag
            </span>
          </button>

        </div>
      </div>
    );
  }

  /* ── MOBILE / FALLBACK: horizontal pill (unchanged) ─────────────────── */
  const hoveredTag = tooltipId
    ? (tags.find(t => t.id === tooltipId) ?? { id: '__manage', label: 'Add custom tag', path: '' })
    : null;

  return (
    <div
      ref={pickerRef}
      className="tag-picker"
      style={pickerStyle}
      role="group"
      aria-label="Tag this session"
    >
      <div ref={scrollRef} className="tag-picker__scroll">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tag-picker__btn${picked === t.id ? ' is-picked' : ''}`}
            onClick={() => handlePick(t.id)}
            aria-label={t.label}
            onMouseEnter={(e) => handleEnter(t.id, e)}
            onMouseLeave={handleLeave}
          >
            <TagIcon def={t} size={15} />
          </button>
        ))}

        <span className="tag-picker__divider" aria-hidden />

        <button
          type="button"
          className="tag-picker__manage"
          onClick={handleManage}
          aria-label="Add custom tag"
          onMouseEnter={(e) => handleEnter('__manage', e)}
          onMouseLeave={handleLeave}
        >
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {hoveredTag && (
        <div className="tag-picker__tooltip" style={{ left: tooltipX }} aria-hidden>
          {hoveredTag.label}
        </div>
      )}
    </div>
  );
}
