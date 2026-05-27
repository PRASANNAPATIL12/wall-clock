import { useEffect, useRef, useState } from 'react';

/**
 * High-resolution clock tick. Drives analog hands at refresh rate (RAF)
 * and digital readouts at ~10 Hz to keep React renders cheap.
 *
 * `precision: 'frame'` — re-renders every animation frame (use for analog).
 * `precision: 'second'` — re-renders only when the displayed second changes
 *                         (use for digital).
 */
export function useNow(precision: 'frame' | 'second' = 'second'): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  const lastSecond = useRef<number>(-1);

  useEffect(() => {
    let raf = 0;
    let stopped = false;

    const tick = () => {
      const d = new Date();
      if (precision === 'frame') {
        setNow(d);
      } else {
        const s = d.getTime() / 1000;
        const whole = Math.floor(s);
        if (whole !== lastSecond.current) {
          lastSecond.current = whole;
          setNow(d);
        }
      }
      if (!stopped) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [precision]);

  return now;
}
