'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarModal } from '@/components/ui/AvatarModal';
import { PostCard } from '@/components/feed/PostCard';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { userService } from '@/services/user.service';
import { postService } from '@/services/post.service';
import { marketplaceService } from '@/services/marketplace.service';
import { equipoService } from '@/services/equipo.service';
import { api } from '@/services/api';
import { HighlightCarousel } from '@/components/highlights/HighlightCarousel';
import type { User, Post, MarketplaceListing, ReclutamientoFeedItem } from '@/types';

/* ── Types ──────────────────────────────────────────────────────── */

interface Insignia {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  tipo: string;
  fecha?: string;
}

interface ProfileStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

type ProfileTab = 'publicaciones' | 'multimedia' | 'equipos' | 'marketplace';

/* ── Skeleton ───────────────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      {/* Banner */}
      <div className="h-[200px] sm:h-[280px] bg-[var(--bg-elevated)]" />
      <div className="px-4 pb-4 relative">
        {/* Avatar */}
        <div className="absolute -top-12 left-4 size-24 sm:size-32 rounded-full ring-4 ring-[var(--bg-surface)] bg-[var(--bg-elevated)]" />
        <div className="flex justify-end pt-4 mb-14">
          <div className="h-9 w-28 rounded-xl bg-[var(--bg-elevated)]" />
        </div>
        <div className="space-y-2.5 mb-5">
          <div className="h-5 w-44 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3.5 w-28 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3.5 w-full rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3.5 w-3/4 rounded-full bg-[var(--bg-elevated)]" />
        </div>
        <div className="flex gap-8 py-3 border-y border-[var(--border)]">
          {['Publicaciones', 'Seguidores', 'Siguiendo'].map((l) => (
            <div key={l} className="flex flex-col items-center gap-1">
              <div className="h-5 w-8 rounded-full bg-[var(--bg-elevated)]" />
              <span className="text-xs text-[var(--text-muted)]">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────── */

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3 select-none">{icon}</span>
      <p className="text-sm text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

/* ── Profile tabs bar ───────────────────────────────────────────── */

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'publicaciones', label: 'Publicaciones' },
  { id: 'multimedia',    label: 'Multimedia' },
  { id: 'equipos',       label: 'Equipos' },
  { id: 'marketplace',   label: 'Marketplace' },
];

function ProfileTabBar({
  active,
  onChange,
}: {
  active: ProfileTab;
  onChange: (t: ProfileTab) => void;
}) {
  return (
    <div className="flex overflow-x-auto scrollbar-none border-b border-[var(--border)] px-1">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === id
              ? 'border-[var(--brand)] text-[var(--brand)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Marketplace mini-card ──────────────────────────────────────── */

function MarketplaceCard({ item }: { item: MarketplaceListing }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {item.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={item.imageUrl} alt={item.title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-[var(--bg-elevated)] flex items-center justify-center">
          <span className="text-3xl select-none">🛍️</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">{item.title}</p>
        <p className="text-base font-bold text-[var(--brand)] mt-1">${item.price.toLocaleString('es-MX')}</p>
        <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
          item.status === 'DISPONIBLE'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
        }`}>
          {item.status === 'DISPONIBLE' ? 'Disponible' : item.status === 'VENDIDO' ? 'Vendido' : 'Pausado'}
        </span>
      </div>
    </div>
  );
}

/* ── Equipo mini-card ───────────────────────────────────────────── */

function EquipoCard({ item }: { item: ReclutamientoFeedItem }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
          {item.nombreProyecto}
        </p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
          item.estado === 'ABIERTO'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
        }`}>
          {item.estado === 'ABIERTO' ? 'Abierto' : item.estado === 'COMPLETO' ? 'Completo' : 'Cerrado'}
        </span>
      </div>
      {item.descripcion && (
        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.descripcion}</p>
      )}
      {item.habilidades.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {item.habilidades.slice(0, 4).map((h) => (
            <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">
              {h}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-auto pt-1">
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {item.integrantesFaltantes} lugar{item.integrantesFaltantes !== 1 ? 'es' : ''} disponible{item.integrantesFaltantes !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

/* ── Main ProfileView ────────────────────────────────────────────── */

export function ProfileView({ userId: propUserId }: { userId?: number }) {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const queryId = propUserId ? String(propUserId) : searchParams.get('id');

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [listings, setListings]       = useState<MarketplaceListing[]>([]);
  const [equipos, setEquipos]         = useState<ReclutamientoFeedItem[]>([]);
  const [stats, setStats]             = useState<ProfileStats>({ followers: 0, following: 0, isFollowing: false });
  const [insignias, setInsignias]     = useState<Insignia[]>([]);
  const [activeTab, setActiveTab]     = useState<ProfileTab>('publicaciones');
  const [loading, setLoading]         = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [avatarOpen, setAvatarOpen]   = useState(false);
  const [error, setError]             = useState('');
  const coverInputRef                 = useRef<HTMLInputElement>(null);
  const { updateUser }                = useAuth();

  const targetId     = queryId ? Number(queryId) : currentUser?.id;
  const isOwnProfile = !queryId || queryId === String(currentUser?.id);

  const loadProfile = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    try {
      const [user, userPosts, followStatus, followersData, followingData, badges, userListings, userEquipos] =
        await Promise.all([
          isOwnProfile ? userService.getMe() : userService.getUser(targetId),
          postService.getUserPosts(targetId),
          !isOwnProfile ? userService.getFollowStatus(targetId) : Promise.resolve(null),
          userService.getFollowerCount(targetId),
          userService.getFollowingCount(targetId),
          api.get<Insignia[]>(`/insignias/usuario/${targetId}`).catch(() => [] as Insignia[]),
          marketplaceService.getListingsByUser(targetId).catch(() => [] as MarketplaceListing[]),
          isOwnProfile
            ? equipoService.getMios().catch(() => [] as ReclutamientoFeedItem[])
            : Promise.resolve([] as ReclutamientoFeedItem[]),
        ]);
      setProfileUser(user);
      setPosts(userPosts);
      setListings(userListings);
      setEquipos(userEquipos);
      setInsignias(badges);
      setStats({
        followers:   followersData,
        following:   followingData,
        isFollowing: followStatus?.siguiendo ?? false,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el perfil.');
    } finally {
      setLoading(false);
    }
  }, [targetId, isOwnProfile]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;
    e.target.value = '';
    setCoverUploading(true);
    try {
      const updated = await userService.uploadAndSetCover(file);
      setProfileUser((prev) => prev ? { ...prev, coverUrl: updated.coverUrl } : prev);
      updateUser({ coverUrl: updated.coverUrl });
    } catch { /* ignore */ } finally {
      setCoverUploading(false);
    }
  }

  async function handleFollow() {
    if (!targetId || isOwnProfile || followLoading) return;
    setFollowLoading(true);
    try {
      const result = await userService.toggleFollow(targetId);
      const nowFollowing = result.accion === 'siguiendo';
      setStats((s) => ({
        ...s,
        isFollowing: nowFollowing,
        followers: result.seguidores,
      }));
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  }

  function handleSaved(updated: User) {
    setProfileUser(updated);
  }

  if (loading) return <ProfileSkeleton />;

  if (error || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3 select-none">😕</div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {error || 'No se encontró el perfil'}
        </p>
      </div>
    );
  }

  const displayName = profileUser.displayName ?? profileUser.username;
  const mediaPosts  = posts.filter((p) => p.imageUrl);

  return (
    <>
      <div className="max-w-2xl mx-auto pb-8">

        {/* ── BANNER ────────────────────────────────────────────── */}
        <div className="relative h-[200px] sm:h-[280px] overflow-hidden bg-gradient-to-br from-blue-700 to-blue-400">
          {profileUser.coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profileUser.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
            />
          )}

          {isOwnProfile && (
            <>
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                aria-label="Cambiar foto de portada"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 text-white text-xs font-medium backdrop-blur-sm hover:bg-black/70 transition-colors disabled:opacity-50"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {coverUploading ? 'Subiendo…' : 'Cambiar portada'}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </>
          )}
        </div>

        {/* ── PROFILE HEADER ──────────────────────────────────── */}
        <div className="px-4 relative">

          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-16 mb-3">
            {/* Tappable avatar */}
            <button
              onClick={() => setAvatarOpen(true)}
              aria-label={`Ver foto de ${displayName}`}
              className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)] group"
            >
              {/* Wrapper controla el tamaño real — evita el mismatch con size="xl" (80px) */}
              <div className="size-24 sm:size-32 rounded-full overflow-hidden ring-4 ring-[var(--bg-surface)]">
                <Avatar
                  src={profileUser.avatarUrl}
                  name={displayName}
                  size="xl"
                  className="w-full h-full [&>div]:!w-full [&>div]:!h-full"
                />
              </div>
              {profileUser.isOnline && (
                <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 size-4 sm:size-5 rounded-full bg-green-500 border-2 border-[var(--bg-surface)]" />
              )}
            </button>

            {/* Action button */}
            <div className="flex gap-2 mb-1 shrink-0">
              {isOwnProfile ? (
                <button
                  onClick={() => setEditOpen(true)}
                  className="h-9 px-5 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Editar perfil
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`h-9 px-5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 ${
                    stats.isFollowing
                      ? 'border border-[var(--border)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                      : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                  }`}
                >
                  {followLoading ? (
                    <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                  ) : stats.isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </div>
          </div>

          {/* Name + username + meta */}
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {displayName}
              </h1>
              {profileUser.role && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] font-medium border border-[var(--brand)]/20">
                  {profileUser.role}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">@{profileUser.username}</p>

            {profileUser.bio && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed pt-0.5">
                {profileUser.bio}
              </p>
            )}

            {(profileUser.carrera || profileUser.grupo) && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] pt-0.5">
                <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{[profileUser.carrera, profileUser.grupo].filter(Boolean).join(' · ')}</span>
              </div>
            )}
          </div>

          {/* ── STATS ROW ─────────────────────────────────────── */}
          <div className="flex gap-6 py-3 border-y border-[var(--border)]">
            {[
              { label: 'Publicaciones', value: posts.length,    onClick: () => setActiveTab('publicaciones') },
              { label: 'Seguidores',    value: stats.followers, onClick: undefined },
              { label: 'Siguiendo',     value: stats.following, onClick: undefined },
            ].map(({ label, value, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`flex flex-col items-center gap-0.5 ${onClick ? 'hover:opacity-80 transition-opacity' : 'cursor-default'}`}
              >
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {value}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── HISTORIAS DESTACADAS ──────────────────────────────── */}
        {profileUser && (
          <HighlightCarousel
            usuarioId={profileUser.id}
            isOwner={isOwnProfile}
          />
        )}

        {/* ── INSIGNIAS ─────────────────────────────────────────── */}
        {insignias.length > 0 && (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Insignias</p>
            <div className="flex flex-wrap gap-2">
              {insignias.map((ins) => (
                <div
                  key={ins.id}
                  title={ins.descripcion}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]"
                >
                  <span className="text-base leading-none">{ins.icono}</span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{ins.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TABS ──────────────────────────────────────────────── */}
        <ProfileTabBar active={activeTab} onChange={setActiveTab} />

        {/* ── TAB CONTENT ───────────────────────────────────────── */}
        <div className="px-3 pt-3">

          {/* Publicaciones */}
          {activeTab === 'publicaciones' && (
            <div className="space-y-3">
              {posts.length === 0 ? (
                <EmptyState
                  icon="📝"
                  text={isOwnProfile ? 'Aún no tienes publicaciones' : 'Sin publicaciones aún'}
                />
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                  />
                ))
              )}
            </div>
          )}

          {/* Multimedia */}
          {activeTab === 'multimedia' && (
            <div>
              {mediaPosts.length === 0 ? (
                <EmptyState icon="🖼️" text="Sin fotos o videos aún" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mediaPosts.map((post) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={post.id}
                      src={post.imageUrl}
                      alt=""
                      className="w-full aspect-square object-cover rounded-xl bg-[var(--bg-elevated)]"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Equipos */}
          {activeTab === 'equipos' && (
            <div>
              {equipos.length === 0 ? (
                <EmptyState icon="🚀" text={isOwnProfile ? 'No tienes equipos activos' : 'Sin equipos públicos'} />
              ) : (
                <div className="space-y-3">
                  {equipos.map((eq) => (
                    <EquipoCard key={eq.id} item={eq} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Marketplace */}
          {activeTab === 'marketplace' && (
            <div>
              {listings.length === 0 ? (
                <EmptyState icon="🛍️" text={isOwnProfile ? 'No tienes publicaciones en el marketplace' : 'Sin artículos en venta'} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {listings.map((item) => (
                    <MarketplaceCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Avatar fullscreen modal */}
      <AvatarModal
        src={profileUser.avatarUrl}
        name={displayName}
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
      />

      {/* Edit profile modal — only on own profile */}
      {isOwnProfile && profileUser && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profileUser={profileUser}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
