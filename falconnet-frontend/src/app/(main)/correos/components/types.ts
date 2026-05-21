export type Tab = 'entrada' | 'enviados' | 'favoritos' | 'archivados' | 'no-leidos' | 'papelera';
export type FilterType = 'all' | 'unread' | 'starred';

export interface CorreoItem {
  id: number;
  emisorId: number;
  emisorNombre?: string;
  emisorFoto?: string;
  destinatarioNombres?: string[];
  asunto: string;
  cuerpo?: string;
  fecha: string;
  leido?: boolean;
  esFavorito?: boolean;
  enPapelera?: boolean;
  archivado?: boolean;
  tieneAdjuntos?: boolean;
  etiqueta?: string;
  prioridad?: 'ALTA' | 'NORMAL' | string;
}

export interface BUser {
  id: number;
  username?: string;
  correo?: string;
  fotoPerfil?: string;
  activo?: boolean;
}
