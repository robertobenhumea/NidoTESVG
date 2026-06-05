import { api } from '@/services/api';
import { isoOrEmpty } from '@/lib/chatDates';
import { chatOffline } from '@/lib/chatOffline';
import { STORAGE_KEYS, getApiBaseUrl, getStoredAuthToken, resolveUrl as resolveBackendUrl } from '@/lib/utils';
import type { BMensaje, BConversacion, Message, Conversation, LegacyMsgTipo, MsgTipo } from '@/types';

const OPTS = { suppressAuthExpiry: true } as const;
const DM_DEBUG_EVENT = 'chat:dm-debug';

export type ChatListDebugSnapshot = {
  kind: 'dm' | 'groups' | 'convlist';
  label: string;
  apiUrl?: string;
  locationOrigin?: string;
  locationHost?: string;
  endpoint?: string;
  url?: string;
  hasToken?: boolean;
  tokenLength?: number;
  user?: unknown;
  status?: number | 'not-called';
  ok?: boolean;
  responseType?: string;
  rawCount?: number;
  mappedCount?: number;
  filteredCount?: number;
  filteredOut?: number;
  source?: 'backend' | 'cache' | 'localStorage' | 'state' | 'filter' | 'error';
  selectedTab?: string;
  searchActive?: boolean;
  searchText?: string;
  dmStateCount?: number;
  dmVisibleCount?: number;
  previousDmCount?: number;
  nextDmCount?: number;
  groupStateCount?: number;
  groupVisibleCount?: number;
  reason?: string;
  blocked?: boolean;
  rawPreview?: unknown;
  error?: unknown;
  timestamp: string;
};

export type ChatConversationsResult = {
  conversations: Conversation[];
  source: 'backend' | 'cache';
  backendCount: number;
  reason: string;
};

export function emitChatDebug(snapshot: Omit<ChatListDebugSnapshot, 'timestamp'>) {
  const payload: ChatListDebugSnapshot = { ...snapshot, timestamp: new Date().toISOString() };
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem('fn_chat_debug') !== '1') return;
  const target = window as Window & { __fnChatDebug?: ChatListDebugSnapshot[] };
  target.__fnChatDebug = [payload, ...(target.__fnChatDebug ?? [])].slice(0, 20);
  window.dispatchEvent(new CustomEvent(DM_DEBUG_EVENT, { detail: payload }));
}

export function subscribeChatDebug(listener: (snapshot: ChatListDebugSnapshot) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<ChatListDebugSnapshot>).detail);
  window.addEventListener(DM_DEBUG_EVENT, handler);
  return () => window.removeEventListener(DM_DEBUG_EVENT, handler);
}

export function getChatDebugHistory(): ChatListDebugSnapshot[] {
  if (typeof window === 'undefined') return [];
  return ((window as Window & { __fnChatDebug?: ChatListDebugSnapshot[] }).__fnChatDebug ?? []);
}

function browserLocationInfo(): Pick<ChatListDebugSnapshot, 'locationOrigin' | 'locationHost'> {
  if (typeof window === 'undefined') return {};
  return {
    locationOrigin: window.location.origin,
    locationHost: window.location.host,
  };
}

function resolveUrl(path?: string | null): string | undefined {
  return resolveBackendUrl(path);
}

function chatListLog(message: string, extra?: unknown) {
  if (process.env.NODE_ENV !== 'production' && /error|falló|fallo|rechaz/i.test(message)) {
    console.warn(`[chat-list] ${message}`, extra ?? '');
  }
}

function authDebugInfo() {
  if (typeof window === 'undefined') return { hasToken: false, user: null };
  const token = getStoredAuthToken();
  const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
  let user: unknown = null;
  try { user = rawUser ? JSON.parse(rawUser) : null; } catch { user = 'invalid-json'; }
  return {
    hasToken: Boolean(token),
    tokenLength: token?.length ?? 0,
    user,
  };
}

function extractList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const wrapped = raw as {
      content?: unknown;
      data?: unknown;
      items?: unknown;
      results?: unknown;
      conversaciones?: unknown;
    };
    for (const value of [wrapped.content, wrapped.data, wrapped.items, wrapped.results, wrapped.conversaciones]) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function responseType(raw: unknown): string {
  if (Array.isArray(raw)) return 'array';
  if (!raw || typeof raw !== 'object') return typeof raw;
  const wrapped = raw as {
    content?: unknown;
    data?: unknown;
    items?: unknown;
    results?: unknown;
    conversaciones?: unknown;
  };
  for (const key of ['content', 'data', 'items', 'results', 'conversaciones'] as const) {
    if (Array.isArray(wrapped[key])) return key;
  }
  return `object:${Object.keys(raw).slice(0, 8).join(',')}`;
}

function rawPreview(raw: unknown): unknown {
  const list = extractList<unknown>(raw);
  if (list.length > 0) return list.slice(0, 2);
  if (Array.isArray(raw)) return raw.slice(0, 2);
  if (raw && typeof raw === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw).slice(0, 8)) {
      out[key] = Array.isArray(value) ? value.slice(0, 2) : value;
    }
    return out;
  }
  return raw;
}

function normalizeMessageType(type?: LegacyMsgTipo | null): MsgTipo {
  switch (type) {
    case 'IMAGEN':
    case 'IMAGE':
      return 'IMAGE';
    case 'ARCHIVO':
    case 'DOCUMENT':
      return 'DOCUMENT';
    case 'VOICE':
    case 'VOZ':
    case 'AUDIO':
      return 'AUDIO';
    case 'TEXTO':
    case 'TEXT':
    default:
      return 'TEXT';
  }
}

function firstValidIso(...values: Array<string | number | Date | null | undefined>): string {
  for (const value of values) {
    const iso = isoOrEmpty(value);
    if (iso) return iso;
  }
  return new Date().toISOString();
}

function firstValidIsoOrUndefined(...values: Array<string | number | Date | null | undefined>): string | undefined {
  for (const value of values) {
    const iso = isoOrEmpty(value);
    if (iso) return iso;
  }
  return undefined;
}

export function mapMessage(b: BMensaje): Message {
  const deleted = b.deleted ?? b.eliminado ?? false;
  const createdAt = firstValidIso(b.createdAt, b.fechaCreacion, b.timestamp, b.sentAt, b.created_at, b.fecha);
  const replyPreview = b.replyPreview
    ? {
        id:         b.replyPreview.id,
        content:    b.replyPreview.content ?? b.replyPreview.contenido,
        tipo:       normalizeMessageType(b.replyPreview.tipo),
        senderId:   b.replyPreview.senderId,
        senderName: b.replyPreview.senderName,
        eliminado:  b.replyPreview.eliminado,
      }
    : b.referencia
      ? {
          id:         b.referencia.id,
          content:    b.referencia.contenido,
          tipo:       normalizeMessageType(b.referencia.tipo),
          senderId:   b.referencia.emisorId,
          senderName: b.referencia.emisorNombre,
          eliminado:  false,
        }
      : null;

  return {
    id:           b.id,
    senderId:     b.senderId ?? b.emisorId,
    receiverId:   b.receptorId,
    senderName:   b.senderName ?? b.emisorNombre ?? null,
    content:      b.content ?? b.contenido,
    createdAt,
    fechaCreacion: b.fechaCreacion ?? null,
    timestamp:    b.timestamp ?? null,
    created_at:   b.created_at ?? null,
    read:         b.leido,
    status:       b.status ?? (b.readAt || b.leido ? 'READ' : b.deliveredAt ? 'DELIVERED' : 'SENT'),
    sentAt:       firstValidIsoOrUndefined(b.sentAt, b.createdAt, b.fechaCreacion, b.timestamp, b.created_at, b.fecha) ?? createdAt,
    deliveredAt:  b.deliveredAt ?? null,
    readAt:       b.readAt ?? null,
    tipo:         normalizeMessageType(b.messageType ?? b.tipo),
    fileUrl:      deleted ? null : b.fileUrl ? resolveUrl(b.fileUrl) : b.archivoUrl ? resolveUrl(b.archivoUrl) : null,
    fileName:     deleted ? null : b.fileName ?? b.nombreArchivo ?? null,
    fileType:     deleted ? null : b.fileType ?? null,
    fileSize:     deleted ? null : b.fileSize ?? null,
    durationSeconds: deleted ? null : b.durationSeconds ?? null,
    waveformData: deleted ? null : b.waveformData ?? null,
    archivoUrl:   deleted ? null : b.fileUrl ? resolveUrl(b.fileUrl) : b.archivoUrl ? resolveUrl(b.archivoUrl) : null,
    nombreArchivo: deleted ? null : b.fileName ?? b.nombreArchivo ?? null,
    eliminado:    deleted,
    referenciaId: b.referenciaId ?? null,
    referencia:   replyPreview ?? undefined,
    replyPreview,
    editado:      b.editado ?? false,
    actualizadoEn: b.actualizadoEn ?? null,
    reenviado:    b.reenviado ?? false,
    mensajeOriginalId: b.mensajeOriginalId ?? null,
    pinned:       b.pinned ?? false,
    pinnedBy:     b.pinnedBy ?? null,
    pinnedAt:     b.pinnedAt ?? null,
    reactions:    b.reactions ?? [],
    myReaction:   b.myReaction ?? null,
  };
}

function postFormWithProgress<T>(path: string, formData: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getStoredAuthToken();
    if (!token) {
      reject(new Error('No hay sesión activa. Inicia sesión de nuevo.'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiBaseUrl()}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new Error('Respuesta inválida del servidor'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string; message?: string };
          reject(new Error(data.error ?? data.message ?? `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Error de conexión. Verifica tu internet.'));
    xhr.send(formData);
  });
}

function mapConversation(b: BConversacion): Conversation {
  const raw = b as BConversacion & {
    id?: number | null;
    userId?: number | null;
    usuarioId?: number | null;
    partner?: { id?: number | null; nombre?: string | null; username?: string | null; foto?: string | null; avatarUrl?: string | null } | null;
    usuario?: { id?: number | null; nombre?: string | null; username?: string | null; foto?: string | null; avatarUrl?: string | null } | null;
    partnerName?: string | null;
    nombre?: string | null;
    username?: string | null;
    partnerAvatar?: string | null;
    avatarUrl?: string | null;
    foto?: string | null;
    lastMessage?: string | null;
    unreadCount?: number | null;
    isMine?: boolean | null;
  };
  const partner = raw.partner ?? raw.usuario ?? null;
  const partnerId = raw.partnerId ?? partner?.id ?? raw.usuarioId ?? raw.userId ?? raw.id ?? 0;
  const updatedAt = firstValidIsoOrUndefined(
    b.lastMessageAt,
    b.updatedAt,
    b.fecha,
    b.fechaCreacion,
    b.timestamp,
    b.created_at,
    b.createdAt,
  );
  return {
    partnerId,
    partnerName:  raw.partnerNombre ?? raw.partnerName ?? partner?.nombre ?? partner?.username ?? raw.nombre ?? raw.username ?? 'Usuario',
    partnerAvatar: raw.partnerFoto ? resolveUrl(raw.partnerFoto) : raw.partnerAvatar ? resolveUrl(raw.partnerAvatar) : raw.avatarUrl ? resolveUrl(raw.avatarUrl) : raw.foto ? resolveUrl(raw.foto) : partner?.foto ? resolveUrl(partner.foto) : partner?.avatarUrl ? resolveUrl(partner.avatarUrl) : undefined,
    partnerCarrera: b.partnerCarrera ?? undefined,
    partnerRol:   b.partnerRol ? String(b.partnerRol) : undefined,
    lastMessage:  raw.ultimoMensaje ?? raw.lastMessage ?? undefined,
    lastTipo:     normalizeMessageType(b.ultimoTipo),
    updatedAt:    updatedAt || undefined,
    unreadCount:  raw.noLeidos ?? raw.unreadCount ?? 0,
    isMine:       raw.esMio ?? raw.isMine ?? false,
    archived:     b.archived ?? false,
    muted:        b.muted ?? false,
    online:       b.online ?? false,
    lastSeen:     b.lastSeen ?? null,
  };
}

export const chatService = {
  async getConversationsResult(): Promise<ChatConversationsResult> {
    const endpoint = '/mensajes/conversaciones';
    const apiUrl = getApiBaseUrl();
    const auth = authDebugInfo();
    chatListLog('solicitando conversaciones DM', { endpoint, apiUrl, source: 'backend', auth });
    emitChatDebug({ kind: 'dm', label: 'solicitando DM', apiUrl, endpoint, url: `${apiUrl}${endpoint}`, ...browserLocationInfo(), source: 'backend', status: 'not-called', hasToken: auth.hasToken, tokenLength: auth.tokenLength, user: auth.user });
    try {
      const token = getStoredAuthToken();
      const url = `${apiUrl}${endpoint}?_=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      });
      let raw: unknown = null;
      try { raw = await res.json(); } catch { raw = null; }
      chatListLog('respuesta cruda DM', {
        endpoint,
        url,
        status: res.status,
        ok: res.ok,
        auth: authDebugInfo(),
        raw,
      });
      if (!res.ok) {
        emitChatDebug({ kind: 'dm', label: 'DM falló HTTP', apiUrl, endpoint, url, ...browserLocationInfo(), status: res.status, ok: res.ok, responseType: responseType(raw), rawPreview: rawPreview(raw), source: 'error', hasToken: Boolean(token), tokenLength: token?.length ?? 0, user: authDebugInfo().user });
        const errorData = raw as { error?: string; message?: string } | null;
        throw new Error(errorData?.error ?? errorData?.message ?? `HTTP ${res.status}`);
      }
      const data = extractList<BConversacion>(raw);
      const conversations = data
        .map(mapConversation)
        .filter(conv => Number.isFinite(conv.partnerId) && conv.partnerId > 0);
      emitChatDebug({
        kind: 'dm',
        label: 'DM recibido',
        apiUrl,
        endpoint,
        url,
        ...browserLocationInfo(),
        status: res.status,
        ok: res.ok,
        responseType: responseType(raw),
        rawCount: data.length,
        mappedCount: data.length,
        filteredCount: conversations.length,
        filteredOut: data.length - conversations.length,
        source: 'backend',
        hasToken: Boolean(token),
        tokenLength: token?.length ?? 0,
        user: authDebugInfo().user,
        rawPreview: rawPreview(raw),
      });
      chatListLog('conversaciones DM mapeadas', {
        endpoint,
        source: 'backend',
        rawCount: data.length,
        mappedCount: conversations.length,
        filteredOut: data.length - conversations.length,
      });
      chatOffline.setConversations(conversations);
      return {
        conversations,
        source: 'backend',
        backendCount: conversations.length,
        reason: conversations.length > 0 ? 'backend-valid' : 'backend-empty',
      };
    } catch (err) {
      const cached = chatOffline.getConversations();
      chatListLog('falló carga DM', { endpoint, source: cached.length > 0 ? 'cache' : 'backend', cachedCount: cached.length, error: err });
      emitChatDebug({ kind: 'dm', label: 'DM error/catch', apiUrl, endpoint, url: `${apiUrl}${endpoint}`, ...browserLocationInfo(), source: cached.length > 0 ? 'cache' : 'error', dmStateCount: cached.length, error: err instanceof Error ? err.message : String(err), hasToken: authDebugInfo().hasToken, tokenLength: authDebugInfo().tokenLength, user: authDebugInfo().user });
      if (cached.length > 0) {
        return {
          conversations: cached,
          source: 'cache',
          backendCount: 0,
          reason: 'backend-error-cache-fallback',
        };
      }
      throw err;
    }
  },

  async getConversations(): Promise<Conversation[]> {
    return (await chatService.getConversationsResult()).conversations;
  },

  async getMessages(partnerId: number, opts?: { beforeId?: number; limit?: number }): Promise<Message[]> {
    const params = new URLSearchParams();
    params.set('limit', String(opts?.limit ?? 50));
    if (opts?.beforeId) params.set('beforeId', String(opts.beforeId));
    try {
      const data = await api.get<BMensaje[]>(`/mensajes/conversacion/${partnerId}?${params.toString()}`, OPTS);
      const messages = data.map(mapMessage);
      if (!opts?.beforeId) chatOffline.setMessages(partnerId, messages);
      return messages;
    } catch (err) {
      if (!opts?.beforeId) {
        const cached = chatOffline.getMessages(partnerId);
        if (cached.length > 0) return cached;
      }
      throw err;
    }
  },

  async send(receiverId: number, content: string, extra?: {
    tipo?: MsgTipo;
    archivoUrl?: string;
    nombreArchivo?: string;
    fileType?: string;
    fileSize?: number;
    durationSeconds?: number;
    waveformData?: string;
    referenciaId?: number;
  }): Promise<Message> {
    const data = await api.post<BMensaje>(`/mensajes/enviar/${receiverId}`, {
      contenido: content,
      messageType: extra?.tipo ?? 'TEXT',
      tipo: extra?.tipo ?? 'TEXT',
      fileUrl: extra?.archivoUrl,
      fileName: extra?.nombreArchivo,
      fileType: extra?.fileType,
      fileSize: extra?.fileSize,
      durationSeconds: extra?.durationSeconds,
      waveformData: extra?.waveformData,
      archivoUrl: extra?.archivoUrl,
      nombreArchivo: extra?.nombreArchivo,
      referenciaId: extra?.referenciaId,
    }, OPTS);
    return mapMessage(data);
  },

  async sendWithAttachment(receiverId: number, content: string, file: File, extra?: { referenciaId?: number; messageType?: MsgTipo; durationSeconds?: number; waveformData?: string; onProgress?: (percent: number) => void }): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('archivo', file);
    formData.append('conversationId', String(receiverId));
    if (extra?.messageType) {
      formData.append('messageType', extra.messageType);
      formData.append('tipo', extra.messageType);
    }
    if (content.trim()) {
      formData.append('content', content.trim());
    }
    if (extra?.referenciaId) formData.append('referenciaId', String(extra.referenciaId));
    if (extra?.durationSeconds) formData.append('durationSeconds', String(extra.durationSeconds));
    if (extra?.waveformData) formData.append('waveformData', extra.waveformData);
    const data = await postFormWithProgress<BMensaje>(`/mensajes/enviar/${receiverId}/adjunto`, formData, extra?.onProgress);
    return mapMessage(data);
  },

  async uploadAttachment(receiverId: number, file: File): Promise<{ url: string; tipo: MsgTipo; nombre: string; fileType?: string; fileSize?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('archivo', file);
    const token = getStoredAuthToken();
    if (!token) throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
    const res = await fetch(`${getApiBaseUrl()}/mensajes/adjunto/${receiverId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json() as { url: string; tipo: LegacyMsgTipo; nombre: string; fileType?: string; fileSize?: number };
    return {
      url: resolveUrl(data.url) ?? data.url,
      tipo: normalizeMessageType(data.tipo),
      nombre: data.nombre,
      fileType: data.fileType,
      fileSize: data.fileSize,
    };
  },

  async deleteMessage(id: number): Promise<void> {
    await api.delete<{ ok: boolean }>(`/mensajes/${id}`, OPTS);
  },

  async deleteForMe(id: number): Promise<void> {
    await api.delete<{ ok: boolean }>(`/mensajes/${id}/para-mi`, OPTS);
  },

  async react(id: number, reactionType: string): Promise<Message> {
    const data = await api.post<BMensaje>(`/mensajes/${id}/reacciones`, { reactionType }, OPTS);
    return mapMessage(data);
  },

  async edit(id: number, content: string): Promise<Message> {
    const data = await api.put<BMensaje>(`/mensajes/${id}/editar`, { content }, OPTS);
    return mapMessage(data);
  },

  async forward(id: number, recipientId: number): Promise<Message> {
    const data = await api.post<BMensaje>(`/mensajes/${id}/reenviar/${recipientId}`, undefined, OPTS);
    return mapMessage(data);
  },

  async forwardToGroup(id: number, groupId: number): Promise<void> {
    await api.post(`/mensajes/${id}/reenviar/grupo/${groupId}`, undefined, OPTS);
  },

  async search(partnerId: number, q: string, limit = 50): Promise<Message[]> {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const data = await api.get<BMensaje[]>(`/mensajes/conversacion/${partnerId}/buscar?${params.toString()}`, OPTS);
    return data.map(mapMessage);
  },

  async getPinned(partnerId: number): Promise<Message[]> {
    const data = await api.get<BMensaje[]>(`/mensajes/conversacion/${partnerId}/fijados`, OPTS);
    return data.map(mapMessage);
  },

  async pin(id: number, pinned: boolean): Promise<Message> {
    const data = await api.put<BMensaje>(`/mensajes/${id}/fijar`, { pinned }, OPTS);
    return mapMessage(data);
  },

  async setConversationPreference(partnerId: number, body: { archived?: boolean; muted?: boolean }): Promise<{ archived: boolean; muted: boolean }> {
    return api.put<{ archived: boolean; muted: boolean }>(`/mensajes/conversacion/${partnerId}/preferencias`, body, OPTS);
  },

  async blockUser(userId: number, reason?: string): Promise<void> {
    await api.post(`/mensajes/bloqueos/${userId}`, { reason }, OPTS);
  },

  async unblockUser(userId: number): Promise<void> {
    await api.delete(`/mensajes/bloqueos/${userId}`, OPTS);
  },

  async getBlockStatus(userId: number): Promise<{ blockedByMe: boolean; blockedMe: boolean }> {
    return api.get<{ blockedByMe: boolean; blockedMe: boolean }>(`/mensajes/bloqueos/${userId}`, OPTS);
  },

  async reportMessage(id: number, reason: string, description?: string): Promise<void> {
    await api.post(`/mensajes/${id}/reportes`, { reason, description }, OPTS);
  },

  async markDelivered(id: number): Promise<Message> {
    const data = await api.put<BMensaje>(`/mensajes/${id}/entregado`, undefined, OPTS);
    return mapMessage(data);
  },

  async markRead(senderId: number): Promise<void> {
    await api.put(`/mensajes/leer/${senderId}`, undefined, OPTS);
  },

  async getUnreadCount(): Promise<number> {
    const data = await api.get<{ count: number }>('/mensajes/no-leidos', OPTS);
    return data.count ?? 0;
  },

  async getPresence(userId: number): Promise<{ online: boolean; lastSeen: string | null }> {
    const data = await api.get<{ online?: boolean; lastSeen?: string | null }>(`/mensajes/presencia/${userId}`, OPTS);
    return { online: Boolean(data.online), lastSeen: data.lastSeen ?? null };
  },
};

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json() as { error?: string; message?: string };
    return data.error ?? data.message ?? 'Error al subir archivo';
  } catch {
    return 'Error al subir archivo';
  }
}
