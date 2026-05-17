import { api } from './api';
import type { ReactionType, BReactionType, BReactionToggleResponse } from '@/types';

const toBE = (r: ReactionType): BReactionType => r.toLowerCase() as BReactionType;
const toFE = (r: string): ReactionType => r.toUpperCase() as ReactionType;

export const reactionService = {
  async toggle(postId: number, type: ReactionType): Promise<BReactionToggleResponse> {
    return api.post<BReactionToggleResponse>(`/interacciones/like/${postId}`, {
      tipo: toBE(type),
    });
  },

  async getMyReactions(): Promise<Record<number, ReactionType>> {
    const raw = await api.get<Record<string, string>>('/interacciones/mis-reacciones');
    const result: Record<number, ReactionType> = {};
    for (const [id, tipo] of Object.entries(raw)) {
      result[Number(id)] = toFE(tipo);
    }
    return result;
  },

  async getAllCounts(): Promise<Record<number, number>> {
    const raw = await api.get<Record<string, Record<string, number>>>('/interacciones/reacciones-todos');
    const result: Record<number, number> = {};
    for (const [id, counts] of Object.entries(raw)) {
      result[Number(id)] = Object.values(counts).reduce((a, b) => a + b, 0);
    }
    return result;
  },
};
