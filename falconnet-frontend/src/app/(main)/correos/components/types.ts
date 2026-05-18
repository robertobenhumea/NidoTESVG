export type Tab = 'entrada' | 'enviados' | 'favoritos';
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
}

export interface BUser {
  id: number;
  username: string;
  fotoPerfil?: string;
}
