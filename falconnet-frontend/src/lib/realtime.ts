/**
 * Typed realtime event layer built on top of SocketClient.
 * Provides typed subscriptions instead of raw string event names.
 *
 * Phase 3: Call realtime.connect(token) when auth is ready.
 */
import { socket } from './socket';
import { RT, type RTEventMap, type RTEventName } from '@/types/realtime.types';

type Handler<E extends RTEventName> = (payload: RTEventMap[E]) => void;

function on<E extends RTEventName>(event: E, handler: Handler<E>): () => void {
  return socket.on(event, handler as (data: unknown) => void);
}

function emit<E extends RTEventName>(event: E, payload: RTEventMap[E]): void {
  socket.emit(event, payload);
}

export const realtime = {
  connect:    (token: string) => socket.connect(token),
  disconnect: () => socket.disconnect(),

  get isConnected() {
    return socket.isConnected;
  },

  /* ── Typed subscriptions ── */

  onConnected:    (h: Handler<'$connected'>)            => on(RT.CONNECTED,     h),
  onDisconnected: (h: Handler<'$disconnected'>)         => on(RT.DISCONNECTED,  h),

  onNotification: (h: Handler<typeof RT.NOTIFICATION>)  => on(RT.NOTIFICATION,  h),
  onChatMessage:  (h: Handler<typeof RT.CHAT_MESSAGE>)  => on(RT.CHAT_MESSAGE,  h),
  onChatTyping:   (h: Handler<typeof RT.CHAT_TYPING>)   => on(RT.CHAT_TYPING,   h),
  onChatRead:     (h: Handler<typeof RT.CHAT_READ>)     => on(RT.CHAT_READ,     h),
  onPresence:     (h: Handler<typeof RT.PRESENCE>)      => on(RT.PRESENCE,      h),
  onPostReaction: (h: Handler<typeof RT.POST_REACTION>) => on(RT.POST_REACTION, h),
  onPostComment:  (h: Handler<typeof RT.POST_COMMENT>)  => on(RT.POST_COMMENT,  h),

  /* ── Typed emitters ── */

  sendTyping: (payload: RTEventMap[typeof RT.CHAT_TYPING]) =>
    emit(RT.CHAT_TYPING, payload),
};
