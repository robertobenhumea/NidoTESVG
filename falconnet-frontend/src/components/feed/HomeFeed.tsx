'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useIntersection } from '@/hooks/useIntersection';
import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostCard } from '@/components/feed/CreatePostCard';
import { StoryBar } from '@/components/stories/StoryBar';
import { AvisoFeedCard } from '@/components/feed/AvisoFeedCard';
import { ReclutamientoFeedCard } from '@/components/feed/ReclutamientoFeedCard';
import { postService } from '@/services/post.service';
import { api } from '@/services/api';
import { resolveUrl, getAvisoImageCache } from '@/lib/utils';
import type { Post, Poll, ReclutamientoFeedItem } from '@/types';
import type { AvisoFeedItem } from '@/components/feed/AvisoFeedCard';

/* ─────────────────────────────────────────────
   Types for the merged feed
───────────────────────────────────────────── */
type FeedEntry =
  | { kind: 'post';           post:           Post;                  sortKey: number }
  | { kind: 'aviso';          aviso:          AvisoFeedItem;         sortKey: number }
  | { kind: 'reclutamiento';  reclutamiento:  ReclutamientoFeedItem; sortKey: number };

/* ─────────────────────────────────────────────
   Skeleton / empty / error UI
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export function HomeFeed() {
  const { user } = useAuth();
  const {
    posts, loading, loadingMore, hasMore, error,
    refresh, loadMore, prependPost, removePost,
    handleReact, handleCommentAdded,
  } = useFeed();

  const [polls,          setPolls]          = useState<Map<number, Poll>>(new Map());
  const [avisos,         setAvisos]         = useState<AvisoFeedItem[]>([]);
  const [reclutamientos, setReclutamientos] = useState<ReclutamientoFeedItem[]>([]);

  /* ── Fetch polls ── */
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
    } catch { /* polls are optional */ }
  }, []);

  /* ── Fetch avisos — separate backend resource, merged into feed ──
     Always resolve imagenUrl: the backend may return relative paths
     like "/imagenes/abc.jpg" which must be prefixed with the API base
     URL before being passed to PostMedia (which uses <img src>).     */
  const fetchAvisos = useCallback(async () => {
    try {
      const raw = await api.get<AvisoFeedItem[]>('/avisos');
      const imageCache = getAvisoImageCache();
      const resolved = (Array.isArray(raw) ? raw : []).map((a) => ({
        ...a,
        imagenUrl: resolveUrl(a.imagenUrl) ?? (a.id ? imageCache[String(a.id)] : undefined),
      }));
      setAvisos((prev) => {
        const prevMap = new Map(prev.map((a) => [a.id, a]));
        const serverIds = new Set(resolved.map((a) => a.id));
        const localOnly = prev.filter((a) => !serverIds.has(a.id));
        // Preserve any imagenUrl the client already has (optimistic or cached)
        // if the backend didn't return one.
        const merged = resolved.map((a) => ({
          ...a,
          imagenUrl: a.imagenUrl ?? prevMap.get(a.id)?.imagenUrl,
        }));
        return [...localOnly, ...merged];
      });
    } catch { /* fail silently — feed still works without avisos */ }
  }, []);

  /* ── Fetch reclutamientos ── */
  const fetchReclutamientos = useCallback(async () => {
    try {
      const raw = await api.get<ReclutamientoFeedItem[]>('/reclutamiento/activos');
      const resolved = (Array.isArray(raw) ? raw : []).map((r) => ({
        ...r,
        imagenUrl:        resolveUrl(r.imagenUrl),
        creadorAvatarUrl: resolveUrl(r.creadorAvatarUrl),
        habilidades:      Array.isArray(r.habilidades) ? r.habilidades : [],
      }));
      setReclutamientos((prev) => {
        const serverIds = new Set(resolved.map((r) => r.id));
        const localOnly = prev.filter((r) => !serverIds.has(r.id));
        return [...localOnly, ...resolved];
      });
    } catch { /* fail silently */ }
  }, []);

  useEffect(() => {
    fetchPolls();
    fetchAvisos();
    fetchReclutamientos();
  }, [fetchPolls, fetchAvisos, fetchReclutamientos]);

  /* ── Merge posts + avisos + reclutamientos, sorted newest-first ── */
  const feedItems = useMemo((): FeedEntry[] => {
    const avisoEntries: FeedEntry[] = avisos.map((a) => ({
      kind: 'aviso', aviso: a, sortKey: new Date(a.fecha).getTime(),
    }));
    const postEntries: FeedEntry[] = posts.map((p) => ({
      kind: 'post', post: p, sortKey: new Date(p.createdAt).getTime(),
    }));
    const reclutamientoEntries: FeedEntry[] = reclutamientos.map((r) => ({
      kind: 'reclutamiento', reclutamiento: r, sortKey: new Date(r.fecha).getTime(),
    }));
    return [...avisoEntries, ...postEntries, ...reclutamientoEntries]
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [avisos, posts, reclutamientos]);

  /* ── Poll vote handler ── */
  function handleVote(postId: number, opcionId: number, encuestaId: number) {
    setPolls((prev) => {
      const poll = prev.get(postId);
      if (!poll) return prev;
      const updated: Poll = {
        ...poll,
        miVoto:   opcionId,
        total:    poll.miVoto ? poll.total : poll.total + 1,
        opciones: poll.opciones.map((o) =>
          o.id === opcionId ? { ...o, votos: o.votos + 1 }
          : (poll.miVoto === o.id ? { ...o, votos: Math.max(0, o.votos - 1) } : o)
        ),
      };
      return new Map(prev).set(postId, updated);
    });
    api.post(`/encuestas/votar/${opcionId}`, { encuestaId }).catch(() => {
      fetchPolls();
    });
  }

  /* ── Post actions ── */
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

  /* ── Infinite scroll sentinel ── */
  const [sentinelRef, sentinelVisible] = useIntersection({ threshold: 0.1, rootMargin: '200px' });
  useEffect(() => {
    if (sentinelVisible && hasMore && !loadingMore) loadMore();
  }, [sentinelVisible, hasMore, loadingMore, loadMore]);

  /* ── Render ── */
  return (
    <div className="max-w-xl mx-auto px-3 py-4 space-y-3">

      {/* Stories */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] py-3 overflow-hidden shadow-sm">
        <StoryBar />
      </div>

      {/* Composer */}
      {user && (
        <CreatePostCard
          author={user}
          onSubmit={handleCreatePost}
          onPostCreated={prependPost}
          onPollCreated={fetchPolls}
          onAvisoCreated={(aviso) => {
            setAvisos((prev) => [aviso, ...prev.filter((a) => a.id !== aviso.id)]);
            fetchAvisos();
          }}
          onReclutamientoCreated={(item) => {
            setReclutamientos((prev) => [item, ...prev.filter((r) => r.id !== item.id)]);
            fetchReclutamientos();
          }}
        />
      )}

      {/* Feed */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : feedItems.length === 0 ? (
        <EmptyFeed />
      ) : (
        <>
          {feedItems.map((entry) =>
            entry.kind === 'aviso' ? (
              <AvisoFeedCard key={`aviso-${entry.aviso.id}`} aviso={entry.aviso} />
            ) : entry.kind === 'reclutamiento' ? (
              <ReclutamientoFeedCard
                key={`recl-${entry.reclutamiento.id}`}
                item={entry.reclutamiento}
                currentUserId={user?.id}
              />
            ) : (
              <PostCard
                key={`post-${entry.post.id}`}
                post={{ ...entry.post, poll: polls.get(entry.post.id) }}
                currentUserId={user?.id}
                onDelete={handleDeletePost}
                onReact={handleReact}
                onCommentAdded={handleCommentAdded}
                onVote={(opcionId, encuestaId) => handleVote(entry.post.id, opcionId, encuestaId)}
              />
            )
          )}

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
