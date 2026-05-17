import { api } from './api';
import type { User, BUser, BFollowStatus, BFollowToggle } from '@/types';
import { mapBUser } from '@/types';

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
