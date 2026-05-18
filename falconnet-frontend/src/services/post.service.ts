import { api } from './api';
function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
import type { Post, User, BPublicacion, BFeedPage, BUser, ReactionType } from '@/types';
import { mapBUser } from '@/types';

function buildUserMap(users: BUser[]): Map<number, User> {
  return new Map(users.map((u) => [u.id, mapBUser(u)]));
}

function mapBPost(b: BPublicacion, userMap: Map<number, User>): Post {
  const author: User = userMap.get(b.usuarioId) ?? {
    id: b.usuarioId,
    username: `Usuario #${b.usuarioId}`,
    email: '',
  };
  return {
    id: b.id,
    author,
    content: b.contenido ?? '',
    imageUrl: resolveUrl(b.imagenUrl),
    createdAt: b.fecha,
    updatedAt: undefined,
    reactionCount: 0,
    commentCount: 0,
    userReaction: undefined,
    isAnnouncement: b.esAnuncio ?? false,
    expiresAt: b.expiresAt,
  };
}

async function safeGet<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise; } catch { return fallback; }
}

export const postService = {
  async getFeed(page = 0, size = 15): Promise<{ posts: Post[]; hasMore: boolean; page: number }> {
    const [feedData, users, myReactions, allReactions, allComments] = await Promise.all([
      api.get<BFeedPage>(`/publicaciones?page=${page}&size=${size}`),
      safeGet(api.get<BUser[]>('/usuarios'), [] as BUser[]),
      safeGet(api.get<Record<string, string>>('/interacciones/mis-reacciones'), {} as Record<string, string>),
      safeGet(api.get<Record<string, Record<string, number>>>('/interacciones/reacciones-todos'), {} as Record<string, Record<string, number>>),
      safeGet(api.get<Record<string, unknown[]>>('/interacciones/comentarios-todos'), {} as Record<string, unknown[]>),
    ]);

    const userMap = buildUserMap(users);

    const myRxMap: Record<number, ReactionType> = {};
    for (const [id, tipo] of Object.entries(myReactions)) {
      myRxMap[Number(id)] = tipo.toUpperCase() as ReactionType;
    }

    const rxCountMap: Record<number, number> = {};
    for (const [id, counts] of Object.entries(allReactions)) {
      rxCountMap[Number(id)] = Object.values(counts).reduce((a, b) => a + b, 0);
    }

    const cmtCountMap: Record<number, number> = {};
    for (const [id, arr] of Object.entries(allComments)) {
      cmtCountMap[Number(id)] = Array.isArray(arr) ? arr.length : 0;
    }

    const posts = feedData.content.map((p) => ({
      ...mapBPost(p, userMap),
      reactionCount: rxCountMap[p.id] ?? 0,
      commentCount: cmtCountMap[p.id] ?? 0,
      userReaction: myRxMap[p.id],
    }));

    return { posts, hasMore: feedData.hasMore, page: feedData.page };
  },

  async getUserPosts(userId: number): Promise<Post[]> {
    const [bPosts, users] = await Promise.all([
      api.get<BPublicacion[]>(`/publicaciones/usuario/${userId}`),
      api.get<BUser[]>('/usuarios'),
    ]);
    const userMap = buildUserMap(users);
    return bPosts.map((p) => mapBPost(p, userMap));
  },

  async createPost(payload: { content: string; imageUrl?: string }, author: User): Promise<Post> {
    const bPost = await api.post<BPublicacion>('/publicaciones', {
      contenido: payload.content,
      imagenUrl: payload.imageUrl,
    });
    return {
      id: bPost.id,
      author,
      content: bPost.contenido ?? '',
      imageUrl: bPost.imagenUrl ?? undefined,
      createdAt: bPost.fecha,
      updatedAt: undefined,
      reactionCount: 0,
      commentCount: 0,
    };
  },

  async deletePost(postId: number): Promise<void> {
    await api.delete(`/publicaciones/${postId}`);
  },

  async sharePost(postId: number, comentario?: string): Promise<void> {
    await api.post(`/publicaciones/compartir/${postId}`, comentario ? { comentario } : {});
  },
};
