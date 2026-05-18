'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { storyService } from '@/services/story.service';
import type { StoryGroup } from '@/types';

const STORY_DURATION = 5000;

interface StoryViewerProps {
  groups:            StoryGroup[];
  initialGroupIndex: number;
  currentUserId?:    number;
  onClose:           () => void;
  onGroupViewed?:    (groupIndex: number, storyIndex: number) => void;
  onDelete?:         (storyId: number) => void;
}

export function StoryViewer({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onGroupViewed,
  onDelete,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx]           = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx]           = useState(0);
  const [paused, setPaused]               = useState(false);
  const [progress, setProgress]           = useState(0);
  const [imgLoaded, setImgLoaded]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [swipeDy, setSwipeDy]             = useState(0);

  const group        = groups[groupIdx];
  const story        = group?.stories[storyIdx];
  const isOwn        = story?.author.id === currentUserId;
  const totalStories = group?.stories.length ?? 0;

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const elapsedRef  = useRef<number>(0);
  const touchRef    = useRef<{ x: number; y: number; time: number } | null>(null);
  const goToNextRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const goToNext = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (storyIdx < totalStories - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, totalStories, groupIdx, groups.length, onClose]);

  // Keep ref current so setInterval never calls a stale closure
  useEffect(() => { goToNextRef.current = goToNext; }, [goToNext]);

  const goToPrev = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, groupIdx]);

  const startTimer = useCallback(() => {
    clearTimer();
    startRef.current = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = elapsedRef.current + (performance.now() - startRef.current);
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= STORY_DURATION) {
        clearTimer();
        elapsedRef.current = 0;
        goToNextRef.current();
      }
    }, 50);
    setProgress(Math.min((elapsedRef.current / STORY_DURATION) * 100, 100));
  }, [clearTimer]);

  // Reset + restart timer when story changes
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    setDeleteConfirm(false);
    if (!paused) startTimer();
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  // Pause / resume
  useEffect(() => {
    if (paused) {
      clearTimer();
      elapsedRef.current += performance.now() - startRef.current;
    } else if (!deleteConfirm) {
      startTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Mark viewed
  useEffect(() => {
    if (!story) return;
    onGroupViewed?.(groupIdx, storyIdx);
    storyService.markViewed(story.id).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, story?.id]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')          { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'ArrowLeft')  goToPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goToNext, goToPrev]);

  // Scroll lock — guaranteed cleanup
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Pointer handlers for tap navigation + swipe-down
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    touchRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setSwipeDy(0);
    setPaused(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!touchRef.current) return;
    const dy = e.clientY - touchRef.current.y;
    if (dy > 0) setSwipeDy(Math.min(dy, 180));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = touchRef.current;
    touchRef.current = null;
    const wasSwipeDy = swipeDy;
    setSwipeDy(0);
    setPaused(false);
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.time;

    // Swipe down → close
    if (dy > 100 && Math.abs(dx) < 90 && dt < 600) { onClose(); return; }

    // Short tap → navigate
    if (dt < 280 && Math.abs(dx) < 20 && Math.abs(dy) < 20 && wasSwipeDy < 15) {
      const pct = e.clientX / window.innerWidth;
      if (pct < 0.35)      goToPrev();
      else if (pct > 0.65) goToNext();
    }
  }

  function handlePointerCancel() {
    touchRef.current = null;
    setSwipeDy(0);
    setPaused(false);
  }

  function handleDelete() {
    if (!story) return;
    const deletedTotal = totalStories;
    const deletedIdx   = storyIdx;

    onDelete?.(story.id);
    setDeleteConfirm(false);

    if (deletedTotal <= 1) {
      onClose();
      return;
    }
    const nextIdx = deletedIdx >= deletedTotal - 1 ? deletedIdx - 1 : deletedIdx;
    elapsedRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    setStoryIdx(nextIdx);
    setPaused(false);
  }

  if (!group || !story) return null;

  const displayName  = story.author.displayName ?? story.author.username;
  const swipeScale   = 1 - (swipeDy / 1800);
  const swipeOpacity = 1 - (swipeDy / 260);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      role="dialog"
      aria-modal
      aria-label="Visor de historias"
    >
      {/* Story container — swipe transforms applied here */}
      <div
        className="relative w-full h-full overflow-hidden select-none"
        style={{
          maxWidth: 430,
          isolation: 'isolate',
          transform:  swipeDy > 0
            ? `translateY(${swipeDy * 0.45}px) scale(${swipeScale})`
            : undefined,
          opacity:    swipeDy > 0 ? swipeOpacity : 1,
          transition: swipeDy === 0 ? 'transform 0.22s ease, opacity 0.22s ease' : 'none',
          touchAction: 'none',
        }}
      >
        {/* ── Background media ── */}
        {story.imageUrl ? (
          <div className="absolute inset-0" style={{ backgroundColor: story.backgroundColor }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={story.id}
              src={story.imageUrl}
              alt="Historia"
              draggable={false}
              onLoad={() => setImgLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-8 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center p-10"
            style={{ backgroundColor: story.backgroundColor }}
          >
            {story.text && (
              <p
                className="text-white text-2xl font-bold text-center leading-relaxed break-words"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                {story.text}
              </p>
            )}
          </div>
        )}

        {/* Text overlay — only for image + text stories */}
        {story.text && story.imageUrl && (
          <div className="absolute inset-x-0 bottom-28 flex items-center justify-center px-6 z-[22] pointer-events-none">
            <p
              className="text-white text-2xl font-bold text-center leading-relaxed break-words"
              style={{ textShadow: story.imageUrl ? '0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)' : '0 2px 8px rgba(0,0,0,0.3)' }}
            >
              {story.text}
            </p>
          </div>
        )}

        {/* Gradient overlays for readability */}
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none z-[21]"
             style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-[21]"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

        {/* ── Progress bars — z-30 (above tap zone) ── */}
        <div
          className="absolute inset-x-0 top-0 z-30 px-3 flex gap-1"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* ── Header controls — z-30 ── */}
        <div
          className="absolute inset-x-0 z-30 px-3 flex items-center gap-2.5"
          style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 14px)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Avatar src={story.author.avatarUrl} name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate drop-shadow-sm">
              {displayName}
            </p>
            <p className="text-[11px] text-white/70 leading-tight">{timeAgo(story.createdAt)}</p>
          </div>

          {isOwn && (
            <button
              onClick={() => { setDeleteConfirm(true); clearTimer(); setPaused(true); }}
              aria-label="Eliminar historia"
              className="size-9 flex items-center justify-center rounded-full text-white/90 hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Cerrar visor"
            className="size-9 flex items-center justify-center rounded-full text-white/90 hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── View count (own stories) — z-30 ── */}
        {isOwn && !deleteConfirm && (
          <div
            className="absolute inset-x-0 flex justify-center z-30 pointer-events-none"
            style={{ bottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
              <svg className="size-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-sm text-white font-medium tabular-nums">
                {story.viewCount} {story.viewCount === 1 ? 'vista' : 'vistas'}
              </span>
            </div>
          </div>
        )}

        {/* ── Tap zone — z-20 (below controls at z-30) ── */}
        <div
          className="absolute inset-0 z-20"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />

        {/* ── Delete confirmation — z-40 (above everything) ── */}
        {deleteConfirm && (
          <div
            className="absolute inset-0 z-40 flex items-end justify-center"
            style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
            <div className="relative w-full mx-4 bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-5 pt-6 pb-4 text-center">
                <div className="size-14 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-3">
                  <svg className="size-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </div>
                <p className="text-base font-bold text-[var(--text-primary)] mb-1">¿Eliminar esta historia?</p>
                <p className="text-sm text-[var(--text-muted)]">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setDeleteConfirm(false);
                    setPaused(false);
                  }}
                  className="flex-1 h-12 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-hover)] transition-colors border-r border-[var(--border)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 h-12 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop group arrows — outside container ── */}
      {groupIdx > 0 && (
        <button
          onClick={goToPrev}
          aria-label="Grupo anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-[201] hidden sm:flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={goToNext}
          aria-label="Grupo siguiente"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-[201] hidden sm:flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
