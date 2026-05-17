/** Merge class names — filters falsy values and joins with a space. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Relative time string in Spanish ("hace 3m", "hace 2h", etc.) */
export function timeAgo(isoDate: string): string {
  const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diffSec < 60)     return 'ahora';
  if (diffSec < 3600)   return `hace ${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400)  return `hace ${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `hace ${Math.floor(diffSec / 86400)}d`;
  return new Date(isoDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/** Truncate a string, appending "…" if cut. */
export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '…';
}

/** Format a number as MXN currency. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Get 1–2 initials from a display name. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** localStorage key constants — single source of truth. */
export const STORAGE_KEYS = {
  TOKEN: 'fn_token',
  USER:  'fn_user',
  THEME: 'fn_theme',
} as const;

/**
 * Toggle the `.dark` class on `<html>` without touching localStorage.
 * Optionally wraps the change in a smooth transition.
 */
export function applyDarkClass(dark: boolean, animate = true): void {
  const html = document.documentElement;
  if (animate) {
    html.classList.add('theme-transitioning');
    setTimeout(() => html.classList.remove('theme-transitioning'), 250);
  }
  html.classList.toggle('dark', dark);
}

/**
 * Apply theme and persist choice as 'dark' or 'light' in localStorage.
 * Use `applyDarkClass` when the ThemeProvider is managing persistence.
 */
export function applyTheme(dark: boolean): void {
  applyDarkClass(dark);
  localStorage.setItem(STORAGE_KEYS.THEME, dark ? 'dark' : 'light');
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Debounce a function by `wait` ms. */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
