'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { notificationService } from '@/services/notification.service';
import type { Notification } from '@/types';

const TYPE_ICONS: Record<string, string> = {
  LIKE: '❤️',
  LOVE: '😍',
  COMMENT: '💬',
  FOLLOW: '👤',
  MENTION: '@',
  MARKETPLACE: '🛍️',
  SYSTEM: '🔔',
};

function NotifRow({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: number) => void;
}) {
  const icon = TYPE_ICONS[notif.type] ?? '🔔';

  return (
    <button
      onClick={() => { if (!notif.read) onRead(notif.id); }}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-elevated)] ${
        !notif.read ? 'bg-[var(--brand-muted)]/30' : ''
      }`}
    >
      <div className="relative shrink-0">
        <div className="size-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-lg">
          {icon}
        </div>
        {!notif.read && (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--brand)] ring-2 ring-[var(--bg-surface)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notif.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-medium'}`}>
          {notif.message}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="text-4xl mb-3 select-none">🔔</div>
      <p className="text-sm font-medium text-[var(--text-primary)]">Sin notificaciones</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">Cuando alguien interactúe contigo, aparecerá aquí.</p>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationService.getAll();
      setNotifs(data);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkAllRead() {
    await notificationService.markAllRead().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleRead(id: number) {
    await notificationService.markRead(id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  const unread   = notifs.filter((n) => !n.read);
  const newNotifs = notifs.filter((n) => !n.read);
  const oldNotifs = notifs.filter((n) => n.read);

  return (
    <div className="max-w-lg mx-auto py-4 px-3">
      {/* Card wrapper */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <h1 className="text-base font-bold text-[var(--text-primary)]">
            Notificaciones
            {unread.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center size-5 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold">
                {unread.length > 99 ? '99+' : unread.length}
              </span>
            )}
          </h1>
          {unread.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-[var(--brand)] font-medium hover:underline"
            >
              Todo leído
            </button>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                <div className="size-10 rounded-full bg-[var(--bg-elevated)] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3.5 rounded-full bg-[var(--bg-elevated)] ${i % 2 === 0 ? 'w-3/4' : 'w-full'}`} />
                  <div className="h-3 w-1/3 rounded-full bg-[var(--bg-elevated)]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
            <button onClick={load} className="mt-3 text-sm text-[var(--brand)] hover:underline">Reintentar</button>
          </div>
        ) : notifs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {newNotifs.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[var(--bg-elevated)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nuevas</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {newNotifs.map((n) => <NotifRow key={n.id} notif={n} onRead={handleRead} />)}
                </div>
              </>
            )}
            {oldNotifs.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[var(--bg-elevated)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Anteriores</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {oldNotifs.map((n) => <NotifRow key={n.id} notif={n} onRead={handleRead} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
