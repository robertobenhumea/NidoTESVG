'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FetchError } from '@/services/api';
import { useToast } from './useToast';

interface UseApiOptions<T> {
  /** Run fetcher immediately on mount */
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: FetchError) => void;
  /** Show automatic error toast on failure */
  showErrorToast?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: FetchError | null;
  execute: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {},
): UseApiResult<T> {
  const { immediate = false, onSuccess, onError, showErrorToast = false } = options;
  const { error: toastError } = useToast();

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<FetchError | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const execute = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      const fe = err instanceof FetchError ? err : new FetchError(0, String(err));
      setError(fe);
      onError?.(fe);
      if (showErrorToast) toastError(fe.message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher]);

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, error, execute, setData };
}
