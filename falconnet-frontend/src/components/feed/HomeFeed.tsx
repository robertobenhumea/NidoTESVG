'use client';

import { useEffect, useState, useCallback } from 'react';
import { useIntersection } from '@/hooks/useIntersection';
import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostCard } from '@/components/feed/CreatePostCard';
import { StoryBar } from '@/components/stories/StoryBar';
import { postService } from '@/services/post.service';
import { api } from '@/services/api';
import type { Post, Poll } from '@/types';

function PostSkeleton() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-[var(--bg-elevated)] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-32 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3 w-20 rounded-full bg-[var(--bg-elevated)]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-3.5 w-4/5 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-3.5 w-3/5 rounded-full bg-[var(--bg-elevated)]" />
      </div>
      <div className="flex gap-1 pt-2 border-t border-[var(--border)]">
        <div className="flex-1 h-8 rounded-xl bg-[var(--bg-elevated)]" />
        <div className="flex-1 h-8 rounded-xl bg-[var(--bg-elevated)]" />
        <div className="flex-1 h-8 rounded-xl bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-10 text-center">
      <div className="text-4xl mb-3 select-none">📭</div>
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Sin publicaciones aún</p>
      <p className="text-xs text-[var(--text-muted)]">¡Sé el primero en publicar algo!</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-8 text-center">
      <div className="text-4xl mb-3 select-none">⚠️</div>
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Error al cargar el feed</p>
      <p className="text-xs text-[var(--text-muted)] mb-4">{message}</p>
      <button onClick={onRetry} className="text-sm font-medium text-[var(--brand)] hover:underline">
        Reintentar
      </button>
    </div>
  );
}

export function HomeFeed() {
  const { user } = useAuth();
  const {
    posts, loading, loadingMore, hasMore, error,
    refresh, loadMore, prependPost, removePost,
    handleReact, handleCommentAdded,
  } = useFeed();

  const [polls, setPolls] = useState<Map<number, Poll>>(new Map());

  const fetchPolls = useCallback(async () => {
    try {
      const [allPolls, myVotes] = await Promise.all([
        api.get<Record<string, { id: number; pregunta: string; opciones: { id: number; texto: string; votos: number }[]; total: number }>>('/encuestas/todas'),
        api.get<Record<string, number>>('/encuestas/mis-votos').catch(() => ({} as Record<string, number>)),
      ]);
      const map = new Map<number, Poll>();
      for (const [pubIdStr, enc] of Object.entries(allPolls)) {
        const pubId = Number(pubIdStr);
        map.set(pubId, {
          id:       enc.id,
          pregunta: enc.pregunta,
          opciones: enc.opciones,
          total:    enc.total,
          miVoto:   myVotes[String(enc.id)] as number | undefined,
        });
      }
      setPolls(map);
    } catch { /* polls are optional — fail silently */ }
  }, []);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  function handleVote(postId: number, opcionId: number, encuestaId: number) {
    // Optimistic update
    setPolls((prev) => {
      const poll = prev.get(postId);
      if (!poll) return prev;
      const updated: Poll = {
        ...poll,
        miVoto: opcionId,
        total: poll.miVoto ? poll.total : poll.total + 1,
        opciones: poll.opciones.map((o) =>
          o.id === opcionId ? { ...o, votos: o.votos + 1 }
          : (poll.miVoto === o.id ? { ...o, votos: Math.max(0, o.votos - 1) } : o)
        ),
      };
      return new Map(prev).set(postId, updated);
    });
    api.post(`/encuestas/votar/${opcionId}`, { encuestaId }).catch(() => {
      fetchPolls(); // revert on error
    });
  }

  const [sentinelRef, sentinelVisible] = useIntersection({ threshold: 0.1, rootMargin: '200px' });
  useEffect(() => {
    if (sentinelVisible && hasMore && !loadingMore) loadMore();
  }, [sentinelVisible, hasMore, loadingMore, loadMore]);

  async function handleCreatePost(content: string, imageUrl?: string): Promise<Post> {
    if (!user) throw new Error('No autenticado');
    return postService.createPost({ content, imageUrl }, user);
  }

  async function handleDeletePost(id: number) {
    try {
      await postService.deletePost(id);
      removePost(id);
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-xl mx-auto px-3 py-4 space-y-3">
      {/* Stories */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] py-3 overflow-hidden">
        <StoryBar />
      </div>

      {user && (
        <CreatePostCard
          author={user}
          onSubmit={handleCreatePost}
          onPostCreated={prependPost}
        />
      )}

      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{ ...post, poll: polls.get(post.id) }}
              currentUserId={user?.id}
              onDelete={handleDeletePost}
              onReact={handleReact}
              onCommentAdded={handleCommentAdded}
              onVote={(opcionId, encuestaId) => handleVote(post.id, opcionId, encuestaId)}
            />
          ))}

          <div ref={sentinelRef} className="h-4" aria-hidden />

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="size-6 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-[var(--text-muted)] py-4">
              Has llegado al final · FalconNet
            </p>
          )}
        </>
      )}
    </div>
  );
}
