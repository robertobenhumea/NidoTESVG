'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '@/lib/utils';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyClass(dark: boolean, animate = true): void {
  const html = document.documentElement;
  if (animate) {
    html.classList.add('theme-transitioning');
    setTimeout(() => html.classList.remove('theme-transitioning'), 250);
  }
  html.classList.toggle('dark', dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in layout.tsx has already applied the class before hydration.
  // Here we just sync state with what's on the DOM.
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
    const resolved = saved ?? 'system';
    setThemeState(resolved);
    setIsDark(document.documentElement.classList.contains('dark'));

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const current = (localStorage.getItem(STORAGE_KEYS.THEME) ?? 'system') as Theme;
      if (current === 'system') {
        setIsDark(e.matches);
        applyClass(e.matches);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    const dark = resolveIsDark(newTheme);
    setIsDark(dark);
    applyClass(dark);
  }, []);

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeStore(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeStore must be used inside ThemeProvider');
  return ctx;
}
