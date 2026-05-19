import { api } from '@/services/api';
import type { Destacado, CreateDestacadoPayload } from '@/types';

export const destacadoService = {
  /** Destacados de un usuario (solo públicos si no es el propio perfil — el backend lo decide) */
  getByUsuario(usuarioId: number): Promise<Destacado[]> {
    return api.get<Destacado[]>(`/destacados/usuario/${usuarioId}`);
  },

  /** Mis destacados (todos, incluyendo privados) */
  getMios(): Promise<Destacado[]> {
    return api.get<Destacado[]>('/destacados/me');
  },

  create(data: CreateDestacadoPayload): Promise<Destacado> {
    return api.post<Destacado>('/destacados', data);
  },

  update(id: number, data: CreateDestacadoPayload): Promise<Destacado> {
    return api.put<Destacado>(`/destacados/${id}`, data);
  },

  delete(id: number): Promise<void> {
    return api.delete<void>(`/destacados/${id}`);
  },

  addHistoria(destacadoId: number, historiaId: number): Promise<Destacado> {
    return api.post<Destacado>(`/destacados/${destacadoId}/historias/${historiaId}`);
  },

  removeHistoria(destacadoId: number, historiaId: number): Promise<Destacado> {
    return api.delete<Destacado>(`/destacados/${destacadoId}/historias/${historiaId}`);
  },

  reorder(ids: number[]): Promise<void> {
    return api.put<void>('/destacados/reorder', ids);
  },
};
