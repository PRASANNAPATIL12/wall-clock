import { useCallback, useEffect, useRef } from 'react';
import { tick as hapticTick } from '../lib/haptic';
import './ScrollPicker.css';

export interface PickerItem {
  value: string;
  label: string;
}

interface Props {
  items: PickerItem[];
  selected: string;
  onChange: (value: string) => void;
  label?: string;
  /** Repeat items list 3× for pseudo-infinite looping. */
  loop?: boolean;
}

const ITEM_H  = 44; // px per item
const VISIBLE = 5;  // visible item slots
const CONTAINER_H = ITEM_H * VISIBLE; // 220px

/**
 * iOS-style scroll-wheel picker.
 *
 * Uses CSS scroll-snap to anchor items to the center slot.
 * When the centered item changes, the haptic `tick()` fires — the same
 * audio/vibration feedback as dragging the focus-ring end-point.
 *
 * For loop=true: the items array is repeated 3× and the picker starts
 * scrolled to the middle third, making it feel infinite.
 */
export function ScrollPicker({ items, selected, onChange, label, loop = false }: Props) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const prevIdx    = useRef(-1);
  const isSeeking  = useRef(false); // true during programmatic scroll

  // In loop mode, 3 copies; otherwise 1
  const display    = loop ? [...items, ...items, ...items] : items;
  const N          = items.length;

  /** Compute which item is currently centered. */
  const centerIdx  = useCallback((scrollTop: number) => {
    const raw = Math.round(scrollTop / ITEM_H);
    return loop ? ((raw % N) + N) % N : Math.max(0, Math.min(N - 1, raw));
  }, [loop, N]);

  /** Scroll to a specific item index (within the real items array). */
  const scrollToIdx = useCallback((idx: number, smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    isSeeking.current = true;
    const offset = loop ? N + idx : idx; // start in middle third if loop
    el.scrollTo({ top: offset * ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
    // Brief delay so we don't fire tick() on programmatic scroll
    window.setTimeout(() => { isSeeking.current = false; }, 300);
  }, [loop, N]);

  // Mount: jump to selected item without animation
  useEffect(() => {
    const idx = items.findIndex(i => i.value === selected);
    if (idx >= 0) {
      prevIdx.current = idx;
      scrollToIdx(idx, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);                // run once on mount

  // When selected prop changes externally, jump scroll position
  useEffect(() => {
    const idx = items.findIndex(i => i.value === selected);
    if (idx >= 0 && idx !== prevIdx.current) {
      scrollToIdx(idx, true);
    }
  }, [selected, items, scrollToIdx]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isSeeking.current) return;

    const st  = el.scrollTop;
    const idx = centerIdx(st);

    if (idx !== prevIdx.current) {
      prevIdx.current = idx;
      hapticTick();
      onChange(items[idx]!.value);
    }

    // Loop seam: when scroll reaches the outer thirds, jump silently to middle
    if (loop) {
      const mid   = N * ITEM_H;           // start of middle copy
      const top2  = N * ITEM_H * 2;       // start of last copy
      if (st < N * ITEM_H * 0.6) {
        isSeeking.current = true;
        el.scrollTop = st + mid;
        isSeeking.current = false;
      } else if (st >= top2 - N * ITEM_H * 0.4) {
        isSeeking.current = true;
        el.scrollTop = st - mid;
        isSeeking.current = false;
      }
    }
  }, [centerIdx, items, loop, N, onChange]);

  return (
    <div className="scroll-picker" aria-label={label}>
      {label && <div className="scroll-picker__label">{label}</div>}

      {/* The scrollable drum */}
      <div
        className="scroll-picker__drum"
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ height: CONTAINER_H }}
      >
        {/* Top spacer — 2 slots so first item can center */}
        <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2), flexShrink: 0 }} />

        {display.map((item, i) => {
          const realIdx = loop ? i % N : i;
          const isActive = items[realIdx]?.value === selected;
          return (
            <div
              key={`${item.value}-${i}`}
              className={`scroll-picker__item${isActive ? ' is-active' : ''}`}
              style={{ height: ITEM_H }}
              onClick={() => {
                onChange(items[realIdx]!.value);
                scrollToIdx(realIdx, true);
              }}
            >
              {item.label}
            </div>
          );
        })}

        {/* Bottom spacer */}
        <div style={{ height: ITEM_H * Math.floor(VISIBLE / 2), flexShrink: 0 }} />
      </div>

      {/* Selection highlight behind the center slot */}
      <div className="scroll-picker__selection" style={{ height: ITEM_H }} aria-hidden />
    </div>
  );
}
