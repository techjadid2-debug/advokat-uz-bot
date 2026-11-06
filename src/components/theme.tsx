'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'auto' | 'black' | 'graphite' | 'midnight' | 'nord' | 'dim' | 'white' | 'soft' | 'sepia';
export type Accent = 'green' | 'blue' | 'indigo' | 'purple' | 'orange' | 'mono';

const THEME_KEY = 'advokat-theme';
const ACCENT_KEY = 'advokat-accent';
const EVENT = 'advokat-theme-change';

/** Qaysi mavzu yorug', qaysi qorong'i — urg'u va holat ranglari shunga qarab tanlanadi. */
export const LIGHT_THEMES = ['white', 'soft', 'sepia'] as const;

export const THEME_ORDER: Exclude<Theme, 'auto'>[] = [
  'black', 'graphite', 'dim', 'midnight', 'nord', 'white', 'soft', 'sepia',
];
export const ACCENT_ORDER: Accent[] = ['green', 'blue', 'indigo', 'purple', 'orange', 'mono'];

/** Namuna doiralari — mavzu matn bilan emas, rang bilan tanlanadi. */
export const THEME_SWATCH: Record<Exclude<Theme, 'auto'>, { bg: string; line: string }> = {
  black:    { bg: '#000000', line: '#2a2a2c' },
  graphite: { bg: '#1c1c1e', line: '#333335' },
  dim:      { bg: '#24262e', line: '#32343d' },
  midnight: { bg: '#1a2436', line: '#26334a' },
  nord:     { bg: '#3b4252', line: '#4c566a' },
  white:    { bg: '#ffffff', line: '#e3e3e6' },
  soft:     { bg: '#f2f2f7', line: '#d8d8de' },
  sepia:    { bg: '#f4ecd8', line: '#ddd0b0' },
};

export const ACCENT_SWATCH: Record<Accent, string> = {
  green: '#30d158', blue: '#0a84ff', indigo: '#5e5ce6',
  purple: '#bf5af2', orange: '#ff9f0a', mono: '#8e8e93',
};

const store = {
  subscribe(cb: () => void) {
    window.addEventListener(EVENT, cb);
    window.addEventListener('storage', cb);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      if (read(THEME_KEY, 'auto') === 'auto') apply();
      cb();
    };
    mq.addEventListener('change', onSystem);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener('storage', cb);
      mq.removeEventListener('change', onSystem);
    };
  },
  getTheme: () => read(THEME_KEY, 'auto') as Theme,
  getAccent: () => read(ACCENT_KEY, 'green') as Accent,
  serverTheme: () => 'auto' as Theme,
  serverAccent: () => 'green' as Accent,
};

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Mavzuni, urg'uni va sxemani bir vaqtda qo'yadi. */
export function apply() {
  const theme = read(THEME_KEY, 'auto') as Theme;
  const accent = read(ACCENT_KEY, 'green');
  const resolved =
    theme === 'auto'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'graphite'
        : 'soft'
      : theme;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.accent = accent;
  root.dataset.scheme = (LIGHT_THEMES as readonly string[]).includes(resolved) ? 'light' : 'dark';
}

export function useTheme() {
  const theme = useSyncExternalStore(store.subscribe, store.getTheme, store.serverTheme);
  const accent = useSyncExternalStore(store.subscribe, store.getAccent, store.serverAccent);

  const write = (key: string, value: string, isDefault: boolean) => {
    if (isDefault) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    apply();
    window.dispatchEvent(new Event(EVENT));
  };

  return {
    theme,
    accent,
    setTheme: (next: Theme) => write(THEME_KEY, next, next === 'auto'),
    setAccent: (next: Accent) => write(ACCENT_KEY, next, next === 'green'),
  };
}
