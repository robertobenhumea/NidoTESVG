import type { Conversation, Message } from '@/types';

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

export const chatOffline = {
  getMessages(partnerId: number): Message[] {
    if (typeof window === 'undefined') return [];
    return safeParse<Message[]>(localStorage.getItem(`${MESSAGES_PREFIX}${partnerId}`), []);
  },

  setMessages(partnerId: number, messages: Message[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${MESSAGES_PREFIX}${partnerId}`, JSON.stringify(messages.slice(-120)));
  },

  getConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];
    return safeParse<Conversation[]>(localStorage.getItem(CONVERSATIONS_KEY), []);
  },

  setConversations(conversations: Conversation[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 80)));
  },

  getQueue(): QueuedDM[] {
    if (typeof window === 'undefined') return [];
    return safeParse<QueuedDM[]>(localStorage.getItem(QUEUE_KEY), []);
  },

  enqueue(item: Omit<QueuedDM, 'id' | 'createdAt'>): QueuedDM {
    const queued: QueuedDM = {
      ...item,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...this.getQueue(), queued].slice(-50);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
    return queued;
  },

  remove(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.getQueue().filter(item => item.id !== id)));
  },
};
