import { useEffect, useRef, useState } from 'react';

/**
 * Returns true when no user input has occurred for `delayMs`.
 * Listens for mousemove, mousedown, keydown, touchstart, wheel.
 */
export function useIdle(delayMs = 5000): boolean {
  const [idle, setIdle] = useState(false);
  const idleRef = useRef(idle);
  idleRef.current = idle;

  useEffect(() => {
    let timer: number | undefined;

    const goActive = () => {
      if (idleRef.current) setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), delayMs);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'wheel',
    ];

    events.forEach((e) => window.addEventListener(e, goActive, { passive: true }));
    goActive(); // start the initial idle timer

    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, goActive));
    };
  }, [delayMs]);

  useEffect(() => {
    document.body.classList.toggle('idle', idle);
  }, [idle]);

  return idle;
}
