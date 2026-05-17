import { api } from '@/services/api';
import type {
  BSearchResult, SearchResult, SearchUser, SearchPost, SearchGroup,
} from '@/types';

function mapSearchResult(b: BSearchResult): SearchResult {
  const users: SearchUser[] = b.usuarios.map((u) => ({
    id:          u.id,
    username:    u.username,
    career:      u.carrera,
    group:       u.grupo,
    avatarUrl:   u.fotoPerfil,
    isFollowing: u.siguiendo,
  }));

  const posts: SearchPost[] = b.publicaciones.map((p) => ({
    id:           p.id,
    content:      p.contenido,
    createdAt:    p.fecha,
    authorId:     p.usuarioId,
    imageUrl:     p.imagenUrl,
    authorName:   p.autorNombre,
    authorAvatar: p.autorFoto,
  }));

  const groups: SearchGroup[] = b.grupos.map((g) => ({
    id:          g.id,
    name:        g.nombre,
    description: g.descripcion,
    type:        g.tipo,
    memberCount: g.miembros,
  }));

  return { users, posts, groups };
}

export const searchService = {
  async search(query: string): Promise<SearchResult> {
    const data = await api.get<BSearchResult>(`/buscar?q=${encodeURIComponent(query)}`);
    return mapSearchResult(data);
  },
};
