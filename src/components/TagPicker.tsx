import { useEffect, useRef, useState } from 'react';
import { getAllTags, TAGS_CHANGED_EVENT } from '../lib/tags';
import { TagIcon } from './TagIcon';
import './TagPicker.css';

interface Props {
  endAngleDeg?: number;
  onPick: (tag: string | null) => void;
  onManageTags?: () => void;
}

function computePickerStyle(endAngleDeg: number | undefined): React.CSSProperties {
  if (typeof window === 'undefined') {
    return { bottom: 24, left: '50%', transform: 'translateX(-50%)' };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobilePortrait = vw <= 640 && vh > vw;

  if (isMobilePortrait || endAngleDeg === undefined) {
    // Sits in the gap between clock face and TodaySummary:
    //   TodaySummary: bottom=130px, height=28px → top edge at 158px from screen bottom
    //   TagPicker (46px tall) at bottom=170: top edge at 216px, leaves 12px clearance above summary
    //   Clock bottom is ~275px from screen bottom (on a typical 375×812 phone) → 59px gap below clock ✓
    return { bottom: 170, left: '50%', transform: 'translateX(-50%)' };
  }

  const cx = vw / 2;
  const cy = vh / 2;
  const dim = Math.min(vw, vh);
  const clockR = dim * 0.46;
  const PADDING = dim * 0.07;
  const rad = ((endAngleDeg - 90) * Math.PI) / 180;
  const dist = clockR + PADDING;
  const px = cx + Math.cos(rad) * dist;
  const py = cy + Math.sin(rad) * dist;
  const PW = 320;
  const PH = 46;
  const MARGIN = 14;
  const left = Math.max(MARGIN, Math.min(vw - PW - MARGIN, px - PW / 2));
  const top  = Math.max(MARGIN, Math.min(vh - PH - MARGIN, py - PH / 2));
  return { left, top };
}

/**
 * Smoothly animates scrollLeft of an element from `from` to `to` over
 * `duration` ms using a custom easing curve — much more controlled than
 * the browser's `behavior: 'smooth'` which has unpredictable velocity.
 *
 * Uses easeInOutCubic: starts slow, accelerates through middle, slows to stop.
 * This mimics natural hand-flick gesture deceleration.
 */
function animateScroll(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number,
  onDone?: () => void,
): () => void {
  let raf = 0;
  const start = performance.now();

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now: number) => {
    const raw = Math.min((now - start) / duration, 1);
    el.scrollLeft = from + (to - from) * easeInOutCubic(raw);
    if (raw < 1) {
      raf = requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  };

  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function TagPicker({ endAngleDeg, onPick, onManageTags }: Props) {
  const [picked, setPicked]   = useState<string | null>(null);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [tooltipX, setTooltipX]   = useState(0);
  /**
   * Reactive tag list — refreshed whenever saveCustomTag / deleteCustomTag
   * dispatches the TAGS_CHANGED_EVENT. This means a new custom tag added
   * in Settings → Tags appears in the picker immediately without needing
   * to close and reopen the picker.
   */
  const [tags, setTags] = useState(() => getAllTags());
  /**
   * When the user taps "+" (manage/add tags), we keep the picker alive
   * instead of auto-dismissing after 4 s — they need to return here
   * after adding their tag so they can pick it.
   * extended=true → use a long 60 s fallback timeout instead of 4 s.
   */
  const [extended, setExtended] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refresh tag list when custom tags change (via Settings → Tags add/delete).
  useEffect(() => {
    const refresh = () => setTags(getAllTags());
    window.addEventListener(TAGS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(TAGS_CHANGED_EVENT, refresh);
  }, []);

  // Auto-dismiss:
  //   · Normal: 4 s after mount (gives time to browse + pick)
  //   · Extended: 60 s (user went to Settings to add a tag; will return)
  useEffect(() => {
    if (picked !== null) return;
    const timeout = extended ? 60_000 : 4_000;
    const t = window.setTimeout(() => onPick(null), timeout);
    return () => window.clearTimeout(t);
  }, [picked, onPick, extended]);

  /**
   * Scroll-hint sequence:
   *   600 ms  → wait (picker just appeared, let user settle)
   *   900 ms  → gently scroll right 48 px (easeInOutCubic — starts and ends slow)
   *   800 ms  → hold at 48 px so the eye catches the peek
   *   700 ms  → scroll back to 0 (easeInOutCubic — smooth return)
   *
   * Total visible motion: ~2.4 s from mount. Unhurried and legible.
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let cancel: (() => void) | null = null;
    let t1 = 0, t2 = 0, t3 = 0;

    t1 = window.setTimeout(() => {
      cancel = animateScroll(el, 0, 48, 900, () => {
        t2 = window.setTimeout(() => {
          cancel = animateScroll(el, 48, 0, 700);
        }, 800);
      });
    }, 600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      cancel?.();
    };
  }, []);

  const handlePick = (id: string) => {
    setPicked(id);
    setTooltipId(null);
    window.setTimeout(() => onPick(id), 220);
  };

  /**
   * "+" button — open Settings → Tags with the add form pre-focused.
   *
   * Deliberately does NOT call onPick(null) here — the picker stays
   * visible so the user can return and pick their newly created tag.
   * The auto-dismiss timer is extended to 60 s so it won't fire while
   * they're in Settings.
   */
  const handleManage = () => {
    setTooltipId(null);
    setExtended(true);           // pause the 4 s auto-dismiss
    onManageTags?.();            // open Settings → Tags (no picker close)
  };

  /**
   * Compute tooltip x as the button's center relative to the outer .tag-picker
   * container. This uses position:absolute (not fixed) so it's never affected
   * by the parent's backdrop-filter or animation containing block.
   */
  const handleEnter = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const picker = pickerRef.current;
    if (!picker) return;
    const pickerRect = picker.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();
    const x = btnRect.left - pickerRect.left + btnRect.width / 2;
    setTooltipX(x);
    setTooltipId(id);
  };
  const handleLeave = () => setTooltipId(null);

  const pickerStyle = computePickerStyle(endAngleDeg);
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
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Tooltip — position:absolute so backdrop-filter on parent doesn't misplace it */}
      {hoveredTag && (
        <div
          className="tag-picker__tooltip"
          style={{ left: tooltipX }}
          aria-hidden
        >
          {hoveredTag.label}
        </div>
      )}
    </div>
  );
}
