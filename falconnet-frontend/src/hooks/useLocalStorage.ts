'use client';

import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored != null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // quota exceeded / private mode
        }
        return resolved;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    localStorage.removeItem(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, set, remove] as const;
}
