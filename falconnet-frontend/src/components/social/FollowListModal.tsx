'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { userService } from '@/services/user.service';
import type { SocialUser } from '@/types';

type Tab = 'seguidores' | 'siguiendo';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number;
  initialTab?: Tab;
}

function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="size-10 rounded-full bg-[var(--bg-elevated)] shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-[var(--bg-elevated)]" />
        <div className="h-2.5 w-20 rounded bg-[var(--bg-elevated)]" />
      </div>
      <div className="h-8 w-20 rounded-full bg-[var(--bg-elevated)]" />
    </div>
  );
}

function UserRow({
  user,
  onFollowToggle,
  onClose,
}: {
  user: SocialUser;
  onFollowToggle: (id: number, nowFollowing: boolean) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(user.siguiendo);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await userService.toggleFollow(user.id);
      const nowFollowing = res.accion === 'siguiendo';
      setFollowing(nowFollowing);
      onFollowToggle(user.id, nowFollowing);
    } catch {
      /* silently ignore toggle errors */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Link
      href={`/profile/${user.id}`}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
    >
      <Avatar src={user.avatarUrl} name={user.username} size="md" className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.username}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {user.mutuals > 0
            ? `${user.mutuals} seguidor${user.mutuals !== 1 ? 'es' : ''} en común`
            : user.carrera ?? ''}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
          following
            ? 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:border-red-400 hover:text-red-400'
            : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
        } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
    </Link>
  );
}

export function FollowListModal({ open, onClose, userId, initialTab = 'seguidores' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [seguidores, setSeguidores] = useState<SocialUser[]>([]);
  const [siguiendo, setSiguiendo] = useState<SocialUser[]>([]);
  const [loadingS, setLoadingS] = useState(false);
  const [loadingF, setLoadingF] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingS(true);
    setLoadingF(true);
    userService.getFollowersList(userId).then(data => {
      if (!cancelled) { setSeguidores(data); setLoadingS(false); }
    }).catch(() => { if (!cancelled) setLoadingS(false); });
    userService.getFollowingList(userId).then(data => {
      if (!cancelled) { setSiguiendo(data); setLoadingF(false); }
    }).catch(() => { if (!cancelled) setLoadingF(false); });
    return () => { cancelled = true; };
  }, [open, userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function handleFollowToggle(id: number, nowFollowing: boolean) {
    const patch = (list: SocialUser[]) =>
      list.map(u => u.id === id ? { ...u, siguiendo: nowFollowing } : u);
    setSeguidores(patch);
    setSiguiendo(patch);
  }

  if (!open || !mounted) return null;

  const list = tab === 'seguidores' ? seguidores : siguiendo;
  const loading = tab === 'seguidores' ? loadingS : loadingF;
  const filtered = query
    ? list.filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
    : list;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={tab === 'seguidores' ? 'Seguidores' : 'Siguiendo'}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        className="relative w-full sm:max-w-md bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl rounded-t-3xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-0 shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Conexiones</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] mt-2 shrink-0">
          {(['seguidores', 'siguiendo'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuery(''); }}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${
                tab === t
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'seguidores'
                ? `Seguidores${seguidores.length > 0 ? ` (${seguidores.length})` : ''}`
                : `Siguiendo${siguiendo.length > 0 ? ` (${siguiendo.length})` : ''}`}
              {tab === t && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--brand)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <UserRowSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
              <svg className="size-12 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm">
                {query ? 'Sin resultados' : tab === 'seguidores' ? 'Sin seguidores aún' : 'No sigue a nadie aún'}
              </p>
            </div>
          ) : (
            filtered.map(u => (
              <UserRow key={u.id} user={u} onFollowToggle={handleFollowToggle} onClose={onClose} />
            ))
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
