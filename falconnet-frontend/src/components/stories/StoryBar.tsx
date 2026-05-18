'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { StoryCreator } from '@/components/stories/StoryCreator';
import { storyService } from '@/services/story.service';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import type { StoryGroup, User } from '@/types';

const CARD_W     = 104;
const CARD_H     = 178;
const SCROLL_STEP = 340; // ~3 cards + gaps

/* ─────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────── */
function StorySkeleton() {
  return (
    <div
      className="shrink-0 rounded-2xl bg-[var(--bg-elevated)] animate-pulse"
      style={{ width: CARD_W, height: CARD_H }}
    />
  );
}

/* ─────────────────────────────────────────────
   Create-story card
───────────────────────────────────────────── */
function CreateStoryCard({ user, onClick }: { user: User; onClick: () => void }) {
  const name   = user.displayName ?? user.username;
  const splitH = Math.round(CARD_H * 0.62);

  return (
    <button
      onClick={onClick}
      className="relative shrink-0 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] group hover:border-[var(--brand)] hover:shadow-lg hover:shadow-black/20 active:scale-[0.97] transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      style={{ width: CARD_W, height: CARD_H }}
      aria-label="Crear historia"
    >
      {/* Upper area — avatar or gradient */}
      <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: splitH }}>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #7c3aed 100%)' }}
          >
            <span className="text-2xl font-black text-white select-none">
              {getInitials(name)}
            </span>
          </div>
        )}
        {/* Fade into lower section */}
        <div
          className="absolute inset-x-0 bottom-0 h-9 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-surface))' }}
        />
      </div>

      {/* Lower label */}
      <div
        className="absolute inset-x-0 bottom-0 bg-[var(--bg-surface)] flex items-end justify-center pb-3.5"
        style={{ top: splitH }}
      >
        <span className="text-[11px] font-semibold text-[var(--text-primary)] text-center leading-tight px-2">
          Crear historia
        </span>
      </div>

      {/* "+" badge */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: splitH - 16 }}>
        <div className="size-8 rounded-full bg-[var(--brand)] flex items-center justify-center ring-[3px] ring-[var(--bg-surface)] group-hover:scale-110 transition-transform duration-150 shadow-md">
          <svg
            className="size-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Story group card
───────────────────────────────────────────── */
function StoryGroupCard({
  group,
  onClick,
}: {
  group: StoryGroup;
  onClick: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const name        = group.user.displayName ?? group.user.username;
  const isViewed    = group.allViewed;
  const firstStory  = group.stories[0];
  const bgImage     = firstStory?.imageUrl;
  const bgColor     = firstStory?.backgroundColor ?? '#1A1A2E';
  const totalViews  = group.stories.reduce((sum, s) => sum + s.viewCount, 0);
  const hasMultiple = group.stories.length > 1;
  const hasText     = !!(firstStory?.text && !bgImage);

  return (
    <button
      onClick={onClick}
      className="relative shrink-0 rounded-2xl overflow-hidden select-none active:scale-[0.96] hover:scale-[1.03] hover:shadow-xl hover:shadow-black/35 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      style={{ width: CARD_W, height: CARD_H, backgroundColor: bgColor }}
      aria-label={`Historia de ${name}`}
    >
      {/* Background image with fade-in */}
      {bgImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
          {/* Shimmer while loading */}
          {!imgLoaded && (
            <div
              className="absolute inset-0 animate-pulse"
              style={{ backgroundColor: bgColor }}
            />
          )}
        </>
      )}

      {/* Text-only story — centered text preview */}
      {hasText && firstStory?.text && (
        <div className="absolute inset-0 flex items-center justify-center px-3 z-[1]">
          <p
            className="text-white text-[13px] font-bold text-center leading-snug break-words line-clamp-4"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
          >
            {firstStory.text}
          </p>
        </div>
      )}

      {/* Dual gradient — dark top + dark bottom */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, transparent 38%, transparent 54%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* Multiple stories badge */}
      {hasMultiple && (
        <div className="absolute top-2 right-2 z-[3]">
          <div className="flex items-center gap-0.5 bg-black/55 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <svg className="size-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="2" width="9" height="9" rx="1.5" />
              <rect x="13" y="2" width="9" height="9" rx="1.5" />
              <rect x="2" y="13" width="9" height="9" rx="1.5" />
              <rect x="13" y="13" width="9" height="9" rx="1.5" />
            </svg>
            <span className="text-[9px] font-bold text-white tabular-nums">
              {group.stories.length}
            </span>
          </div>
        </div>
      )}

      {/* Avatar with gradient ring */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[3]">
        <div
          className="p-[2.5px] rounded-full"
          style={{
            background: isViewed
              ? 'rgba(255,255,255,0.28)'
              : 'linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f97316 100%)',
          }}
        >
          {group.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.user.avatarUrl}
              alt={name}
              className="w-9 h-9 rounded-full object-cover block"
              style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' }}
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xs font-bold text-white select-none">
                {getInitials(name)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Name + view count */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-3 z-[3]">
        <p className="text-white text-[11px] font-semibold leading-tight truncate drop-shadow">
          {name}
        </p>
        {totalViews > 0 && (
          <p className="flex items-center gap-1 text-white/65 text-[10px] tabular-nums mt-0.5">
            <svg
              className="size-2.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {totalViews.toLocaleString()}
          </p>
        )}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main StoryBar
───────────────────────────────────────────── */
export function StoryBar() {
  const { user } = useAuth();

  const [groups,        setGroups]        = useState<StoryGroup[]>([]);
  const [viewedIds,     setViewedIds]     = useState<Set<number>>(new Set());
  const [viewerGroupIdx, setViewerIdx]    = useState<number | null>(null);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart  = useRef({ x: 0, scrollLeft: 0 });
  const hasDragged = useRef(false);

  /* ── Load ── */
  const load = useCallback(async () => {
    try {
      const data = await storyService.getActive();
      setGroups(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Scroll arrows state ── */
  const updateScrollBtns = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + 4 < el.scrollWidth - el.clientWidth);
  }, []);

  // Set up listener once
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollBtns, { passive: true });
    const ro = new ResizeObserver(updateScrollBtns);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollBtns);
      ro.disconnect();
    };
  }, [updateScrollBtns]);

  // Re-evaluate after content renders
  useEffect(() => {
    const id = requestAnimationFrame(updateScrollBtns);
    return () => cancelAnimationFrame(id);
  }, [loading, groups.length, updateScrollBtns]);

  function scrollStep(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -SCROLL_STEP : SCROLL_STEP,
      behavior: 'smooth',
    });
  }

  /* ── Mouse drag-to-scroll (desktop) ── */
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current  = { x: e.pageX, scrollLeft: el.scrollLeft };
    el.style.cursor    = 'grabbing';
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.pageX - dragStart.current.x;
    if (Math.abs(dx) > 4) hasDragged.current = true;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }

  function endDrag() {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  }

  /* ── Story callbacks ── */
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

  /* ── Derived state ── */
  const enrichedGroups: StoryGroup[] = groups.map((g) => ({
    ...g,
    allViewed: g.stories.every((s) => viewedIds.has(s.id)),
  }));

  const currentUserGroupIdx = enrichedGroups.findIndex((g) => g.user.id === user?.id);
  const orderedGroups: StoryGroup[] =
    currentUserGroupIdx > 0
      ? [
          enrichedGroups[currentUserGroupIdx],
          ...enrichedGroups.filter((_, i) => i !== currentUserGroupIdx),
        ]
      : enrichedGroups;

  /* ── Render ── */
  return (
    <>
      <div className="relative">
        {/* Edge fades — desktop only */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-16 z-[5] pointer-events-none hidden sm:block"
            style={{
              background:
                'linear-gradient(to right, var(--bg-surface) 0%, transparent 100%)',
            }}
          />
        )}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-[5] pointer-events-none hidden sm:block"
            style={{
              background:
                'linear-gradient(to left, var(--bg-surface) 0%, transparent 100%)',
            }}
          />
        )}

        {/* Scroll arrows — desktop only */}
        {canScrollLeft && (
          <button
            onClick={() => scrollStep('left')}
            aria-label="Historias anteriores"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 size-8 hidden sm:flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:scale-95 transition-all duration-150"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollStep('right')}
            aria-label="Más historias"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 size-8 hidden sm:flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:scale-95 transition-all duration-150"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 px-3 py-2 overflow-x-auto scrollbar-hide"
          style={{ cursor: 'grab' }}
          aria-label="Historias"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onClickCapture={(e) => {
            // Block card clicks that were really drags
            if (hasDragged.current) {
              e.stopPropagation();
              hasDragged.current = false;
            }
          }}
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <StorySkeleton key={i} />)
          ) : (
            <>
              {user && (
                <CreateStoryCard user={user} onClick={() => setCreateOpen(true)} />
              )}
              {orderedGroups.map((group, i) => (
                <StoryGroupCard
                  key={group.user.id}
                  group={group}
                  onClick={() => setViewerIdx(i)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Story Viewer */}
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

      {/* Story Creator */}
      {createOpen && (
        <StoryCreator
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}
