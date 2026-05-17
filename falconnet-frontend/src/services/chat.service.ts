import { api } from '@/services/api';
import type { BMensaje, BConversacion, Message, Conversation } from '@/types';

function mapMessage(b: BMensaje): Message {
  return {
    id: b.id,
    senderId: b.emisorId,
    receiverId: b.receptorId,
    content: b.contenido,
    createdAt: b.fecha,
    read: b.leido,
  };
}

function mapConversation(b: BConversacion): Conversation {
  return {
    partnerId: b.partnerId,
    partnerName: b.partnerNombre,
    partnerAvatar: b.partnerFoto ?? undefined,
    lastMessage: b.ultimoMensaje ?? undefined,
    updatedAt: b.fecha ?? undefined,
    unreadCount: b.noLeidos,
  };
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const data = await api.get<BConversacion[]>('/mensajes/conversaciones');
    return data.map(mapConversation);
  },

  async getMessages(partnerId: number): Promise<Message[]> {
    const data = await api.get<BMensaje[]>(`/mensajes/conversacion/${partnerId}`);
    return data.map(mapMessage);
  },

  async send(receiverId: number, content: string): Promise<Message> {
    const data = await api.post<BMensaje>(`/mensajes/enviar/${receiverId}`, { contenido: content });
    return mapMessage(data);
  },

  async getUnreadCount(): Promise<number> {
    const data = await api.get<{ count: number }>('/mensajes/no-leidos');
    return data.count;
  },
};
