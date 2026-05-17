import { api } from '@/services/api';
import type {
  BGroup, BGroupDetail, Group, GroupDetail, GroupMember, GroupPost,
} from '@/types';

function mapGroup(b: BGroup): Group {
  return {
    id:          b.id,
    name:        b.nombre,
    description: b.descripcion,
    type:        b.tipo,
    creatorId:   b.creadorId,
    createdAt:   b.fecha,
    memberCount: b.totalMiembros,
    myRole:      b.miRol === 'miembro' ? 'member' : b.miRol === 'admin' ? 'admin' : null,
    isMember:    b.soyMiembro,
  };
}

function mapGroupDetail(b: BGroupDetail): GroupDetail {
  const base = mapGroup(b);
  const members: GroupMember[] = b.miembros.map((m) => ({
    userId:    m.usuarioId,
    role:      m.rol === 'admin' ? 'admin' : 'member',
    joinedAt:  m.fecha,
    name:      m.nombre ?? `Usuario #${m.usuarioId}`,
    avatarUrl: m.fotoPerfil ?? undefined,
    career:    m.carrera ?? undefined,
  }));
  const posts: GroupPost[] = b.posts.map((p) => ({
    id:           p.id,
    content:      p.contenido,
    imageUrl:     p.imagenUrl,
    createdAt:    p.fecha,
    authorId:     p.usuarioId,
    authorName:   p.autorNombre ?? `Usuario #${p.usuarioId}`,
    authorAvatar: p.autorFoto ?? undefined,
  }));
  return { ...base, creatorName: b.creadorNombre, members, posts };
}

export const groupService = {
  async getGroups(): Promise<Group[]> {
    const data = await api.get<BGroup[]>('/grupos');
    return data.map(mapGroup);
  },

  async getGroup(id: number): Promise<GroupDetail> {
    const data = await api.get<BGroupDetail>(`/grupos/${id}`);
    return mapGroupDetail(data);
  },

  async create(payload: { nombre: string; descripcion?: string; tipo?: string }): Promise<Group> {
    const data = await api.post<BGroup>('/grupos', payload);
    return mapGroup(data);
  },

  async toggleJoin(id: number): Promise<{ action: 'joined' | 'left' }> {
    const data = await api.post<{ accion: string }>(`/grupos/${id}/unirse`, {});
    return { action: data.accion === 'unido' ? 'joined' : 'left' };
  },

  async publish(groupId: number, content: string, imageUrl?: string): Promise<GroupPost> {
    const body: Record<string, string> = { contenido: content };
    if (imageUrl) body.imagenUrl = imageUrl;
    const data = await api.post<{
      id: number; contenido?: string; imagenUrl?: string; fecha: string;
      usuarioId: number; autorNombre?: string; autorFoto?: string;
    }>(`/grupos/${groupId}/publicar`, body);
    return {
      id:           data.id,
      content:      data.contenido,
      imageUrl:     data.imagenUrl,
      createdAt:    data.fecha,
      authorId:     data.usuarioId,
      authorName:   data.autorNombre ?? 'Tú',
      authorAvatar: data.autorFoto ?? undefined,
    };
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/grupos/${id}`);
  },
};
