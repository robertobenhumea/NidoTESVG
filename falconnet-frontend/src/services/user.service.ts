import { api } from './api';
import { STORAGE_KEYS } from '@/lib/utils';
import type { User, BUser, BFollowStatus, BFollowToggle } from '@/types';
import { mapBUser } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

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
};
