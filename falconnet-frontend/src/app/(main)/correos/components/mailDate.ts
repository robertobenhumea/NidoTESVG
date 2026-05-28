/**
 * Safari-safe date utilities for the mail module.
 *
 * Root cause: Spring Boot serializes LocalDateTime as "2026-05-27T18:35:22"
 * (no timezone suffix). Chrome/Firefox accept this; Safari rejects it.
 * These helpers normalise the raw value before constructing a Date object.
 */

export function parseMailDate(raw: unknown): Date | null {
  if (raw == null) return null;

  // Array format [year, month, day, h, m, s] — Jackson without JavaTimeModule
  if (Array.isArray(raw)) {
    const [y, mo, d, h = 0, m = 0, s = 0] = raw as number[];
    const dt = new Date(y, mo - 1, d, h, m, s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  if (typeof raw !== 'string' || !raw.trim()) return null;
  const str = raw.trim();

  // Already has explicit timezone — parse normally
  if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Safari-safe manual parse: "2026-05-27T18:35:22" or "2026-05-27 18:35:22"
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const [, yr, mo, dy, hr, mn, sc] = m.map(Number);
    const dt = new Date(yr, mo - 1, dy, hr, mn, sc);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Last-resort fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * For the mail list column (compact):
 * - Today     → "18:35"
 * - Yesterday → "Ayer"
 * - This week → "lun" / "mar" / …
 * - Older     → "27 may" (same year) or "27/05/26" (past year)
 */
export function mailTimeAgo(raw: unknown): string {
  const date = parseMailDate(raw);
  if (!date) return '—';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return date.toLocaleDateString('es-MX', { weekday: 'short' });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * For the mail detail header (full):
 * "martes, 27 de mayo de 2026, 18:35"
 */
export function mailFullDate(raw: unknown): string {
  const date = parseMailDate(raw);
  if (!date) return '—';
  return date.toLocaleString('es-MX', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  });
}

/**
 * For thread/conversation messages (compact):
 * - Today → "18:35"
 * - Other → "27 may" or "27 may 2025"
 */
export function mailThreadTime(raw: unknown): string {
  const date = parseMailDate(raw);
  if (!date) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
