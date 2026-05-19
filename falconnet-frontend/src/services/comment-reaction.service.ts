import { api } from './api';
import type { ReactionType, BComentarioReaccionResponse, BComentarioReaccionData } from '@/types';

// Maps frontend ReactionType → backend tipo
function toBE(r: ReactionType): string {
  const map: Record<ReactionType, string> = {
    LIKE:  'ME_GUSTA',
    LOVE:  'ME_ENCANTA',
    HAHA:  'ME_DIVIERTE',
    WOW:   'ME_SORPRENDE',
    SAD:   'ME_ENTRISTECE',
    ANGRY: 'ME_ENOJA',
  };
  return map[r];
}

// Maps backend tipo → frontend ReactionType
function toFE(tipo: string): ReactionType {
  const map: Record<string, ReactionType> = {
    ME_GUSTA:       'LIKE',
    ME_ENCANTA:     'LOVE',
    ME_DIVIERTE:    'HAHA',
    ME_SORPRENDE:   'WOW',
    ME_ENTRISTECE:  'SAD',
    ME_ENOJA:       'ANGRY',
  };
  return map[tipo] ?? 'LIKE';
}

export interface CommentReactionResult {
  accion: 'dado' | 'quitado' | 'cambiado';
  tipo?: ReactionType;
  reactionCount: number;
}

export interface CommentReactionData {
  reactionCount: number;
  userReaction?: ReactionType;
}

export const commentReactionService = {
  async toggle(commentId: number, type: ReactionType): Promise<CommentReactionResult> {
    const raw = await api.post<BComentarioReaccionResponse>(
      `/comentarios/${commentId}/reacciones`,
      { tipo: toBE(type) },
    );
    return {
      accion: raw.accion,
      tipo: raw.tipo ? toFE(raw.tipo) : undefined,
      reactionCount: raw.reactionCount,
    };
  },

  async remove(commentId: number): Promise<CommentReactionResult> {
    const raw = await api.delete<BComentarioReaccionResponse>(
      `/comentarios/${commentId}/reacciones`,
    );
    return {
      accion: raw.accion,
      tipo: raw.tipo ? toFE(raw.tipo) : undefined,
      reactionCount: raw.reactionCount,
    };
  },

  async get(commentId: number): Promise<CommentReactionData> {
    const raw = await api.get<BComentarioReaccionData>(
      `/comentarios/${commentId}/reacciones`,
    );
    return {
      reactionCount: raw.reactionCount,
      userReaction: raw.userReaction ? toFE(raw.userReaction) : undefined,
    };
  },

  async getBatch(commentIds: number[]): Promise<Record<number, CommentReactionData>> {
    if (commentIds.length === 0) return {};
    const raw = await api.get<Record<string, BComentarioReaccionData>>(
      `/comentarios/reacciones-batch?ids=${commentIds.join(',')}`,
    );
    const result: Record<number, CommentReactionData> = {};
    for (const [id, data] of Object.entries(raw)) {
      result[Number(id)] = {
        reactionCount: data.reactionCount,
        userReaction: data.userReaction ? toFE(data.userReaction) : undefined,
      };
    }
    return result;
  },
};
