'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { commentService } from '@/services/comment.service';
import { CommentReactionButton } from '@/components/feed/CommentReactionButton';
import { useAuth } from '@/hooks/useAuth';
import { timeAgo } from '@/lib/utils';
import type { Comment, ReactionType } from '@/types';

interface CommentSectionProps {
  postId: number;
  onCommentAdded: () => void;
}

function CommentSkeleton() {
  return (
    <div className="flex gap-2.5 px-4 py-2 animate-pulse">
      <div className="size-7 rounded-full bg-[var(--bg-elevated)] shrink-0" />
      <div className="h-8 flex-1 max-w-[75%] rounded-2xl rounded-tl-sm bg-[var(--bg-elevated)]" />
    </div>
  );
}

function CommentItem({ comment, currentUserId, onDelete }: {
  comment: Comment;
  currentUserId?: number;
  onDelete: (id: number) => void;
}) {
  const name = comment.author.displayName ?? comment.author.username;
  const isOwn = comment.author.id === currentUserId;

  return (
    <div className="flex gap-2.5 px-4 py-1.5 group">
      <Avatar src={comment.author.avatarUrl} name={name} size="xs" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="inline-block max-w-full bg-[var(--bg-elevated)] rounded-2xl rounded-tl-sm px-3 py-2">
          <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight mb-0.5 truncate">
            {name}
          </p>
          <p className="text-[13px] text-[var(--text-primary)] leading-snug break-words">
            {comment.content}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <time className="text-[10px] text-[var(--text-muted)]">
            {timeAgo(comment.createdAt)}
          </time>

          {/* Reaction button for this comment */}
          <CommentReactionButton
            commentId={comment.id}
            initialCount={comment.reactionCount ?? 0}
            initialReaction={comment.userReaction as ReactionType | undefined}
          />

          {isOwn && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-auto"
              aria-label="Eliminar comentario"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ postId, onCommentAdded }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments]   = useState<Comment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const listEndRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    commentService.list(postId)
      .then((data) => { if (!cancelled) { setComments(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function handleSend() {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const bComment = await commentService.add(postId, text);
      const newComment: Comment = {
        id: bComment.id,
        author: user,
        content: bComment.contenido,
        createdAt: bComment.fecha,
      };
      setComments((prev) => [...prev, newComment]);
      onCommentAdded();
      // Scroll to bottom
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: number) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    commentService.remove(commentId).catch(() => {
      // Optimistic removal — silently ignore errors
    });
  }

  return (
    <div className="border-t border-[var(--border)]">
      {/* Comment list */}
      <div className="max-h-64 overflow-y-auto py-1">
        {loading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-4 px-4">
            Sé el primero en comentar
          </p>
        ) : (
          <>
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={user?.id}
                onDelete={handleDelete}
              />
            ))}
            <div ref={listEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {user && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[var(--border)]">
          <Avatar
            src={user.avatarUrl}
            name={user.displayName ?? user.username}
            size="xs"
            className="shrink-0"
          />
          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-elevated)] rounded-full px-3.5 h-9 border border-transparent focus-within:border-[var(--border-focus)] transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Escribe un comentario…"
              maxLength={500}
              aria-label="Escribe un comentario"
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-w-0"
            />
            {input.trim() && (
              <button
                onClick={handleSend}
                disabled={sending}
                aria-label="Enviar"
                className="text-[var(--brand)] shrink-0 disabled:opacity-40 hover:text-[var(--brand-hover)] transition-colors"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
