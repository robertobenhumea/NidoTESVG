import { api } from './api';
import type { Comment, BComentario, BUser, User } from '@/types';
import { mapBUser } from '@/lib/userMapper';

function toComment(b: BComentario, userMap: Map<number, User>): Comment {
  return {
    id: b.id,
    author: userMap.get(b.usuarioId) ?? {
      id: b.usuarioId,
      username: `Usuario #${b.usuarioId}`,
      email: '',
    },
    content: b.contenido,
    createdAt: b.fecha,
  };
}

export const commentService = {
  async list(postId: number): Promise<Comment[]> {
    const [raw, users] = await Promise.all([
      api.get<BComentario[]>(`/interacciones/comentarios/${postId}`),
      api.get<BUser[]>('/usuarios'),
    ]);
    const userMap = new Map(users.map((u) => [u.id, mapBUser(u)]));
    return raw.map((c) => toComment(c, userMap));
  },

  async add(postId: number, content: string): Promise<BComentario> {
    return api.post<BComentario>(`/interacciones/comentario/${postId}`, {
      contenido: content,
    });
  },

  async remove(commentId: number): Promise<void> {
    await api.delete(`/interacciones/comentario/${commentId}`);
  },

  async getAllCounts(): Promise<Record<number, number>> {
    const raw = await api.get<Record<string, unknown[]>>('/interacciones/comentarios-todos');
    const result: Record<number, number> = {};
    for (const [id, arr] of Object.entries(raw)) {
      result[Number(id)] = Array.isArray(arr) ? arr.length : 0;
    }
    return result;
  },
};
