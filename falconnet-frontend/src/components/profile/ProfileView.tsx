'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarModal } from '@/components/ui/AvatarModal';
import { PostCard } from '@/components/feed/PostCard';
import { userService } from '@/services/user.service';
import { postService } from '@/services/post.service';
import type { User, Post } from '@/types';

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="h-40 bg-[var(--bg-elevated)] rounded-b-2xl" />
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="size-20 rounded-full ring-4 ring-[var(--bg-surface)] bg-[var(--bg-elevated)]" />
          <div className="h-9 w-24 rounded-xl bg-[var(--bg-elevated)] mb-1" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-5 w-40 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3.5 w-24 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3.5 w-full rounded-full bg-[var(--bg-elevated)]" />
        </div>
        <div className="flex gap-6 py-3 border-y border-[var(--border)]">
          {['Publicaciones', 'Seguidores', 'Siguiendo'].map((l) => (
            <div key={l} className="flex flex-col items-center gap-0.5">
              <div className="h-5 w-8 rounded-full bg-[var(--bg-elevated)]" />
              <span className="text-xs text-[var(--text-muted)]">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProfileStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

export function ProfileView() {
  const { user: currentUser } = useAuth();
  const searchParams           = useSearchParams();
  const queryId                = searchParams.get('id');

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [stats, setStats]             = useState<ProfileStats>({ followers: 0, following: 0, isFollowing: false });
  const [loading, setLoading]         = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError]             = useState('');
  const [avatarOpen, setAvatarOpen]   = useState(false);

  const targetId    = queryId ? Number(queryId) : currentUser?.id;
  const isOwnProfile = !queryId || queryId === String(currentUser?.id);

  const loadProfile = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    try {
      const [user, userPosts, followStatus, followersData, followingData] = await Promise.all([
        isOwnProfile ? userService.getMe() : userService.getUser(targetId),
        postService.getUserPosts(targetId),
        !isOwnProfile ? userService.getFollowStatus(targetId) : Promise.resolve(null),
        userService.getFollowerCount(targetId),
        userService.getFollowingCount(targetId),
      ]);
      setProfileUser(user);
      setPosts(userPosts);
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
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        <div className="h-40 rounded-b-2xl overflow-hidden">
          {profileUser.coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={profileUser.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--brand-muted)] to-[var(--brand)]" />
          )}
        </div>

        {/* Profile header */}
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-10 mb-4">
            {/* Tappable avatar */}
            <button
              onClick={() => setAvatarOpen(true)}
              aria-label={`Ver foto de ${displayName}`}
              className="rounded-full ring-4 ring-[var(--bg-surface)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            >
              <Avatar src={profileUser.avatarUrl} name={displayName} size="xl" />
            </button>

            {/* Action button */}
            <div className="mb-1">
              {isOwnProfile ? (
                <button className="h-9 px-5 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors">
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
                  {stats.isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </div>
          </div>

          {/* Name + username + bio */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
              {displayName}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">@{profileUser.username}</p>
            {(profileUser.grupo || profileUser.carrera) && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {[profileUser.carrera, profileUser.grupo].filter(Boolean).join(' · ')}
              </p>
            )}
            {profileUser.bio && (
              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                {profileUser.bio}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 py-3 border-y border-[var(--border)]">
            {[
              { label: 'Publicaciones', value: posts.length },
              { label: 'Seguidores',    value: stats.followers },
              { label: 'Siguiendo',     value: stats.following },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {value}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="px-3 pb-8 space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2 select-none">📝</div>
              <p className="text-sm text-[var(--text-muted)]">
                {isOwnProfile ? 'Aún no tienes publicaciones' : 'Sin publicaciones aún'}
              </p>
            </div>
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
      </div>

      {/* Avatar fullscreen modal */}
      <AvatarModal
        src={profileUser.avatarUrl}
        name={displayName}
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
      />
    </>
  );
}
