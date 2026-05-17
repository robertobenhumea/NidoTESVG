'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarModal } from '@/components/ui/AvatarModal';
import { ReactionPicker } from '@/components/feed/ReactionPicker';
import { CommentSection } from '@/components/feed/CommentSection';
import { cn, timeAgo } from '@/lib/utils';
import { REACTIONS } from '@/lib/constants';
import { postService } from '@/services/post.service';
import type { Post, ReactionType } from '@/types';

interface PostCardProps {
  post: Post;
  onDelete?: (id: number) => void;
  onReact?: (postId: number, type: ReactionType) => void;
  onCommentAdded?: (postId: number) => void;
  currentUserId?: number;
}

function IcTrash() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}
function IcComment() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IcShare() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
    </svg>
  );
}
function IcThumbUp() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M7 10v12" strokeLinecap="round" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnnouncementCard({ post, currentUserId }: { post: Post; currentUserId?: number }) {
  const author = post.author;
  const displayName = author.displayName ?? author.username;
  const isOwn = currentUserId === author.id;

  return (
    <article
      className="rounded-2xl overflow-hidden border-2 border-amber-400/70 dark:border-amber-500/50"
      style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}
      aria-label={`Anuncio de ${displayName}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-amber-400 text-[#1A1A2E] rounded-full px-3 py-1">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            Anuncio
          </span>
          <span className="text-xs text-white/50">{timeAgo(post.createdAt)}</span>
        </div>
        {post.content && (
          <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap break-words mb-3">
            {post.content}
          </p>
        )}
        {post.imageUrl && <PostImage src={post.imageUrl} />}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <Avatar src={author.avatarUrl} name={displayName} size="xs" />
          <span className="text-xs text-white/60">{displayName}</span>
          {isOwn && (
            <span className="ml-auto text-xs text-white/40">Tu anuncio</span>
          )}
        </div>
      </div>
    </article>
  );
}

function PostImage({ src }: { src: string }) {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <div className="w-full bg-[var(--bg-elevated)] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Imagen de la publicación"
        onError={() => setError(true)}
        className="w-full max-h-[480px] object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

function getReaction(type?: ReactionType) {
  return REACTIONS.find((r) => r.type === type);
}

export function PostCard({ post, onDelete, onReact, onCommentAdded, currentUserId }: PostCardProps) {
  const author      = post.author;
  const displayName = author.displayName ?? author.username;
  const isOwn       = currentUserId === author.id;

  const [pickerOpen, setPicker]         = useState(false);
  const [commentsOpen, setComments]     = useState(false);
  const [avatarOpen, setAvatar]         = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareDone, setShareDone]       = useState(false);
  const holdRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHoldRef                      = useRef(false);

  function clearHold() {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  }

  // Touch: long-press shows picker; quick-tap toggles LIKE
  function onReactPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    didHoldRef.current = false;
    holdRef.current = setTimeout(() => {
      didHoldRef.current = true;
      holdRef.current = null;
      setPicker(true);
    }, 420);
  }

  function onReactPointerUp(e: React.PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (holdRef.current) {
      clearHold();
      if (!didHoldRef.current) onReact?.(post.id, 'LIKE');
    }
  }

  // Mouse: hover shows picker after delay; click toggles LIKE
  function onReactMouseEnter() {
    holdRef.current = setTimeout(() => { holdRef.current = null; setPicker(true); }, 500);
  }

  function onReactMouseLeave() {
    clearHold();
    // Don't close picker — pointer may be moving toward it
  }

  function onReactClick() {
    // Only fires for mouse (touch handled by pointerUp)
    clearHold();
    if (!pickerOpen) onReact?.(post.id, 'LIKE');
  }

  function onWrapperMouseLeave() {
    clearHold();
    setPicker(false);
  }

  function handlePickerSelect(type: ReactionType) {
    setPicker(false);
    onReact?.(post.id, type);
  }

  async function handleShare() {
    if (shareLoading || shareDone) return;
    setShareLoading(true);
    try {
      await postService.sharePost(post.id);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch { /* ignore */ } finally {
      setShareLoading(false);
    }
  }

  const activeRx = post.userReaction;
  const rxInfo   = getReaction(activeRx);

  if (post.isAnnouncement) {
    return (
      <AnnouncementCard post={post} currentUserId={currentUserId} />
    );
  }

  return (
    <>
      <article
        className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden"
        aria-label={`Publicación de ${displayName}`}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => setAvatar(true)}
            aria-label={`Ver foto de ${displayName}`}
            className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          >
            <Avatar src={author.avatarUrl} name={displayName} size="md" />
          </button>

          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${author.id}`}
              className="text-sm font-semibold text-[var(--text-primary)] hover:underline leading-tight block truncate"
            >
              {displayName}
            </Link>
            <time dateTime={post.createdAt} className="text-xs text-[var(--text-muted)]">
              {timeAgo(post.createdAt)}
            </time>
          </div>

          {isOwn && onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              aria-label="Eliminar publicación"
              className="size-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors"
            >
              <IcTrash />
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {post.content && (
          <p className="px-4 pb-3 text-[15px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
        )}

        {/* ── Image ── */}
        {post.imageUrl && <PostImage src={post.imageUrl} />}

        {/* ── Summary row (reactions/comments count) ── */}
        {(post.reactionCount > 0 || post.commentCount > 0) && (
          <div className="flex items-center justify-between px-4 py-1.5 text-xs text-[var(--text-muted)]">
            {post.reactionCount > 0 && (
              <span>
                {post.reactionCount} reacción{post.reactionCount !== 1 ? 'es' : ''}
              </span>
            )}
            {post.commentCount > 0 && (
              <button
                className="ml-auto hover:underline focus-visible:underline"
                onClick={() => setComments((v) => !v)}
              >
                {post.commentCount} comentario{post.commentCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* ── Actions bar ── */}
        <div className="flex items-center px-2 py-1 border-t border-[var(--border)]">

          {/* Reaction button wrapper — handles hover (desktop) */}
          <div
            className="relative flex-1"
            onMouseEnter={onReactMouseEnter}
            onMouseLeave={onWrapperMouseLeave}
          >
            <ReactionPicker
              open={pickerOpen}
              current={activeRx}
              onSelect={handlePickerSelect}
              onClose={() => setPicker(false)}
            />

            <button
              onPointerDown={onReactPointerDown}
              onPointerUp={onReactPointerUp}
              onPointerCancel={clearHold}
              onMouseEnter={onReactMouseEnter}
              onMouseLeave={onReactMouseLeave}
              onClick={onReactClick}
              aria-label={activeRx ? `${rxInfo?.label ?? 'Reacción'} (mantén para cambiar)` : 'Me gusta (mantén para más reacciones)'}
              aria-pressed={!!activeRx}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 select-none touch-none',
                activeRx
                  ? 'text-[var(--brand)] bg-[var(--brand-muted)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
              )}
            >
              {activeRx ? (
                <span className="text-base leading-none">{rxInfo?.emoji}</span>
              ) : (
                <IcThumbUp />
              )}
              <span>{activeRx ? rxInfo?.label : 'Me gusta'}</span>
            </button>
          </div>

          {/* Comment button */}
          <button
            onClick={() => setComments((v) => !v)}
            aria-label={`Comentarios · ${post.commentCount}`}
            aria-expanded={commentsOpen}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150',
              commentsOpen
                ? 'text-[var(--brand)] bg-[var(--brand-muted)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            <IcComment />
            {post.commentCount > 0 && (
              <span className="tabular-nums">{post.commentCount > 999 ? '999+' : post.commentCount}</span>
            )}
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            aria-label="Compartir publicación"
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150',
              shareDone
                ? 'text-green-500 bg-green-50 dark:bg-green-950/30'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            {shareDone ? (
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <IcShare />
            )}
          </button>
        </div>

        {/* ── Comments ── */}
        {commentsOpen && (
          <CommentSection
            postId={post.id}
            onCommentAdded={() => onCommentAdded?.(post.id)}
          />
        )}
      </article>

      {/* ── Avatar fullscreen modal ── */}
      <AvatarModal
        src={author.avatarUrl}
        name={displayName}
        open={avatarOpen}
        onClose={() => setAvatar(false)}
      />
    </>
  );
}
