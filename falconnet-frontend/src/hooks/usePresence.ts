'use client';

import { useState, useEffect } from 'react';
import { isEnabled } from '@/lib/config';
import { realtime } from '@/lib/realtime';

/**
 * Track online presence for a set of user IDs.
 * Returns a Set of online user IDs.
 * Phase 3: becomes fully functional when realtime feature flag is enabled.
 */
export function usePresence(userIds: number[]): Set<number> {
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isEnabled('realtime') || userIds.length === 0) return;

    const unsub = realtime.onPresence(({ userId, online }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (online) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    return unsub;
  }, [userIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return onlineIds;
}
