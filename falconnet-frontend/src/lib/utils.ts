/** Merge class names — filters falsy values and joins with a space. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Relative time string in Spanish ("hace 3m", "hace 2h", etc.) */
export function timeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60)     return 'ahora';
  if (diffSec < 3600)   return `hace ${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400)  return `hace ${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `hace ${Math.floor(diffSec / 86400)}d`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
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

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    ?? localStorage.getItem('token')
    ?? localStorage.getItem('falconnet_token');
  if (token && !localStorage.getItem(STORAGE_KEYS.TOKEN)) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }
  return token;
}

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  if (typeof window === 'undefined') return configured;

  try {
    const url = new URL(configured);
    const isLocalApiHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isRemoteFrontend = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isLocalApiHost && isRemoteFrontend) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return configured;
  }

  return configured;
}

export function getWsBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL
    ?? `${getApiBaseUrl().replace(/^http/, 'ws')}/ws`;
  if (typeof window === 'undefined') return configured.replace(/\/$/, '');

  try {
    const url = new URL(configured);
    const isLocalWsHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isRemoteFrontend = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isLocalWsHost && isRemoteFrontend) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return configured.replace(/\/$/, '');
  }

  return configured.replace(/\/$/, '');
}

export function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    if (typeof window === 'undefined') return path;
    try {
      const url = new URL(path);
      const isLocalFileHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isRemoteFrontend = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isLocalFileHost && isRemoteFrontend) {
        const apiUrl = new URL(getApiBaseUrl());
        url.protocol = apiUrl.protocol;
        url.hostname = apiUrl.hostname;
        url.port = apiUrl.port;
        return url.toString();
      }
    } catch {
      return path;
    }
    return path;
  }
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Cache aviso image URLs in localStorage so images survive page refreshes.
 *  The backend Aviso entity likely has no imagenUrl field; we persist the
 *  uploaded URL client-side as a fallback.                                  */
const AVISO_IMG_CACHE_KEY = 'fn_aviso_imgs';

export function cacheAvisoImage(avisoId: number, url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const store: Record<string, string> = JSON.parse(
      localStorage.getItem(AVISO_IMG_CACHE_KEY) ?? '{}'
    );
    store[avisoId] = url;
    // Keep cache bounded (last 100 entries)
    const keys = Object.keys(store);
    if (keys.length > 100) delete store[keys[0]];
    localStorage.setItem(AVISO_IMG_CACHE_KEY, JSON.stringify(store));
  } catch { /* non-critical */ }
}

export function getAvisoImageCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(AVISO_IMG_CACHE_KEY) ?? '{}');
  } catch { return {}; }
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
