'use client';

import { useState, useRef, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { User, Post } from '@/types';

interface CreatePostCardProps {
  author: User;
  onPostCreated: (post: Post) => void;
  onSubmit: (content: string) => Promise<Post>;
}

export function CreatePostCard({ author, onPostCreated, onSubmit }: CreatePostCardProps) {
  const [expanded, setExpanded]   = useState(false);
  const [content, setContent]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  const displayName = author.displayName ?? author.username;

  function expand() {
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancel() {
    setContent('');
    setError('');
    setExpanded(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError('');
    setLoading(true);
    try {
      const post = await onSubmit(content.trim());
      onPostCreated(post);
      setContent('');
      setExpanded(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al publicar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4">
      {!expanded ? (
        /* Collapsed state */
        <div className="flex items-center gap-3">
          <Avatar src={author.avatarUrl} name={displayName} size="md" />
          <button
            onClick={expand}
            className="flex-1 h-10 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] border border-[var(--border)] text-left px-4 text-sm text-[var(--text-muted)] transition-colors"
            aria-label="Crear publicación"
          >
            ¿Qué estás pensando, {author.displayName ?? author.username}?
          </button>
        </div>
      ) : (
        /* Expanded state */
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={author.avatarUrl} name={displayName} size="md" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                {displayName}
              </p>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué estás pensando?"
            rows={4}
            maxLength={2000}
            className="w-full resize-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[15px] leading-relaxed focus:outline-none mb-2"
          />

          {error && (
            <p className="text-sm text-red-500 mb-2">{error}</p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {content.length}/2000
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={loading}
                disabled={!content.trim()}
              >
                Publicar
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
