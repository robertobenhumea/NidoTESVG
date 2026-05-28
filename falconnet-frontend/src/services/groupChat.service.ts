import { api } from '@/services/api';
import { STORAGE_KEYS, getApiBaseUrl, getStoredAuthToken, resolveUrl as resolveBackendUrl } from '@/lib/utils';
import { emitChatDebug } from '@/services/chat.service';
import type {
  BChatGrupo, BChatGrupoMensaje, BChatGrupoDetalle,
  ChatGroup, GroupMessage, ChatGroupMember,
  MsgTipo, LegacyMsgTipo, ChatGrupoRol, GroupAttachment, GroupSharedLink,
} from '@/types';

const OPTS = { suppressAuthExpiry: true } as const;

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
    const wrapped = raw as { content?: unknown; data?: unknown; items?: unknown; results?: unknown; grupos?: unknown };
    for (const value of [wrapped.content, wrapped.data, wrapped.items, wrapped.results, wrapped.grupos]) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function responseType(raw: unknown): string {
  if (Array.isArray(raw)) return 'array';
  if (!raw || typeof raw !== 'object') return typeof raw;
  const wrapped = raw as { content?: unknown; data?: unknown; items?: unknown; results?: unknown; grupos?: unknown };
  for (const key of ['content', 'data', 'items', 'results', 'grupos'] as const) {
    if (Array.isArray(wrapped[key])) return key;
  }
  return `object:${Object.keys(raw).slice(0, 8).join(',')}`;
}

function rawPreview(raw: unknown): unknown {
  const list = extractList<unknown>(raw);
  if (list.length > 0) return list.slice(0, 2);
  if (Array.isArray(raw)) return raw.slice(0, 2);
  if (raw && typeof raw === 'object') return Object.fromEntries(Object.entries(raw).slice(0, 8));
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

function mapGroup(b: BChatGrupo): ChatGroup {
  return {
    id:          b.id,
    nombre:      b.nombre,
    descripcion: b.descripcion ?? undefined,
    foto:        resolveUrl(b.foto),
    tipo:        b.tipo,
    creadorId:   b.creadorId,
    miRol:       b.rol,
    noLeidos:    b.noLeidos,
    fechaCreacion: b.fechaCreacion,
    lastMessage: b.ultimoMensaje ?? undefined,
    lastTipo:    normalizeMessageType(b.ultimoTipo) ?? undefined,
    lastDate:    b.ultimaFecha ?? undefined,
    lastSender:  b.ultimoEmisor ?? undefined,
  };
}

export function mapGroupMessage(b: BChatGrupoMensaje | GroupMessage): GroupMessage {
  const raw = b as BChatGrupoMensaje & Partial<GroupMessage> & {
    content?: string | null;
    senderId?: number | null;
    senderName?: string | null;
    senderAvatar?: string | null;
  };
  const fileUrl = raw.fileUrl ? resolveUrl(raw.fileUrl) : raw.archivoUrl ? resolveUrl(raw.archivoUrl) : null;
  const fileName = raw.fileName ?? raw.nombreArchivo ?? null;
  const createdAt = raw.createdAt ?? raw.fecha ?? new Date().toISOString();
  return {
    id:           raw.id,
    grupoId:      raw.grupoId,
    senderId:     raw.senderId ?? raw.emisorId,
    content:      raw.content ?? raw.contenido ?? '',
    tipo:         normalizeMessageType(raw.messageType ?? raw.tipo),
    fileUrl,
    fileName,
    fileType:     raw.fileType ?? null,
    fileSize:     raw.fileSize ?? null,
    durationSeconds: raw.durationSeconds ?? null,
    waveformData: raw.waveformData ?? null,
    archivoUrl:   fileUrl,
    nombreArchivo: fileName,
    eliminado:    raw.eliminado ?? false,
    esSistema:    raw.esSistema ?? false,
    createdAt,
    senderName:   raw.senderName ?? raw.emisorNombre,
    senderAvatar: resolveUrl(raw.senderAvatar ?? raw.emisorFoto),
    referenciaId: raw.referenciaId ?? null,
    referencia:   raw.referencia
      ? {
          id:         raw.referencia.id,
          content:    raw.referencia.contenido,
          tipo:       normalizeMessageType(raw.referencia.tipo),
          senderId:   raw.referencia.emisorId,
          senderName: raw.referencia.emisorNombre,
        }
      : undefined,
    replyPreview: raw.replyPreview
      ? {
          id: raw.replyPreview.id,
          senderId: raw.replyPreview.senderId,
          senderName: raw.replyPreview.senderName,
          content: ('content' in raw.replyPreview ? raw.replyPreview.content : undefined) ?? raw.replyPreview.contenido,
          tipo: normalizeMessageType(raw.replyPreview.tipo),
          eliminado: raw.replyPreview.eliminado,
        }
      : undefined,
    editado: raw.editado ?? false,
    actualizadoEn: raw.actualizadoEn ?? null,
    reenviado: raw.reenviado ?? false,
    mensajeOriginalId: raw.mensajeOriginalId ?? null,
    reactions: raw.reactions ?? [],
    myReaction: raw.myReaction ?? null,
  };
}

export const groupChatService = {
  async getGroups(): Promise<ChatGroup[]> {
    const endpoint = '/grupos/chat';
    const apiUrl = getApiBaseUrl();
    const token = getStoredAuthToken();
    const auth = authDebugInfo();
    const url = `${apiUrl}${endpoint}?_=${Date.now()}`;
    chatListLog('solicitando grupos de chat', { endpoint, apiUrl, source: 'backend', auth });
    emitChatDebug({ kind: 'groups', label: 'solicitando grupos', apiUrl, endpoint, url, source: 'backend', status: 'not-called', hasToken: auth.hasToken, tokenLength: auth.tokenLength, user: auth.user });
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
    if (!res.ok) {
      emitChatDebug({ kind: 'groups', label: 'grupos falló HTTP', apiUrl, endpoint, url, status: res.status, ok: res.ok, responseType: responseType(raw), rawPreview: rawPreview(raw), source: 'error', hasToken: Boolean(token), tokenLength: token?.length ?? 0, user: auth.user });
      const errorData = raw as { error?: string; message?: string } | null;
      throw new Error(errorData?.error ?? errorData?.message ?? `HTTP ${res.status}`);
    }
    const data = extractList<BChatGrupo>(raw);
    chatListLog('respuesta cruda grupos', { endpoint, source: 'backend', count: data.length, data });
    const groups = data.map(mapGroup);
    emitChatDebug({ kind: 'groups', label: 'grupos recibidos', apiUrl, endpoint, url, status: res.status, ok: res.ok, responseType: responseType(raw), rawCount: data.length, mappedCount: groups.length, filteredCount: groups.length, source: 'backend', hasToken: Boolean(token), tokenLength: token?.length ?? 0, user: auth.user, rawPreview: rawPreview(raw) });
    chatListLog('grupos mapeados', { endpoint, source: 'backend', rawCount: data.length, mappedCount: groups.length });
    return groups;
  },

  async getUnreadCount(): Promise<number> {
    const data = await api.get<{ count: number }>('/grupos/chat/no-leidos', OPTS);
    return data.count ?? 0;
  },

  async createGroup(payload: {
    nombre: string;
    descripcion?: string;
    foto?: string;
    tipo?: string;
    miembros?: number[];
  }): Promise<{ id: number; nombre: string }> {
    return api.post('/grupos/chat', payload, OPTS);
  },

  async getDetail(id: number): Promise<BChatGrupoDetalle> {
    return api.get<BChatGrupoDetalle>(`/grupos/chat/${id}`, OPTS);
  },

  async updateGroup(id: number, payload: Partial<{ nombre: string; descripcion: string; foto: string; tipo: string }>): Promise<void> {
    await api.put(`/grupos/chat/${id}`, payload, OPTS);
  },

  async archiveGroup(id: number): Promise<void> {
    await api.delete(`/grupos/chat/${id}`, OPTS);
  },

  async getMessages(id: number): Promise<GroupMessage[]> {
    const data = await api.get<BChatGrupoMensaje[]>(`/grupos/chat/${id}/mensajes`, OPTS);
    return data.map(mapGroupMessage);
  },

  async getMessagesPage(id: number, opts?: { beforeId?: number; limit?: number }): Promise<GroupMessage[]> {
    const params = new URLSearchParams();
    if (opts?.beforeId) params.set('beforeId', String(opts.beforeId));
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const data = await api.get<BChatGrupoMensaje[]>(`/grupos/chat/${id}/mensajes${qs ? `?${qs}` : ''}`, OPTS);
    return data.map(mapGroupMessage);
  },

  async sendMessage(id: number, payload: {
    contenido: string;
    tipo?: MsgTipo;
    archivoUrl?: string;
    nombreArchivo?: string;
    fileType?: string;
    fileSize?: number;
    durationSeconds?: number;
    waveformData?: string;
    replyToMessageId?: number;
    originalMessageId?: number;
    forwarded?: boolean;
  }): Promise<GroupMessage> {
    const data = await api.post<BChatGrupoMensaje>(`/grupos/chat/${id}/mensajes`, payload, OPTS);
    return mapGroupMessage(data);
  },

  async sendWithAttachment(groupId: number, content: string, file: File, opts?: { replyToMessageId?: number; messageType?: MsgTipo; durationSeconds?: number; waveformData?: string }): Promise<GroupMessage> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', String(groupId));
    if (opts?.messageType) {
      formData.append('messageType', opts.messageType);
      formData.append('tipo', opts.messageType);
    }
    if (content.trim()) {
      formData.append('content', content.trim());
    }
    if (opts?.replyToMessageId) formData.append('replyToMessageId', String(opts.replyToMessageId));
    if (opts?.durationSeconds) formData.append('durationSeconds', String(opts.durationSeconds));
    if (opts?.waveformData) formData.append('waveformData', opts.waveformData);
    const token = getStoredAuthToken();
    if (!token) throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
    const res = await fetch(
      `${getApiBaseUrl()}/grupos/chat/${groupId}/mensajes/adjunto`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!res.ok) throw new Error(await readError(res));
    return mapGroupMessage(await res.json() as BChatGrupoMensaje);
  },

  async editMessage(groupId: number, msgId: number, contenido: string): Promise<GroupMessage> {
    const data = await api.put<BChatGrupoMensaje>(`/grupos/chat/${groupId}/mensajes/${msgId}`, { contenido }, OPTS);
    return mapGroupMessage(data);
  },

  async react(groupId: number, msgId: number, reactionType: string): Promise<GroupMessage> {
    const data = await api.post<BChatGrupoMensaje>(`/grupos/chat/${groupId}/mensajes/${msgId}/reacciones`, { reactionType }, OPTS);
    return mapGroupMessage(data);
  },

  async forwardMessage(groupId: number, msgId: number, targetGroupId: number): Promise<GroupMessage> {
    const data = await api.post<BChatGrupoMensaje>(`/grupos/chat/${groupId}/mensajes/${msgId}/reenviar`, { grupoId: targetGroupId }, OPTS);
    return mapGroupMessage(data);
  },

  async deleteMessage(groupId: number, msgId: number, modo: 'todos' | 'para-mi' = 'todos'): Promise<void> {
    await api.delete(`/grupos/chat/${groupId}/mensajes/${msgId}?modo=${encodeURIComponent(modo)}`, OPTS);
  },

  async getMembers(id: number): Promise<ChatGroupMember[]> {
    const data = await api.get<Array<{
      usuarioId: number; rol: ChatGrupoRol; fechaUnion: string;
      silenciado: boolean; nombre: string; foto?: string | null; carrera?: string | null;
    }>>(`/grupos/chat/${id}/miembros`, OPTS);
    return data.map(m => ({
      usuarioId:  m.usuarioId,
      rol:        m.rol,
      fechaUnion: m.fechaUnion,
      silenciado: m.silenciado,
      nombre:     m.nombre,
      foto:       resolveUrl(m.foto),
      carrera:    m.carrera ?? undefined,
    }));
  },

  async addMembers(id: number, usuarioIds: number[]): Promise<void> {
    await api.post(`/grupos/chat/${id}/miembros`, { usuarioIds }, OPTS);
  },

  async removeMember(id: number, uid: number): Promise<void> {
    await api.delete(`/grupos/chat/${id}/miembros/${uid}`, OPTS);
  },

  async changeRole(id: number, uid: number, rol: ChatGrupoRol): Promise<void> {
    await api.put(`/grupos/chat/${id}/miembros/${uid}/rol`, { rol }, OPTS);
  },

  async setMuted(id: number, uid: number, silenciado: boolean): Promise<void> {
    await api.put(`/grupos/chat/${id}/miembros/${uid}/silencio`, { silenciado }, OPTS);
  },

  async joinPublic(id: number): Promise<void> {
    await api.post(`/grupos/chat/${id}/unirse`, undefined, OPTS);
  },

  async uploadAttachment(groupId: number, file: File): Promise<{ url: string; tipo: MsgTipo; nombre: string; fileType?: string; fileSize?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('archivo', file);
    const token = getStoredAuthToken();
    if (!token) throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
    const res = await fetch(
      `${getApiBaseUrl()}/grupos/chat/${groupId}/adjunto`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json() as { url: string; tipo: LegacyMsgTipo; nombre: string; fileType?: string; fileSize?: number };
    return {
      url:   resolveUrl(data.url) ?? data.url,
      tipo:  normalizeMessageType(data.tipo),
      nombre: data.nombre,
      fileType: data.fileType,
      fileSize: data.fileSize,
    };
  },

  async uploadGroupPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await fetch(`${getApiBaseUrl()}/imagenes/subir`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) ?? '' : ''}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir imagen');
    const data = await res.json() as { url: string };
    return resolveUrl(data.url) ?? data.url;
  },

  async markRead(id: number): Promise<void> {
    await api.put(`/grupos/chat/${id}/leer`, undefined, OPTS);
  },

  async getAttachments(id: number): Promise<GroupAttachment[]> {
    const data = await api.get<GroupAttachment[]>(`/grupos/chat/${id}/adjuntos`, OPTS);
    return data.map(a => ({ ...a, tipo: normalizeMessageType(a.tipo), url: resolveUrl(a.url) ?? a.url }));
  },

  async getLinks(id: number): Promise<GroupSharedLink[]> {
    return api.get<GroupSharedLink[]>(`/grupos/chat/${id}/links`, OPTS);
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
