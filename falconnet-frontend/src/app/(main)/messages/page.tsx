'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { chatService } from '@/services/chat.service';
import type { Conversation } from '@/types';

function ConversationRow({ conv }: { conv: Conversation }) {
  return (
    <Link
      href={`/messages/${conv.partnerId}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
    >
      <div className="relative shrink-0">
        <Avatar src={conv.partnerAvatar} name={conv.partnerName} size="lg" />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[var(--brand)] ring-2 ring-[var(--bg-surface)] flex items-center justify-center text-[10px] font-bold text-white">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
            {conv.partnerName}
          </p>
          {conv.updatedAt && (
            <span className="text-xs text-[var(--text-muted)] shrink-0">{timeAgo(conv.updatedAt)}</span>
          )}
        </div>
        {conv.lastMessage && (
          <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {conv.lastMessage}
          </p>
        )}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="text-4xl mb-3 select-none">💬</div>
      <p className="text-sm font-medium text-[var(--text-primary)]">Sin conversaciones</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">Empieza a chatear visitando el perfil de alguien.</p>
    </div>
  );
}

export default function MessagesPage() {
  const [convs, setConvs]     = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [query, setQuery]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chatService.getConversations();
      setConvs(data);
    } catch {
      setError('No se pudieron cargar los mensajes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query.trim()
    ? convs.filter((c) => c.partnerName.toLowerCase().includes(query.toLowerCase()))
    : convs;

  return (
    <div className="max-w-lg mx-auto">
      {/* Search */}
      <div className="sticky top-[var(--nav-h)] bg-[var(--bg-base)] px-4 py-3 border-b border-[var(--border)] z-10">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversaciones…"
            className="w-full h-9 pl-9 pr-4 rounded-xl text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="size-12 rounded-full bg-[var(--bg-elevated)] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 rounded-full bg-[var(--bg-elevated)]" />
                <div className="h-3 w-44 rounded-full bg-[var(--bg-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-[var(--brand)] hover:underline">Reintentar</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((c) => <ConversationRow key={c.partnerId} conv={c} />)}
        </div>
      )}
    </div>
  );
}
