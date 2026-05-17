import { api } from '@/services/api';
import type { BStory, BUser, Story, StoryGroup, User } from '@/types';
import { mapBUser } from '@/types';

function mapBStory(b: BStory, author: User): Story {
  return {
    id: b.id,
    author,
    imageUrl: b.imagenUrl ?? undefined,
    text: b.texto ?? undefined,
    backgroundColor: b.colorFondo ?? '#1A1A2E',
    createdAt: b.fecha,
    expiresAt: b.expiraEn,
    viewed: false,
    viewCount: b.vistas,
  };
}

export const storyService = {
  async getActive(): Promise<StoryGroup[]> {
    const [stories, users] = await Promise.all([
      api.get<BStory[]>('/stories/activas'),
      api.get<BUser[]>('/usuarios'),
    ]);

    const userMap = new Map<number, User>(users.map((u) => [u.id, mapBUser(u)]));
    const groupMap = new Map<number, Story[]>();

    for (const s of stories) {
      const author = userMap.get(s.usuarioId);
      if (!author) continue;
      if (!groupMap.has(s.usuarioId)) groupMap.set(s.usuarioId, []);
      groupMap.get(s.usuarioId)!.push(mapBStory(s, author));
    }

    return Array.from(groupMap.entries()).map(([userId, storyList]) => ({
      user: userMap.get(userId)!,
      stories: storyList,
      allViewed: false,
    }));
  },

  async create(data: { texto?: string; imagenUrl?: string; colorFondo?: string }): Promise<BStory> {
    return api.post<BStory>('/stories', data);
  },

  async markViewed(id: number): Promise<{ vistas: number }> {
    return api.post<{ vistas: number }>(`/stories/${id}/vista`, {});
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/stories/${id}`);
  },
};
