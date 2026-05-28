'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { userService } from '@/services/user.service';
import type { SocialUser } from '@/types';

/* ── Skeleton ─────────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="flex-none w-[176px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl px-4 pt-6 pb-5 flex flex-col items-center gap-3 animate-pulse">
      <div className="w-[108px] h-[108px] rounded-full bg-[var(--bg-elevated)]" />
      <div className="w-full flex flex-col items-center gap-2 mt-1">
        <div className="h-3.5 w-28 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-2.5 w-22 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-4 w-24 rounded-full bg-[var(--bg-elevated)]" />
      </div>
      <div className="w-full h-9 rounded-full bg-[var(--bg-elevated)] mt-1" />
    </div>
  );
}

/* ── Person card ──────────────────────────────────────────────── */

interface CardProps {
  user: SocialUser;
  onDismiss: (id: number) => void;
}

function PersonCard({ user, onDismiss }: CardProps) {
  const [following, setFollowing] = useState(user.siguiendo);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
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

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    setDismissed(true);
    setTimeout(() => onDismiss(user.id), 200);
  }

  /* Context reason — one line max */
  const contextLine =
    user.mutuals > 0
      ? `${user.mutuals} seguidor${user.mutuals !== 1 ? 'es' : ''} en común`
      : user.interesesComunes && user.interesesComunes.length > 0
        ? user.interesesComunes[0]
        : user.carrera ?? user.grupo ?? '';

  return (
    <div
      className={`relative flex-none w-[176px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl px-4 pt-6 pb-5 flex flex-col items-center gap-0 transition-all duration-200 ${
        dismissed
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'hover:shadow-xl hover:shadow-black/[0.08] hover:-translate-y-1 hover:border-[var(--border)]'
      }`}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Descartar"
        className="absolute top-3 right-3 size-6 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* ── Avatar ── 108 px, gradient ring on hover ── */}
      <Link href={`/profile/${user.id}`} className="group relative shrink-0 mb-3" tabIndex={-1} aria-hidden>
        {/* Ring layers: static subtle + hover vivid */}
        <span
          aria-hidden
          className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[var(--brand)] via-violet-500 to-pink-500 opacity-20 group-hover:opacity-100 transition-opacity duration-300"
        />
        <span
          aria-hidden
          className="absolute -inset-[2px] rounded-full bg-[var(--bg-surface)]"
        />
        {/* Avatar — 108 px via wrapper + fill override */}
        <span className="relative block w-[108px] h-[108px] rounded-full overflow-hidden">
          <Avatar
            src={user.avatarUrl}
            name={user.username}
            size="xl"
            className="!w-full !h-full [&>div]:!w-full [&>div]:!h-full"
          />
        </span>
        {/* Popular badge */}
        {user.followerCount > 50 && (
          <span className="absolute bottom-0.5 right-0.5 size-5 bg-[var(--brand)] rounded-full flex items-center justify-center ring-2 ring-[var(--bg-surface)] z-10">
            <svg className="size-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        )}
      </Link>

      {/* Name */}
      <Link
        href={`/profile/${user.id}`}
        className="text-[13px] font-bold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors leading-snug text-center w-full truncate px-1"
      >
        {user.username}
      </Link>

      {/* Carrera */}
      {user.carrera && (
        <p className="text-[11px] text-[var(--text-muted)] text-center w-full truncate px-1 mt-0.5 leading-tight">
          {user.carrera}
        </p>
      )}

      {/* Context — mutuals / interés / grupo */}
      {contextLine && (
        <p className="text-[11px] text-[var(--text-muted)] text-center w-full truncate px-1 mt-0.5 leading-tight">
          {contextLine}
        </p>
      )}

      {/* Follower count */}
      {user.followerCount > 0 && (
        <p className="text-[10px] text-[var(--text-muted)]/70 text-center mt-0.5">
          {user.followerCount.toLocaleString()} {user.followerCount === 1 ? 'seguidor' : 'seguidores'}
        </p>
      )}

      {/* ── Follow button — full width pill ── */}
      <button
        onClick={toggle}
        disabled={loading}
        className={`w-full mt-4 py-[9px] rounded-full text-[13px] font-semibold transition-all duration-150 ${
          following
            ? 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:border-red-400 hover:text-red-400'
            : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] active:scale-[0.97] shadow-sm shadow-[var(--brand)]/30'
        } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {loading ? (
          <span className="inline-flex justify-center">
            <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          </span>
        ) : following ? 'Siguiendo' : 'Seguir'}
      </button>

      {/* Ver perfil — subtle link */}
      <Link
        href={`/profile/${user.id}`}
        className="mt-2 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        Ver perfil
      </Link>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export function PeopleYouMayKnow() {
  const [users, setUsers]       = useState<SocialUser[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]         = useState(0);
  const [hasMore, setHasMore]   = useState(false);
  const [total, setTotal]       = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    if (p === 0) setLoading(true); else setLoadingMore(true);
    try {
      const res = await userService.getSuggestions(p, 12);
      setUsers(prev => append ? [...prev, ...res.users] : res.users);
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPage(p);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchPage(0, false); }, [fetchPage]);

  function dismiss(id: number) {
    setDismissed(prev => new Set([...prev, id]));
  }

  function handleLoadMore() {
    fetchPage(page + 1, true);
  }

  function handleRefresh() {
    setDismissed(new Set());
    fetchPage(0, false);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }

  const visible = users.filter(u => !dismissed.has(u.id));

  if (!loading && visible.length === 0 && !hasMore) return null;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Personas que quizás conozcas</h3>
          {!loading && total > 0 && (
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{total} sugerencias · TESVG</p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          aria-label="Actualizar sugerencias"
          disabled={loading}
          className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          <svg
            className={`size-4 transition-transform ${loading ? 'animate-spin' : 'hover:rotate-180 duration-300'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1 scrollbar-hide scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            {visible.map(u => (
              <div key={u.id} className="relative">
                <PersonCard user={u} onDismiss={dismiss} />
              </div>
            ))}

            {/* Load more card */}
            {hasMore && (
              <div className="flex-none w-[176px] flex flex-col items-center justify-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] border-dashed rounded-3xl p-5">
                {loadingMore ? (
                  <div className="size-8 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
                ) : (
                  <>
                    <div className="size-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                      <svg className="size-5 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 11v6M20 14h6" />
                      </svg>
                    </div>
                    <button
                      onClick={handleLoadMore}
                      className="text-xs font-semibold text-[var(--brand)] hover:underline text-center leading-tight"
                    >
                      Ver más personas
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
