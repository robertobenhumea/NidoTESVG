'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { chatService } from '@/services/chat.service';
import { userService } from '@/services/user.service';
import { useAuth } from '@/hooks/useAuth';
import type { Message, User } from '@/types';

const POLL_INTERVAL_MS = 5_000;

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-[var(--brand)] text-white rounded-br-md'
            : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md'
        }`}
      >
        <p className="break-words">{msg.content}</p>
        <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
          {timeAgo(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function MessageThreadPage() {
  const { userId }        = useParams<{ userId: string }>();
  const router            = useRouter();
  const { user }          = useAuth();
  const partnerId         = Number(userId);

  const [partner, setPartner]   = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [msgs, partnerUser] = await Promise.all([
        chatService.getMessages(partnerId),
        userService.getUser(partnerId),
      ]);
      setMessages(msgs);
      setPartner(partnerUser);
    } catch {
      router.replace('/messages');
    } finally {
      setLoading(false);
    }
  }, [partnerId, router]);

  useEffect(() => { load(); }, [load]);

  // Poll for new messages every POLL_INTERVAL_MS when tab is visible
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function pollMessages() {
      if (document.visibilityState !== 'visible') return;
      try {
        const msgs = await chatService.getMessages(partnerId);
        setMessages((prev) => {
          if (msgs.length !== prev.length) return msgs;
          const lastPrev = prev[prev.length - 1];
          const lastNew  = msgs[msgs.length - 1];
          if (!lastPrev || !lastNew) return msgs;
          return lastPrev.id !== lastNew.id ? msgs : prev;
        });
      } catch {
        // silent — keep existing messages
      }
    }

    const start = () => { interval = setInterval(pollMessages, POLL_INTERVAL_MS); };
    const stop  = () => { if (interval) clearInterval(interval); interval = null; };

    start();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' ? start() : stop());

    return () => { stop(); };
  }, [partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await chatService.send(partnerId, text);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const partnerName = partner ? (partner.displayName ?? partner.username) : '…';

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100dvh-var(--nav-h))]">
      {/* Header */}
      <div className="sticky top-[var(--nav-h)] bg-[var(--bg-base)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.back()} aria-label="Volver" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Link href={`/profile?id=${partnerId}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar src={partner?.avatarUrl} name={partnerName} size="sm" />
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{partnerName}</p>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="size-6 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3 select-none">👋</div>
            <p className="text-sm text-[var(--text-muted)]">Di hola a {partnerName}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderId === user?.id} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Mensaje a ${partnerName}…`}
          rows={1}
          className="flex-1 resize-none rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-4 py-2.5 border border-[var(--border)] focus:outline-none focus:border-[var(--border-focus)] transition-colors max-h-32 overflow-y-auto"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label="Enviar mensaje"
          className="size-10 shrink-0 rounded-full bg-[var(--brand)] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[var(--brand-hover)] transition-colors"
        >
          <svg className="size-4 -translate-x-px" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
