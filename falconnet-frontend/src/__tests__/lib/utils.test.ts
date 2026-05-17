import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  timeAgo,
  truncate,
  formatPrice,
  getInitials,
  clamp,
  debounce,
} from '@/lib/utils';

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('truncate', () => {
  it('returns the string unchanged when within limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates and appends ellipsis', () => {
    const result = truncate('Hello world', 5);
    expect(result).toContain('…');
    expect(result.length).toBeLessThanOrEqual(6);
  });
});

describe('formatPrice', () => {
  it('formats a number as MXN currency', () => {
    const result = formatPrice(1500);
    expect(result).toContain('1');
    expect(result).toContain('500');
  });
});

describe('getInitials', () => {
  it('returns two-letter initials for two-word names', () => {
    expect(getInitials('Juan Pérez')).toBe('JP');
  });

  it('returns single initial for single-word name', () => {
    expect(getInitials('Miguel')).toBe('M');
  });

  it('caps at two characters', () => {
    expect(getInitials('Ana María García').length).toBe(2);
  });
});

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('timeAgo', () => {
  it('returns "ahora" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('ahora');
  });

  it('returns minutes for timestamps within the last hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toMatch(/hace \d+m/);
  });

  it('returns hours for timestamps within the last day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toMatch(/hace \d+h/);
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delays function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('cancels previous call when called again before delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });
});
