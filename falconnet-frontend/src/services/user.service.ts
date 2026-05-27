import { api } from './api';
import { STORAGE_KEYS } from '@/lib/utils';
import { mapBUser } from '@/lib/userMapper';
import type { User, BUser, BFollowStatus, BFollowToggle, RawSocialUser, SocialUser } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function mapSocialUser(r: RawSocialUser): SocialUser {
  return {
    id: r.id,
    username: r.username,
    avatarUrl: resolveUrl(r.fotoPerfil),
    coverUrl: resolveUrl(r.fotoPortada),
    bio: r.bio ?? undefined,
    carrera: r.carrera ?? undefined,
    grupo: r.grupo ?? undefined,
    intereses: r.intereses ?? undefined,
    siguiendo: r.siguiendo,
    mutuals: r.mutuals,
    followerCount: r.totalSeguidores,
    score: r.score,
    interesesComunes: r.interesesComunes,
  };
}

async function uploadFile(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const form = new FormData();
  form.append('archivo', file);
  const res = await fetch(`${API_BASE}/imagenes/subir`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('No se pudo subir la imagen');
  const data = await res.json() as { url: string };
  const base = API_BASE.replace(/\/$/, '');
  return data.url.startsWith('http') ? data.url : `${base}${data.url.startsWith('/') ? data.url : `/${data.url}`}`;
}

export const userService = {
  async getMe(): Promise<User> {
    const b = await api.get<BUser>('/usuarios/me');
    return mapBUser(b);
  },

  async getUser(id: number): Promise<User> {
    const b = await api.get<BUser>(`/usuarios/${id}`);
    return mapBUser(b);
  },

  async updateProfile(payload: {
    username?: string;
    bio?: string;
    ciudad?: string;
    carrera?: string;
    grupo?: string;
  }): Promise<User> {
    const b = await api.put<BUser>('/usuarios/perfil', payload);
    return mapBUser(b);
  },

  async uploadAndSetAvatar(file: File): Promise<User> {
    const url = await uploadFile(file);
    const b = await api.put<BUser>('/usuarios/perfil/foto', { url });
    return mapBUser(b);
  },

  async uploadAndSetCover(file: File): Promise<User> {
    const url = await uploadFile(file);
    const b = await api.put<BUser>('/usuarios/perfil/portada', { url });
    return mapBUser(b);
  },

  async changePassword(actual: string, nueva: string): Promise<string> {
    const res = await api.put<{ token: string; nuevoToken: string }>('/usuarios/password', { actual, nueva });
    return res.token ?? res.nuevoToken;
  },

  async getFollowStatus(userId: number): Promise<BFollowStatus> {
    return api.get<BFollowStatus>(`/seguidores/estado/${userId}`);
  },

  async toggleFollow(userId: number): Promise<BFollowToggle> {
    return api.post<BFollowToggle>(`/seguidores/toggle/${userId}`);
  },

  async getFollowerCount(userId: number): Promise<number> {
    const data = await api.get<{ total: number }>(`/seguidores/${userId}/seguidores`);
    return data.total;
  },

  async getFollowingCount(userId: number): Promise<number> {
    const data = await api.get<{ total: number }>(`/seguidores/${userId}/siguiendo`);
    return data.total;
  },

  async getFollowersList(userId: number): Promise<SocialUser[]> {
    const data = await api.get<{ total: number; usuarios: RawSocialUser[] }>(
      `/seguidores/${userId}/lista-seguidores`,
      { suppressAuthExpiry: true },
    );
    return data.usuarios.map(mapSocialUser);
  },

  async getFollowingList(userId: number): Promise<SocialUser[]> {
    const data = await api.get<{ total: number; usuarios: RawSocialUser[] }>(
      `/seguidores/${userId}/lista-siguiendo`,
      { suppressAuthExpiry: true },
    );
    return data.usuarios.map(mapSocialUser);
  },

  async getSuggestions(page = 0, limit = 12): Promise<{ users: SocialUser[]; hasMore: boolean; total: number }> {
    const data = await api.get<{ sugerencias: RawSocialUser[]; hasMore: boolean; total: number }>(
      `/seguidores/sugerencias?page=${page}&limit=${limit}`,
      { suppressAuthExpiry: true },
    );
    return {
      users: data.sugerencias.map(mapSocialUser),
      hasMore: data.hasMore ?? false,
      total: data.total ?? 0,
    };
  },
};
