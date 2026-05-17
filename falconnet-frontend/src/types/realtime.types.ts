import type { User, Notification, Message } from './index';

/* ── Event names ── */
export const RT = {
  // Internal
  CONNECTED:    '$connected',
  DISCONNECTED: '$disconnected',
  ERROR:        '$error',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING:  'chat:typing',
  CHAT_READ:    'chat:read',

  // Notifications
  NOTIFICATION: 'notification:new',

  // Presence
  PRESENCE:     'presence:update',

  // Posts
  POST_REACTION: 'post:reaction',
  POST_COMMENT:  'post:comment',
} as const;

export type RTEventName = typeof RT[keyof typeof RT];

/* ── Payload shapes ── */

export interface PresencePayload {
  userId: number;
  online: boolean;
  lastSeen?: string;
}

export interface TypingPayload {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

export interface ChatMessagePayload {
  conversationId: number;
  message: Message;
}

export interface ChatReadPayload {
  conversationId: number;
  userId: number;
  lastReadAt: string;
}

export interface NotificationPayload {
  notification: Notification;
}

export interface PostReactionPayload {
  postId: number;
  userId: number;
  reaction: string | null;
  totalCount: number;
}

export interface PostCommentPayload {
  postId: number;
  commentId: number;
  author: User;
  commentCount: number;
}

/** Typed event map for the realtime layer */
export interface RTEventMap {
  [RT.CONNECTED]:     null;
  [RT.DISCONNECTED]:  null;
  [RT.ERROR]:         null;
  [RT.CHAT_MESSAGE]:  ChatMessagePayload;
  [RT.CHAT_TYPING]:   TypingPayload;
  [RT.CHAT_READ]:     ChatReadPayload;
  [RT.NOTIFICATION]:  NotificationPayload;
  [RT.PRESENCE]:      PresencePayload;
  [RT.POST_REACTION]: PostReactionPayload;
  [RT.POST_COMMENT]:  PostCommentPayload;
}
