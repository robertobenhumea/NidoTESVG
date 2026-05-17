'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce a value — the returned value only updates after `delay` ms
 * of no changes. Useful for search inputs to avoid excessive API calls.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
