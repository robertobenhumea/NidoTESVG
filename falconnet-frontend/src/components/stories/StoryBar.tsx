'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { StoryCreator } from '@/components/stories/StoryCreator';
import { storyService } from '@/services/story.service';
import { useAuth } from '@/hooks/useAuth';
import type { StoryGroup } from '@/types';

export function StoryBar() {
  const { user }                        = useAuth();
  const [groups, setGroups]             = useState<StoryGroup[]>([]);
  const [viewedIds, setViewedIds]       = useState<Set<number>>(new Set());
  const [viewerGroupIdx, setViewerIdx]  = useState<number | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const scrollRef                       = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await storyService.getActive();
      setGroups(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleGroupViewed(groupIndex: number, storyIndex: number) {
    const story = groups[groupIndex]?.stories[storyIndex];
    if (!story) return;
    setViewedIds((prev) => new Set([...prev, story.id]));
  }

  function handleDelete(storyId: number) {
    storyService.delete(storyId).catch(() => {});
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, stories: g.stories.filter((s) => s.id !== storyId) }))
        .filter((g) => g.stories.length > 0)
    );
  }

  const enrichedGroups: StoryGroup[] = groups.map((g) => ({
    ...g,
    allViewed: g.stories.every((s) => viewedIds.has(s.id)),
  }));

  const currentUserGroupIdx = enrichedGroups.findIndex((g) => g.user.id === user?.id);
  const orderedGroups: StoryGroup[] = currentUserGroupIdx > 0
    ? [enrichedGroups[currentUserGroupIdx], ...enrichedGroups.filter((_, i) => i !== currentUserGroupIdx)]
    : enrichedGroups;

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="flex gap-2.5 px-3 py-1.5 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 rounded-2xl bg-[var(--bg-elevated)] animate-pulse"
            style={{ width: 100, height: 168 }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-2.5 px-3 py-1.5 overflow-x-auto scrollbar-hide"
        aria-label="Historias"
      >
        {/* ── Create story card ── */}
        <button
          onClick={() => setCreateOpen(true)}
          className="relative shrink-0 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] group border border-[var(--border)] hover:border-[var(--brand)] transition-all select-none"
          style={{ width: 100, height: 168 }}
          aria-label="Crear historia"
        >
          {/* Avatar fills upper 64% */}
          <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: 108 }}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--brand)] to-purple-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white select-none">
                  {(user?.displayName ?? user?.username ?? '?')[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Bottom label */}
          <div
            className="absolute inset-x-0 bottom-0 bg-[var(--bg-surface)] flex items-end justify-center pb-4"
            style={{ top: 108 }}
          >
            <span className="text-[11px] font-semibold text-[var(--text-primary)] text-center leading-tight px-1.5">
              Crear historia
            </span>
          </div>

          {/* "+" badge at boundary */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: 92 }}>
            <div className="size-8 rounded-full bg-[var(--brand)] flex items-center justify-center ring-[3px] ring-[var(--bg-surface)] group-hover:scale-110 transition-transform">
              <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
        </button>

        {/* ── Story group cards ── */}
        {orderedGroups.map((group, i) => {
          const name       = group.user.displayName ?? group.user.username;
          const isViewed   = group.allViewed;
          const firstStory = group.stories[0];
          const bgImage    = firstStory?.imageUrl;
          const bgColor    = firstStory?.backgroundColor ?? '#1A1A2E';
          const totalViews = group.stories.reduce((sum, s) => sum + s.viewCount, 0);

          return (
            <button
              key={group.user.id}
              onClick={() => setViewerIdx(i)}
              className="relative shrink-0 rounded-2xl overflow-hidden select-none active:scale-95 transition-transform"
              style={{ width: 100, height: 168, backgroundColor: bgColor }}
              aria-label={`Historia de ${name}`}
            >
              {bgImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bgImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 38%, rgba(0,0,0,0.65) 100%)' }}
              />

              {/* Avatar ring */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2">
                <div
                  className="p-[3px] rounded-full"
                  style={{
                    background: isViewed
                      ? 'rgba(255,255,255,0.35)'
                      : 'linear-gradient(135deg, #6366f1, #ec4899)',
                  }}
                >
                  {group.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.user.avatarUrl}
                      alt={name}
                      className="w-9 h-9 rounded-full object-cover block"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-white select-none">
                        {name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name + views */}
              <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-3">
                <p className="text-white text-[11px] font-semibold leading-tight truncate drop-shadow-sm">
                  {name}
                </p>
                {totalViews > 0 && (
                  <p className="text-white/65 text-[10px] tabular-nums mt-0.5 drop-shadow-sm">
                    {totalViews.toLocaleString()} {totalViews === 1 ? 'vista' : 'vistas'}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Story Viewer ── */}
      {viewerGroupIdx !== null && (
        <StoryViewer
          groups={orderedGroups}
          initialGroupIndex={viewerGroupIdx}
          currentUserId={user?.id}
          onClose={() => setViewerIdx(null)}
          onGroupViewed={handleGroupViewed}
          onDelete={handleDelete}
        />
      )}

      {/* ── Story Creator ── */}
      {createOpen && (
        <StoryCreator
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); load(); }}
        />
      )}
    </>
  );
}
