'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarModal } from '@/components/ui/AvatarModal';
import { PostCard } from '@/components/feed/PostCard';
import { ReclutamientoFeedCard } from '@/components/feed/ReclutamientoFeedCard';
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard';
import { MediaGrid } from '@/components/profile/MediaGrid';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ImageCropEditor } from '@/components/profile/ImageCropEditor';
import { userService } from '@/services/user.service';
import { postService } from '@/services/post.service';
import { marketplaceService } from '@/services/marketplace.service';
import { equipoService } from '@/services/equipo.service';
import { api } from '@/services/api';
import { HighlightCarousel } from '@/components/highlights/HighlightCarousel';
import { FollowListModal } from '@/components/social/FollowListModal';
import { SuggestionsPanel } from '@/components/social/SuggestionsPanel';
import { ComposeModal } from '@/app/(main)/correos/components/ComposeModal';
import type { User, Post, MarketplaceListing, ReclutamientoFeedItem } from '@/types';
import type { BUser } from '@/app/(main)/correos/components/types';

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

/* ── Main ProfileView ────────────────────────────────────────────── */

export function ProfileView({ userId: propUserId }: { userId?: number }) {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cropTarget, setCropTarget]   = useState<{ src: File | string; mode: 'avatar' | 'cover' } | null>(null);
  const [editOpen, setEditOpen]       = useState(false);
  const [avatarOpen, setAvatarOpen]   = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTab, setFollowListTab]   = useState<'seguidores' | 'siguiendo'>('seguidores');
  const [composeOpen, setComposeOpen]       = useState(false);
  const [error, setError]             = useState('');
  const avatarInputRef                = useRef<HTMLInputElement>(null);
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
            : equipoService.getActivos().then((all) => all.filter((e) => e.usuarioId === targetId)).catch(() => [] as ReclutamientoFeedItem[]),
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

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) return;
    e.target.value = '';
    setCropTarget({ src: file, mode: 'avatar' });
  }

  function handleAdjustAvatar() {
    setAvatarMenuOpen(false);
    if (profileUser?.avatarUrl) setCropTarget({ src: profileUser.avatarUrl, mode: 'avatar' });
    else avatarInputRef.current?.click();
  }

  async function handleCropSave(blob: Blob) {
    if (!cropTarget) return;
    const { mode } = cropTarget;
    setCropTarget(null);
    setPhotoUploading(true);
    try {
      const uploadFile = new File([blob], mode === 'avatar' ? 'avatar.jpg' : 'cover.jpg', { type: 'image/jpeg' });
      if (mode === 'avatar') {
        const updated = await userService.uploadAndSetAvatar(uploadFile);
        setProfileUser((prev) => prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev);
        updateUser({ avatarUrl: updated.avatarUrl });
      } else {
        const updated = await userService.uploadAndSetCover(uploadFile);
        setProfileUser((prev) => prev ? { ...prev, coverUrl: updated.coverUrl } : prev);
        updateUser({ coverUrl: updated.coverUrl });
      }
    } catch { /* ignore */ } finally {
      setPhotoUploading(false);
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

        </div>

        {/* ── PROFILE HEADER ──────────────────────────────────── */}
        <div className="px-4 relative">

          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-16 mb-3">
            {/* Avatar + dropdown menu wrapper */}
            <div className="relative shrink-0">
              <button
                onClick={() => isOwnProfile ? setAvatarMenuOpen(v => !v) : setAvatarOpen(true)}
                aria-label={isOwnProfile ? 'Opciones de foto de perfil' : `Ver foto de ${displayName}`}
                disabled={photoUploading}
                className="relative rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)] group disabled:opacity-70"
              >
                <div className="size-24 sm:size-32 rounded-full overflow-hidden ring-4 ring-[var(--bg-surface)]">
                  <Avatar
                    src={profileUser.avatarUrl}
                    name={displayName}
                    size="xl"
                    className="w-full h-full [&>div]:!w-full [&>div]:!h-full"
                  />
                </div>
                {profileUser.isOnline && !isOwnProfile && (
                  <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 size-4 sm:size-5 rounded-full bg-green-500 border-2 border-[var(--bg-surface)]" />
                )}
                {/* Dark overlay on hover (desktop) */}
                {isOwnProfile && (
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-black/55 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-0.5 pointer-events-none"
                  >
                    <svg className="size-6 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span className="text-[10px] font-semibold text-white leading-none tracking-wide">Editar</span>
                  </div>
                )}
                {/* Camera badge — always visible on mobile, fades out on desktop hover */}
                {isOwnProfile && (
                  <span
                    aria-hidden
                    className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 size-7 sm:size-8 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--bg-surface)] flex items-center justify-center shadow-md transition-opacity sm:group-hover:opacity-0"
                  >
                    <svg className="size-3.5 sm:size-4 text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </span>
                )}
              </button>

              {/* Avatar edit dropdown */}
              {isOwnProfile && avatarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAvatarMenuOpen(false)} />
                  <div className="absolute top-full mt-2 left-0 z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden min-w-[210px] animate-fade-in">
                    <div className="py-1.5">
                      <button
                        onClick={() => { setAvatarMenuOpen(false); avatarInputRef.current?.click(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <svg className="size-5 text-[var(--brand)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <div className="text-left">
                          <div className="font-medium">Cambiar foto</div>
                          <div className="text-xs text-[var(--text-muted)]">Subir nueva imagen</div>
                        </div>
                      </button>
                      {profileUser.avatarUrl && (
                        <button
                          onClick={handleAdjustAvatar}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          <svg className="size-5 text-[var(--brand)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 2 6 16 20 16"/>
                            <polyline points="4 8 18 8 18 22"/>
                          </svg>
                          <div className="text-left">
                            <div className="font-medium">Ajustar encuadre</div>
                            <div className="text-xs text-[var(--text-muted)]">Reposicionar y zoom</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Hidden avatar file input */}
              {isOwnProfile && (
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-1 shrink-0">
              {isOwnProfile ? (
                <button
                  onClick={() => setEditOpen(true)}
                  className="h-9 px-5 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Editar perfil
                </button>
              ) : (
                <>
                  {/* Follow */}
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`h-9 px-4 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 ${
                      stats.isFollowing
                        ? 'border border-[var(--border)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                        : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                    }`}
                  >
                    {followLoading ? (
                      <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                    ) : stats.isFollowing ? 'Siguiendo' : 'Seguir'}
                  </button>

                  {/* Message */}
                  <button
                    onClick={() => router.push(`/messages/${targetId}`)}
                    title="Enviar mensaje"
                    className="h-9 px-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
                  >
                    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-sm font-medium hidden sm:inline">Mensaje</span>
                  </button>

                  {/* Mail */}
                  <button
                    onClick={() => setComposeOpen(true)}
                    title="Enviar correo institucional"
                    className="h-9 px-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
                  >
                    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span className="text-sm font-medium hidden sm:inline">Correo</span>
                  </button>
                </>
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
              { label: 'Seguidores',    value: stats.followers, onClick: () => { setFollowListTab('seguidores'); setFollowListOpen(true); } },
              { label: 'Siguiendo',     value: stats.following, onClick: () => { setFollowListTab('siguiendo');  setFollowListOpen(true); } },
            ].map(({ label, value, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
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

        {/* ── SUGERENCIAS (solo perfil propio) ──────────────────── */}
        {isOwnProfile && <SuggestionsPanel />}

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

          {/* Multimedia — Instagram-style 3-col grid with lightbox */}
          {activeTab === 'multimedia' && (
            <div className="-mx-3">
              <MediaGrid posts={posts} currentUserId={currentUser?.id} />
            </div>
          )}

          {/* Equipos — full ReclutamientoFeedCard (same as feed) */}
          {activeTab === 'equipos' && (
            <div>
              {equipos.length === 0 ? (
                <EmptyState icon="🚀" text={isOwnProfile ? 'No tienes equipos activos' : 'Sin equipos públicos'} />
              ) : (
                <div className="space-y-3">
                  {equipos.map((eq) => (
                    <ReclutamientoFeedCard key={eq.id} item={eq} currentUserId={currentUser?.id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Marketplace — full MarketplaceCard (same as marketplace page) */}
          {activeTab === 'marketplace' && (
            <div>
              {listings.length === 0 ? (
                <EmptyState icon="🛍️" text={isOwnProfile ? 'No tienes publicaciones en el marketplace' : 'Sin artículos en venta'} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {listings.map((item) => (
                    <MarketplaceCard key={item.id} listing={item} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Avatar fullscreen modal — only for other people's profiles */}
      {!isOwnProfile && (
        <AvatarModal
          src={profileUser.avatarUrl}
          name={displayName}
          open={avatarOpen}
          onClose={() => setAvatarOpen(false)}
        />
      )}

      {/* Photo crop editor — avatar or cover */}
      {cropTarget && (
        <ImageCropEditor
          src={cropTarget.src}
          mode={cropTarget.mode}
          onSave={handleCropSave}
          onClose={() => setCropTarget(null)}
        />
      )}

      {/* Edit profile modal — only on own profile */}
      {isOwnProfile && profileUser && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profileUser={profileUser}
          onSaved={handleSaved}
        />
      )}

      {/* Followers / following modal */}
      {profileUser && (
        <FollowListModal
          open={followListOpen}
          onClose={() => setFollowListOpen(false)}
          userId={profileUser.id}
          initialTab={followListTab}
        />
      )}

      {/* Compose institutional mail to this user */}
      {!isOwnProfile && composeOpen && profileUser && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={() => setComposeOpen(false)}
          mode="compose"
          initialTo={[{
            id:         profileUser.id,
            username:   profileUser.displayName ?? profileUser.username,
            correo:     profileUser.email,
            fotoPerfil: profileUser.avatarUrl,
            carrera:    profileUser.carrera,
            grupo:      profileUser.grupo,
          } satisfies BUser]}
        />
      )}
    </>
  );
}
