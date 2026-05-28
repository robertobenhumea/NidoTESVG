import type { Conversation, Message } from '@/types';
import { STORAGE_KEYS } from '@/lib/utils';

const MESSAGES_PREFIX = 'fn_chat_messages:';
const CONVERSATIONS_KEY = 'fn_chat_conversations';
const QUEUE_KEY = 'fn_chat_outbox';

export interface QueuedDM {
  id: string;
  partnerId: number;
  content: string;
  referenciaId?: number;
  createdAt: string;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function currentUserSuffix(): string {
  if (typeof window === 'undefined') return 'anonymous';
  const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
  const user = safeParse<{ id?: number | string } | null>(storedUser, null);
  return user?.id != null ? String(user.id) : 'anonymous';
}

function conversationsKey(): string {
  return `${CONVERSATIONS_KEY}:${currentUserSuffix()}`;
}

function messagesKey(partnerId: number): string {
  return `${MESSAGES_PREFIX}${currentUserSuffix()}:${partnerId}`;
}

function queueKey(): string {
  return `${QUEUE_KEY}:${currentUserSuffix()}`;
}

export const chatOffline = {
  getMessages(partnerId: number): Message[] {
    if (typeof window === 'undefined') return [];
    return safeParse<Message[]>(localStorage.getItem(messagesKey(partnerId)), []);
  },

  setMessages(partnerId: number, messages: Message[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(messagesKey(partnerId), JSON.stringify(messages.slice(-120)));
  },

  getConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];
    return safeParse<Conversation[]>(localStorage.getItem(conversationsKey()), []);
  },

  setConversations(conversations: Conversation[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(conversationsKey(), JSON.stringify(conversations.slice(0, 80)));
  },

  clearConversations(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(conversationsKey());
    localStorage.removeItem(CONVERSATIONS_KEY);
  },

  getQueue(): QueuedDM[] {
    if (typeof window === 'undefined') return [];
    return safeParse<QueuedDM[]>(localStorage.getItem(queueKey()), []);
  },

  enqueue(item: Omit<QueuedDM, 'id' | 'createdAt'>): QueuedDM {
    const queued: QueuedDM = {
      ...item,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...this.getQueue(), queued].slice(-50);
    localStorage.setItem(queueKey(), JSON.stringify(next));
    return queued;
  },

  remove(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(queueKey(), JSON.stringify(this.getQueue().filter(item => item.id !== id)));
  },
};
