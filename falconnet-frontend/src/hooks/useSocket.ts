'use client';

import { useCallback } from 'react';
import { socket } from '@/lib/socket';

type EventHandler = (data: unknown) => void;

/**
 * Hook for future realtime events.
 * Phase 3: call socket.connect(token) here when auth is ready.
 */
export function useSocket() {
  const on = useCallback((event: string, handler: EventHandler) => {
    return socket.on(event, handler);
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    socket.emit(event, data);
  }, []);

  return { on, emit, socket };
}
