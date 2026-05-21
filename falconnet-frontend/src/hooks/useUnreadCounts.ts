'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { chatService } from '@/services/chat.service';
import { notificationService } from '@/services/notification.service';
import { useAuth } from '@/hooks/useAuth';

const POLL_INTERVAL_MS = 30_000;

export interface UnreadCounts {
  messages:      number;
  mail:          number;
  notifications: number;
}

export function useUnreadCounts(): UnreadCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, mail: 0, notifications: 0 });

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const [messages, mail, notifications] = await Promise.all([
        chatService.getUnreadCount(),
        api.get<{ count: number }>('/correos/no-leidos').then(r => r.count),
        notificationService.getUnreadCount(),
      ]);
      setCounts({ messages, mail, notifications });
    } catch {
      // silent — keep stale values
    }
  }, [user]);

  useEffect(() => {
    const initial = window.setTimeout(() => { void fetch(); }, 0);
    const id = setInterval(fetch, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      clearInterval(id);
    };
  }, [fetch]);

  return counts;
}
