'use client';

import { useState, useEffect, useCallback } from 'react';
import { postService } from '@/services/post.service';
import { reactionService } from '@/services/reaction.service';
import type { Post, ReactionType } from '@/types';

interface FeedState {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  page: number;
  refresh: () => void;
  loadMore: () => void;
  prependPost: (post: Post) => void;
  removePost: (id: number) => void;
  handleReact: (postId: number, type: ReactionType) => void;
  handleCommentAdded: (postId: number) => void;
}

export function useFeed(): FeedState {
  const [posts, setPosts]               = useState<Post[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(false);
  const [error, setError]               = useState('');
  const [page, setPage]                 = useState(0);

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      const result = await postService.getFeed(pageNum);
      setPosts((prev) => replace ? result.posts : [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el feed.');
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setError('');
    await fetchPage(0, true);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => { initialLoad(); }, [initialLoad]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchPage]);

  const prependPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const removePost = useCallback((id: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleReact = useCallback((postId: number, type: ReactionType) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const wasThis  = p.userReaction === type;
        const hadOther = !!p.userReaction && !wasThis;
        return {
          ...p,
          userReaction:  wasThis ? undefined : type,
          reactionCount: wasThis  ? Math.max(0, p.reactionCount - 1)
                       : hadOther ? p.reactionCount           // swapped type, same total
                       :            p.reactionCount + 1,
        };
      }),
    );
    // Fire and forget — minor inconsistency on error is acceptable
    reactionService.toggle(postId, type).catch(() => {});
  }, []);

  const handleCommentAdded = useCallback((postId: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
      ),
    );
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    page,
    refresh: initialLoad,
    loadMore,
    prependPost,
    removePost,
    handleReact,
    handleCommentAdded,
  };
}
