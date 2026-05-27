import { useEffect, useState } from 'react';

export function usePersistedState<T extends string>(
  key: string,
  initial: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = window.localStorage.getItem(key);
      return (stored as T) ?? initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* private mode, quota, etc — silently ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
