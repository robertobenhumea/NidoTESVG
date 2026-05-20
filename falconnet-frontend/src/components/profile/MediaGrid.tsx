'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PostCard } from '@/components/feed/PostCard';
import type { Post } from '@/types';

/* ── Individual grid cell ──────────────────────────────────────── */

function MediaCell({
  post,
  onClick,
}: {
  post: Post;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);
  const src = post.imageUrl!;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Ver publicación"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative aspect-square overflow-hidden cursor-pointer group bg-[var(--bg-elevated)]"
    >
      {/* Skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-[var(--bg-elevated)]" />
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}

      {/* Image */}
      {!error && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease, transform 0.3s ease' }}
          draggable={false}
        />
      )}

      {/* Hover overlay — reactions + comments */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors duration-200 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100"
      >
        <span className="flex items-center gap-1.5 text-white text-sm font-bold drop-shadow">
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {post.reactionCount}
        </span>
        <span className="flex items-center gap-1.5 text-white text-sm font-bold drop-shadow">
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {post.commentCount}
        </span>
      </div>
    </div>
  );
}

/* ── Post lightbox ─────────────────────────────────────────────── */

function PostLightbox({
  post,
  currentUserId,
  onClose,
}: {
  post: Post;
  currentUserId?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-3 right-3 z-10 size-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Card container */}
      <div
        className="w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[90dvh] overflow-y-auto sm:rounded-2xl bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <PostCard post={post} currentUserId={currentUserId} />
      </div>
    </div>,
    document.body,
  );
}

/* ── Empty state ────────────────────────────────────────────────── */

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="size-14 text-[var(--text-muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p className="text-sm font-medium text-[var(--text-muted)]">Sin fotos o videos aún</p>
    </div>
  );
}

/* ── MediaGrid — exported ────────────────────────────────────────── */

interface Props {
  posts: Post[];
  currentUserId?: number;
}

export function MediaGrid({ posts, currentUserId }: Props) {
  const [lightboxPost, setLightboxPost] = useState<Post | null>(null);

  const mediaPosts = posts.filter((p) => p.imageUrl);

  if (mediaPosts.length === 0) return <Empty />;

  return (
    <>
      {/* Grid — 3 columns with 1px gap (Instagram-style) */}
      <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
        {mediaPosts.map((post) => (
          <MediaCell
            key={post.id}
            post={post}
            onClick={() => setLightboxPost(post)}
          />
        ))}
      </div>

      {lightboxPost && (
        <PostLightbox
          post={lightboxPost}
          currentUserId={currentUserId}
          onClose={() => setLightboxPost(null)}
        />
      )}
    </>
  );
}
