'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { userService } from '@/services/user.service';
import type { SocialUser } from '@/types';

function SuggestionCardSkeleton() {
  return (
    <div className="flex-none w-36 bg-[var(--bg-elevated)] rounded-2xl p-3 flex flex-col items-center gap-2 animate-pulse">
      <div className="size-14 rounded-full bg-[var(--border)]" />
      <div className="h-3 w-20 rounded bg-[var(--border)]" />
      <div className="h-2.5 w-14 rounded bg-[var(--border)]" />
      <div className="h-7 w-full rounded-full bg-[var(--border)]" />
    </div>
  );
}

interface CardProps {
  user: SocialUser;
  onDismiss: (id: number) => void;
}

function SuggestionCard({ user, onDismiss }: CardProps) {
  const [following, setFollowing] = useState(user.siguiendo);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await userService.toggleFollow(user.id);
      setFollowing(res.accion === 'siguiendo');
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex-none w-36 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-3 flex flex-col items-center gap-2">
      <button
        onClick={() => onDismiss(user.id)}
        aria-label="Descartar sugerencia"
        className="absolute top-2 right-2 size-5 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
      >
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>

      <Link href={`/profile/${user.id}`}>
        <Avatar src={user.avatarUrl} name={user.username} size="lg" className="hover:opacity-90 transition-opacity" />
      </Link>

      <div className="text-center min-w-0 w-full">
        <Link href={`/profile/${user.id}`} className="text-xs font-semibold text-[var(--text-primary)] truncate block hover:underline">{user.username}</Link>
        {user.mutuals > 0 ? (
          <p className="text-[10px] text-[var(--text-muted)] truncate">
            {user.mutuals} en común
          </p>
        ) : user.carrera ? (
          <p className="text-[10px] text-[var(--text-muted)] truncate">{user.carrera}</p>
        ) : null}
      </div>

      <button
        onClick={toggle}
        disabled={loading}
        className={`w-full text-xs font-semibold py-1.5 rounded-full transition-colors ${
          following
            ? 'bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]'
            : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
        } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
    </div>
  );
}

export function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<SocialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    userService.getSuggestions(0, 10)
      .then(r => setSuggestions(r.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function dismiss(id: number) {
    setDismissed(prev => new Set([...prev, id]));
  }

  const visible = suggestions.filter(u => !dismissed.has(u.id));

  if (!loading && visible.length === 0) return null;

  return (
    <div className="border-b border-[var(--border)] px-4 py-4">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Personas que quizás conozcas
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SuggestionCardSkeleton key={i} />)
          : visible.map(u => (
              <SuggestionCard key={u.id} user={u} onDismiss={dismiss} />
            ))}
      </div>
    </div>
  );
}
