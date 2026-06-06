import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * useLenis — initialise Lenis smooth-scroll for the cinematic landing.
 *
 * WHY LENIS?
 *   Native browser scroll on Windows + most laptop trackpads is jittery,
 *   especially when scroll-driven animations (zoom transforms, parallax)
 *   are running. Lenis intercepts the scroll wheel, applies momentum +
 *   easing in JavaScript, and writes a smooth CSS transform.
 *
 *   The result: silky 60fps scroll that makes the scene-to-scene flow
 *   feel like a film camera move, not a stuttering browser scroll.
 *
 * BUNDLE COST: 4.2 KB gzipped. Worth every byte for this feature.
 *
 * BEHAVIOUR:
 *   - Honors prefers-reduced-motion (disables smooth-scroll → native scroll)
 *   - Disables itself on mobile portrait (touch scroll is already smooth
 *     on iOS/Android, and Lenis can fight with iOS rubber-band)
 *   - Cleans up the rAF loop and instance on unmount
 *   - Re-syncs IntersectionObservers automatically because Lenis writes
 *     real scrollTop, not a CSS transform — getBoundingClientRect stays accurate
 */
export function useLenis() {
  useEffect(() => {
    // Respect reduce-motion + skip on mobile/coarse pointers
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch      = window.matchMedia('(pointer: coarse)').matches;
    if (reduceMotion || isTouch) return;

    const lenis = new Lenis({
      // Duration of the easing curve when wheel events arrive.
      // Lower = snappier, higher = more cinematic glide. 1.1 feels filmic.
      duration: 1.1,
      // Cubic-bezier-style ease — outQuint approximation
      easing:   (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Smooth touch is OFF — touch devices have native physics already
      // syncTouch:     false,  // (default)
      // wheelMultiplier — how much each wheel-tick moves the viewport
      wheelMultiplier: 1.0,
    });

    let raf = 0;
    function frame(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Allow CSS to know we're in smooth-scroll mode
    document.documentElement.classList.add('lenis-active');

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      document.documentElement.classList.remove('lenis-active');
    };
  }, []);
}
