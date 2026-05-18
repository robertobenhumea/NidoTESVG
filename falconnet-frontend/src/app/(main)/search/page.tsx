'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { searchService } from '@/services/search.service';
import { userService } from '@/services/user.service';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchResult, SearchUser } from '@/types';

type Tab = 'all' | 'users' | 'posts' | 'groups';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',    label: 'Todo' },
  { id: 'users',  label: 'Personas' },
  { id: 'posts',  label: 'Publicaciones' },
  { id: 'groups', label: 'Comunidades' },
];

function UserRow({ user, onFollowToggle }: { user: SearchUser; onFollowToggle: (id: number, following: boolean) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const result = await userService.toggleFollow(user.id);
      onFollowToggle(user.id, result.accion === 'siguiendo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Link href={`/profile/${user.id}`} className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity">
      <Avatar src={user.avatarUrl} name={user.username} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.username}</p>
        {(user.career || user.group) && (
          <p className="text-xs text-[var(--text-muted)] truncate">{[user.career, user.group].filter(Boolean).join(' · ')}</p>
        )}
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 ${
          user.isFollowing
            ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
        }`}
      >
        {loading ? '…' : user.isFollowing ? 'Siguiendo' : 'Seguir'}
      </button>
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider py-2">{children}</p>;
}

export default function SearchPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const inputRef      = useRef<HTMLInputElement>(null);

  const [query, setQuery]     = useState(searchParams.get('q') ?? '');
  const [tab, setTab]         = useState<Tab>('all');
  const [result, setResult]   = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 350);

  const doSearch = useCallback(async (q: string) => {
    if (!q) { setResult(null); return; }
    setLoading(true);
    try {
      setResult(await searchService.search(q));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doSearch(debouncedQuery); }, [debouncedQuery, doSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleFollowToggle(userId: number, following: boolean) {
    setResult((r) =>
      r ? { ...r, users: r.users.map((u) => u.id === userId ? { ...u, isFollowing: following } : u) } : r,
    );
  }

  const total = result ? result.users.length + result.posts.length + result.groups.length : 0;
  const isEmpty = result && total === 0;

  const showUsers  = tab === 'all' || tab === 'users';
  const showPosts  = tab === 'all' || tab === 'posts';
  const showGroups = tab === 'all' || tab === 'groups';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search bar */}
      <div className="sticky top-[var(--nav-h)] bg-[var(--bg-base)]/90 backdrop-blur-md px-4 py-3 border-b border-[var(--border)] z-10 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar personas, posts, comunidades…"
            className="w-full h-10 pl-9 pr-10 rounded-xl text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" /><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        {debouncedQuery && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {t.label}
                {result && t.id !== 'all' && (
                  <span className="ml-1 text-[10px] opacity-70">
                    {t.id === 'users' ? result.users.length
                      : t.id === 'posts' ? result.posts.length
                      : result.groups.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2">
        {/* Empty query — hint */}
        {!debouncedQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Busca en FalconNet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Personas, publicaciones o comunidades</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="size-10 rounded-full bg-[var(--bg-elevated)] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded-full bg-[var(--bg-elevated)]" />
                  <div className="h-3 w-20 rounded-full bg-[var(--bg-elevated)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Sin resultados para "{debouncedQuery}"</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Prueba con otras palabras</p>
          </div>
        )}

        {/* Results */}
        {!loading && result && total > 0 && (
          <div className="space-y-1">
            {/* Users */}
            {showUsers && result.users.length > 0 && (
              <>
                {tab === 'all' && <SectionTitle>Personas</SectionTitle>}
                <div className="divide-y divide-[var(--border)]">
                  {result.users.map((u) => (
                    <UserRow key={u.id} user={u} onFollowToggle={handleFollowToggle} />
                  ))}
                </div>
              </>
            )}

            {/* Groups */}
            {showGroups && result.groups.length > 0 && (
              <>
                {tab === 'all' && <SectionTitle>Comunidades</SectionTitle>}
                <div className="space-y-2 py-2">
                  {result.groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/groups/${g.id}`}
                      className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity"
                    >
                      <div
                        className="size-10 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
                        style={{ background: `hsl(${(g.id * 47) % 360}, 60%, 45%)` }}
                      >
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{g.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {g.memberCount} miembro{g.memberCount !== 1 ? 's' : ''}
                          {g.description && ` · ${g.description}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Posts */}
            {showPosts && result.posts.length > 0 && (
              <>
                {tab === 'all' && <SectionTitle>Publicaciones</SectionTitle>}
                <div className="space-y-3 py-2">
                  {result.posts.map((p) => (
                    <div key={p.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-3">
                      <Link href={`/profile/${p.authorId}`} className="flex items-center gap-2 mb-2">
                        <Avatar src={p.authorAvatar} name={p.authorName ?? 'Usuario'} size="xs" />
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{p.authorName}</p>
                        <p className="text-xs text-[var(--text-muted)]">· {timeAgo(p.createdAt)}</p>
                      </Link>
                      {p.content && (
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed line-clamp-3">{p.content}</p>
                      )}
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" className="mt-2 rounded-xl w-full max-h-48 object-cover" loading="lazy" />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
