'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/services/chat.service';
import { notificationService } from '@/services/notification.service';
import { useAuth } from '@/hooks/useAuth';

const POLL_INTERVAL_MS = 30_000;

export interface UnreadCounts {
  messages:      number;
  notifications: number;
}

export function useUnreadCounts(): UnreadCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const [messages, notifications] = await Promise.all([
        chatService.getUnreadCount(),
        notificationService.getUnreadCount(),
      ]);
      setCounts({ messages, notifications });
    } catch {
      // silent — keep stale values
    }
  }, [user]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  return counts;
}
