export type Tab =
  | 'general'
  | 'academico'
  | 'equipos'
  | 'marketplace'
  | 'eventos'
  | 'institucional'
  | 'importante'
  | 'entrada'
  | 'enviados'
  | 'favoritos'
  | 'archivados'
  | 'no-leidos'
  | 'papelera';
export type FilterType = 'all' | 'unread' | 'starred';

export interface UsuarioInstitucional {
  id: number;
  nombre: string;
  username?: string;
  correo?: string;
  fotoPerfil?: string;
  carrera?: string;
  semestre?: string;
  grupo?: string;
  rol?: string;
  departamento?: string;
  facultad?: string;
  verificadoInstitucional?: boolean;
}

export interface CorreoAdjuntoItem {
  id: number;
  nombreArchivo: string;
  archivoUrl: string;
  tipoArchivo?: string;
  tamanio?: number;
  fecha?: string;
}

export interface CorreoItem {
  id: number;
  emisorId: number;
  emisorNombre?: string;
  emisorFoto?: string;
  emisor?: UsuarioInstitucional;
  destinatarios?: UsuarioInstitucional[];
  destinatarioNombres?: string[];
  asunto: string;
  cuerpo?: string;
  fecha: string;
  leido?: boolean;
  esFavorito?: boolean;
  enPapelera?: boolean;
  archivado?: boolean;
  tieneAdjuntos?: boolean;
  adjuntos?: CorreoAdjuntoItem[];
  adjuntosCount?: number;
  etiqueta?: string;
  prioridad?: 'ALTA' | 'NORMAL' | string;
  categoria?: string;
  tipo?: string;
}

export interface BUser {
  id: number;
  username?: string;
  correo?: string;
  fotoPerfil?: string;
  activo?: boolean;
  carrera?: string;
  grupo?: string;
  rol?: string;
}
