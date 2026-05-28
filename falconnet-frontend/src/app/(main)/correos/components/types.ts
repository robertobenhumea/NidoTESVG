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
export type FilterType = 'all' | 'unread' | 'starred' | 'comunicados';

export interface UsuarioInstitucional {
  id: number;
  nombre: string;
  username?: string;
  correo?: string;
  fotoPerfil?: string;
  carrera?: string;
  semestre?: string;
  grupo?: string;
  matricula?: string;
  numeroControl?: string;
  rol?: string;
  rolLabel?: string;
  departamento?: string;
  facultad?: string;
  verificadoInstitucional?: boolean;
}

export interface CorreoAdjuntoItem {
  id: number;
  nombreArchivo: string;
  /** Secure download URL: /correos/adjuntos/{id}/descargar — requires JWT */
  downloadUrl: string;
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
  cuerpoHtml?: string;
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
  threadId?: number;
  parentId?: number;
  tipoAccion?: string;
  reenviadoDe?: number;
  replicasCount?: number;
  esComunicado?: boolean;
  audiencia?: string;
  audienciaCarrera?: string;
  audienciaGrupo?: string;
  /** True when the logged-in user is the sender (e.g. sent mail appearing in Favoritos). */
  esMio?: boolean;
}

export interface ThreadMessage {
  id: number;
  emisorId: number;
  asunto: string;
  cuerpo?: string;
  cuerpoHtml?: string;
  fecha: string;
  tipoAccion?: string;
  threadId?: number;
  parentId?: number;
  emisor?: UsuarioInstitucional;
  adjuntos?: CorreoAdjuntoItem[];
}

/** Paginated response returned by all bandeja endpoints */
export interface CorreoPageResponse {
  content: CorreoItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BUser {
  id: number;
  username?: string;
  correo?: string;
  fotoPerfil?: string;
  activo?: boolean;
  carrera?: string;
  grupo?: string;
  matricula?: string;
  numeroControl?: string;
  rol?: string;
  rolLabel?: string;
}

export interface GrupoInfo {
  nombre: string;
  totalEstudiantes: number;
}

export interface CarreraInfo {
  nombre: string;
  totalEstudiantes: number;
  totalDocentes: number;
  grupos: GrupoInfo[];
}

export interface AudienciaInfo {
  carreras: CarreraInfo[];
}

export interface BuzonOficialItem {
  id: number;
  nombre: string;
  alias: string;
  descripcion?: string;
  tipo: string;
  miembrosCount: number;
}
