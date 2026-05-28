import { api } from '@/services/api';
import { isoOrEmpty } from '@/lib/chatDates';
import { chatOffline } from '@/lib/chatOffline';
import { getStoredAuthToken } from '@/lib/utils';
import type { BMensaje, BConversacion, Message, Conversation, LegacyMsgTipo, MsgTipo } from '@/types';

const OPTS = { suppressAuthExpiry: true } as const;

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
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

function mapConversation(b: BConversacion): Conversation {
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
    partnerId:    b.partnerId,
    partnerName:  b.partnerNombre,
    partnerAvatar: b.partnerFoto ? resolveUrl(b.partnerFoto) : undefined,
    partnerCarrera: b.partnerCarrera ?? undefined,
    partnerRol:   b.partnerRol ? String(b.partnerRol) : undefined,
    lastMessage:  b.ultimoMensaje ?? undefined,
    lastTipo:     normalizeMessageType(b.ultimoTipo),
    updatedAt:    updatedAt || undefined,
    unreadCount:  b.noLeidos,
    isMine:       b.esMio ?? false,
    archived:     b.archived ?? false,
    muted:        b.muted ?? false,
    online:       b.online ?? false,
    lastSeen:     b.lastSeen ?? null,
  };
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    try {
      const data = await api.get<BConversacion[]>('/mensajes/conversaciones', OPTS);
      const conversations = data.map(mapConversation);
      chatOffline.setConversations(conversations);
      return conversations;
    } catch (err) {
      const cached = chatOffline.getConversations();
      if (cached.length > 0) return cached;
      throw err;
    }
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

  async sendWithAttachment(receiverId: number, content: string, file: File, extra?: { referenciaId?: number; messageType?: MsgTipo; durationSeconds?: number; waveformData?: string }): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
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
    const token = getStoredAuthToken();
    if (!token) throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/mensajes/enviar/${receiverId}/adjunto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error(await readError(res));
    return mapMessage(await res.json() as BMensaje);
  },

  async uploadAttachment(receiverId: number, file: File): Promise<{ url: string; tipo: MsgTipo; nombre: string; fileType?: string; fileSize?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('archivo', file);
    const token = getStoredAuthToken();
    if (!token) throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/mensajes/adjunto/${receiverId}`, {
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

  async getUnreadCount(): Promise<number> {
    const data = await api.get<{ count: number }>('/mensajes/no-leidos', OPTS);
    return data.count ?? 0;
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
