import { api } from '@/services/api';
import type { ReclutamientoFeedItem, EstadoSolicitud } from '@/types';

export interface SolicitudDetalle {
  id:          number;
  estado:      EstadoSolicitud;
  mensaje?:    string;
  carrera?:    string;
  semestre?:   string;
  experiencia?: string;
  githubUrl?:  string;
  fecha:       string;
  usuarioId:   number;
  nombre:      string;
  avatarUrl?:  string;
}

export interface EquipoDetalle extends ReclutamientoFeedItem {
  solicitudesPendientes?: number;
}

export const equipoService = {
  getActivos: () =>
    api.get<ReclutamientoFeedItem[]>('/reclutamiento/activos'),

  getById: (id: number) =>
    api.get<EquipoDetalle>(`/reclutamiento/${id}`),

  getMios: () =>
    api.get<ReclutamientoFeedItem[]>('/reclutamiento/mis'),

  solicitar: (id: number, data: {
    mensaje?: string; carrera?: string; semestre?: string;
    experiencia?: string; githubUrl?: string;
  }) => api.post(`/reclutamiento/${id}/solicitar`, data),

  cancelar: (id: number) =>
    api.delete(`/reclutamiento/${id}/solicitar`),

  getSolicitudes: (id: number) =>
    api.get<SolicitudDetalle[]>(`/reclutamiento/${id}/solicitudes`),

  responder: (id: number, solicitudId: number, estado: 'ACEPTADA' | 'RECHAZADA') =>
    api.put(`/reclutamiento/${id}/solicitudes/${solicitudId}`, { estado }),

  cerrar: (id: number, estado: 'COMPLETO' | 'CERRADO') =>
    api.put(`/reclutamiento/${id}`, { estado }),

  crear: (data: Record<string, unknown>) =>
    api.post<ReclutamientoFeedItem>('/reclutamiento', data),
};
