import { api } from '@/services/api';
import type { BStory, BUser, Story, StoryGroup, User } from '@/types';
import { mapBUser } from '@/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function mapBStory(b: BStory, author: User): Story {
  return {
    id:              b.id,
    author,
    imageUrl:        resolveUrl(b.imagenUrl),
    text:            b.texto ?? undefined,
    backgroundColor: b.colorFondo ?? '#1A1A2E',
    createdAt:       b.fecha,
    expiresAt:       b.expiraEn,
    viewed:          false,
    viewCount:       b.vistas,
  };
}

export const storyService = {
  async getActive(): Promise<StoryGroup[]> {
    const [stories, users] = await Promise.all([
      api.get<BStory[]>('/stories/activas'),
      api.get<BUser[]>('/usuarios'),
    ]);

    const userMap  = new Map<number, User>(users.map((u) => [u.id, mapBUser(u)]));
    const groupMap = new Map<number, Story[]>();

    for (const s of stories) {
      const author = userMap.get(s.usuarioId);
      if (!author) continue;
      if (!groupMap.has(s.usuarioId)) groupMap.set(s.usuarioId, []);
      groupMap.get(s.usuarioId)!.push(mapBStory(s, author));
    }

    return Array.from(groupMap.entries()).map(([userId, storyList]) => ({
      user:       userMap.get(userId)!,
      stories:    storyList,
      allViewed:  false,
    }));
  },

  async create(data: { texto?: string; imagenUrl?: string; colorFondo?: string }): Promise<BStory> {
    return api.post<BStory>('/stories', data);
  },

  async uploadImage(file: File): Promise<string> {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('falconnet_token')
      : null;
    const form = new FormData();
    form.append('archivo', file);
    const res = await fetch(`${API_BASE}/imagenes/subir`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    });
    if (!res.ok) throw new Error('No se pudo subir la imagen');
    const { url } = await res.json() as { url: string };
    return resolveUrl(url) ?? url;
  },

  async markViewed(id: number): Promise<{ vistas: number }> {
    return api.post<{ vistas: number }>(`/stories/${id}/vista`, {});
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/stories/${id}`);
  },
};
