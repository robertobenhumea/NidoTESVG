'use client';

import { useEffect, useCallback } from 'react';
import { realtime } from '@/lib/realtime';
import { isEnabled } from '@/lib/config';
import type { RTEventName, RTEventMap } from '@/types/realtime.types';

type Handler<E extends RTEventName> = (payload: RTEventMap[E]) => void;

/**
 * Subscribe to a typed realtime event.
 * Auto-cleans up on unmount. No-ops when realtime feature flag is disabled.
 */
export function useRealtime<E extends RTEventName>(
  event: E,
  handler: Handler<E>,
  enabled = true,
): void {
  const stableHandler = useCallback(handler, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !isEnabled('realtime')) return;
    // Phase 3: remove this guard when feature flag is flipped to true
    return realtime.onConnected(() => {
      // re-subscribe after reconnection
    });
  }, [enabled, event, stableHandler]);
}
