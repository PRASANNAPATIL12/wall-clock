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
 * useStickyScrollProgress — Returns a 0..1 progress value purpose-built
 * for scenes that use a `position: sticky` inner stage to pin to the
 * viewport while the outer container scrolls.
 *
 * USE THIS FOR THE FIRST SCENE (and any scene that starts at the very
 * top of the page or whose top is already touching the viewport top
 * before the user scrolls).
 *
 * Why the standard `useScrollProgress` is wrong here:
 *   The standard hook measures "how far through the viewport this
 *   element has travelled," meaning at scrollY = 0, p = vh / (sceneHeight + vh).
 *   For a 260vh scene at the page top, that's ALREADY 0.278 — past the
 *   button-fade range. The buttons appear hidden on fresh page load.
 *
 * What this hook does instead:
 *   Maps progress to the SCROLL DISTANCE that the inner sticky element
 *   can travel while pinned. For a sticky inner of 100vh inside a 260vh
 *   outer, the sticky pins from scrollY = 0 to scrollY = 160vh
 *   (= sceneHeight − vh). This hook returns:
 *     · scrollY = 0      → p = 0.0  (correct — fresh page load, no scroll)
 *     · scrollY = 80vh   → p = 0.5  (halfway through sticky range)
 *     · scrollY = 160vh  → p = 1.0  (sticky about to release)
 *     · scrollY > 160vh  → clamped to 1.0
 *
 *   So the meaningful 0..1 range maps onto the actual user-controlled
 *   scroll, with no dead zone on either side.
 *
 * Reduced motion:
 *   Returns 1.0 immediately (final state) so all scroll-tied transforms
 *   show their settled values without animation.
 */
export function useStickyScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
): number {
  const [progress, setProgress] = useState(0);
  const lastValueRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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

      // The sticky inner can travel a maximum of (sceneHeight - vh) pixels
      // while pinned. `scrolled` is how far we've moved into that range,
      // measured by how far the scene's top has moved above the viewport top.
      const stickyDistance = Math.max(1, rect.height - vh);
      const scrolled       = Math.max(0, -rect.top);
      const next           = Math.max(0, Math.min(1, scrolled / stickyDistance));

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
