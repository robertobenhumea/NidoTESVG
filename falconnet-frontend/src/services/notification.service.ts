import { api } from '@/services/api';
import type { BNotificacion, Notification } from '@/types';

function mapNotif(b: BNotificacion): Notification {
  return {
    id: b.id,
    type: b.tipo,
    message: b.mensaje,
    read: b.leida,
    createdAt: b.fecha,
    referenciaId: b.referenciaId,
  };
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const data = await api.get<BNotificacion[]>('/notificaciones');
    return data.map(mapNotif);
  },

  async getUnreadCount(): Promise<number> {
    const data = await api.get<{ count: number }>('/notificaciones/no-leidas');
    return data.count;
  },

  async markAllRead(): Promise<void> {
    await api.put('/notificaciones/leer-todas');
  },

  async markRead(id: number): Promise<void> {
    await api.put(`/notificaciones/${id}/leer`);
  },
};
