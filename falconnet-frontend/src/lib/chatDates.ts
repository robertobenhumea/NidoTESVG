import type { Conversation, Message } from '@/types';

type DateLike = string | number | Date | null | undefined;
type MessageDateSource = Partial<Message> & {
  fechaCreacion?: DateLike;
  timestamp?: DateLike;
  created_at?: DateLike;
};
type ConversationDateSource = Partial<Conversation> & {
  createdAt?: DateLike;
  fecha?: DateLike;
  fechaCreacion?: DateLike;
  timestamp?: DateLike;
  created_at?: DateLike;
  lastMessageAt?: DateLike;
};

function validDate(value: DateLike): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseMessageDate(message: MessageDateSource): Date | null {
  return validDate(message.createdAt)
    ?? validDate(message.fechaCreacion)
    ?? validDate(message.timestamp)
    ?? validDate(message.sentAt)
    ?? validDate(message.created_at);
}

export function parseConversationDate(conversation: ConversationDateSource): Date | null {
  return validDate(conversation.updatedAt)
    ?? validDate(conversation.lastMessageAt)
    ?? validDate(conversation.createdAt)
    ?? validDate(conversation.fecha);
}

export function isoOrEmpty(value: DateLike): string {
  const date = validDate(value);
  return date ? date.toISOString() : '';
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function chatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameCalendarDay(date, today)) return 'Hoy';
  if (sameCalendarDay(date, yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function chatTimeLabel(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function conversationTimeLabel(date: Date | null): string {
  if (!date) return '';
  const today = new Date();
  if (sameCalendarDay(date, today)) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
