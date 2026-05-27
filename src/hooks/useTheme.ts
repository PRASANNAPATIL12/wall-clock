import { useEffect } from 'react';
import { usePersistedState } from './usePersistedState';

export type Theme = 'light' | 'dark';

function resolveInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('wall.theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): [Theme, (t: Theme) => void, () => void] {
  const [theme, setTheme] = usePersistedState<Theme>('wall.theme', resolveInitial());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');
  return [theme, setTheme, toggle];
}
