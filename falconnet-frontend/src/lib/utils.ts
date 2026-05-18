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

export function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
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
