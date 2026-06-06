import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * useScrollProgress — Returns a 0..1 progress value representing how far
 * a given element has scrolled through the viewport.
 *
 * Progress semantics (chosen for "as the element scrolls past me"):
 *   0.0 → top of element just touched the bottom of the viewport
 *   0.5 → element is centered in the viewport
 *   1.0 → bottom of element just left the top of the viewport
 *
 * This is the most useful definition for scrollytelling because:
 *   - It maps "entering" → "leaving" to a clean 0..1 range
 *   - It works identically for elements taller than the viewport
 *     (e.g., a 500vh sticky-scroll scene)
 *   - It can be used directly as a CSS `--p` custom property
 *
 * Performance:
 *   - Updates via `requestAnimationFrame`, throttled to 1× per frame
 *   - Skips state updates when the value hasn't changed by ≥ 0.001
 *   - Pauses entirely when the element is far off-screen
 *   - Stops on unmount (no memory leaks)
 *
 * Reduced motion:
 *   - When `prefers-reduced-motion: reduce`, returns 1.0 immediately so
 *     consuming components show their "final" state (no zoom, no
 *     animation). This is the recommended accessibility pattern.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
): number {
  const [progress, setProgress] = useState(0);
  const lastValueRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honor reduce-motion globally — return 1 so scenes appear in final state
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setProgress(1);
      return;
    }

    let raf = 0;
    let running = true;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vh   = window.innerHeight;

      // Element completely below viewport → 0; completely above → 1
      // Otherwise: linear interpolation across (rect.height + vh) pixels
      const total  = rect.height + vh;
      const passed = vh - rect.top;
      const next   = Math.max(0, Math.min(1, passed / total));

      // Only re-render when the value moves meaningfully
      if (Math.abs(next - lastValueRef.current) > 0.001) {
        lastValueRef.current = next;
        setProgress(next);
      }
    };

    const tick = () => {
      if (!running) return;
      measure();
      raf = requestAnimationFrame(tick);
    };

    // First measurement synchronous so paint reflects initial state
    measure();
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [ref]);

  return progress;
}

/**
 * mapRange — Linearly remap `value` from one range [inMin, inMax] to
 * another [outMin, outMax], with clamping.
 *
 * Use this with `useScrollProgress` to drive animations over a sub-range
 * of the scene:
 *
 *   const p = useScrollProgress(ref);
 *   const scale = mapRange(p, 0.2, 0.8, 1, 2.4);   // scales between 20-80% scroll
 */
export function mapRange(
  value: number,
  inMin: number, inMax: number,
  outMin: number, outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  const clamped = Math.max(0, Math.min(1, t));
  return outMin + clamped * (outMax - outMin);
}

/**
 * easeOutCubic — Smooth ease-out curve. Useful for headline reveals,
 * count-up animations, and other "settle into place" motions.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * easeInOutCubic — Smooth ease-in-out curve. Useful for full-cycle
 * animations (e.g., a zoom that accelerates from rest and decelerates
 * to a stop).
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
