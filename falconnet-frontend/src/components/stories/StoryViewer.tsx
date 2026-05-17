'use client';

import Image from 'next/image';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { storyService } from '@/services/story.service';
import type { StoryGroup } from '@/types';

const STORY_DURATION = 5000;

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  currentUserId?: number;
  onClose: () => void;
  onGroupViewed?: (groupIndex: number, storyIndex: number) => void;
  onDelete?: (storyId: number, groupIndex: number) => void;
}

export function StoryViewer({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onGroupViewed,
  onDelete,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0);

  const group    = groups[groupIdx];
  const story    = group?.stories[storyIdx];
  const isOwn    = story?.author.id === currentUserId;
  const totalStories = group?.stories.length ?? 0;

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const elapsedRef  = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const goToNext = useCallback(() => {
    if (storyIdx < totalStories - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
    elapsedRef.current = 0;
    setProgress(0);
  }, [storyIdx, totalStories, groupIdx, groups.length, onClose]);

  const goToPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
    }
    elapsedRef.current = 0;
    setProgress(0);
  }, [storyIdx, groupIdx]);

  // Start / resume timer
  const startTimer = useCallback(() => {
    clearTimer();
    startRef.current = performance.now();
    const remaining = STORY_DURATION - elapsedRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = elapsedRef.current + (performance.now() - startRef.current);
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= STORY_DURATION) {
        clearTimer();
        elapsedRef.current = 0;
        goToNext();
      }
    }, 50);

    // Set initial progress
    setProgress(Math.min((elapsedRef.current / STORY_DURATION) * 100, 100));
    void remaining;
  }, [clearTimer, goToNext]);

  // Reset & start when story changes
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    if (!paused) startTimer();
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  // Pause / resume
  useEffect(() => {
    if (paused) {
      clearTimer();
      elapsedRef.current += performance.now() - startRef.current;
    } else {
      startTimer();
    }
  }, [paused, clearTimer, startTimer]);

  // Register view
  useEffect(() => {
    if (!story) return;
    onGroupViewed?.(groupIdx, storyIdx);
    storyService.markViewed(story.id).catch(() => {});
  }, [groupIdx, storyIdx, story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')       onClose();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'ArrowLeft')  goToPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goToNext, goToPrev]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!group || !story) return null;

  const displayName = story.author.displayName ?? story.author.username;

  // Tap zones
  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const x = e.clientX / window.innerWidth;
    if (x < 0.35) goToPrev();
    else if (x > 0.65) goToNext();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      role="dialog"
      aria-modal
      aria-label="Visor de historias"
    >
      {/* Story content */}
      <div className="relative w-full h-full max-w-md mx-auto select-none">

        {/* Background */}
        {story.imageUrl ? (
          <Image
            src={story.imageUrl}
            alt="Historia"
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
            priority
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center p-8"
            style={{ backgroundColor: story.backgroundColor }}
          >
            <p className="text-white text-2xl font-semibold text-center leading-relaxed break-words">
              {story.text}
            </p>
          </div>
        )}

        {/* Gradient overlays for readability */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-3 inset-x-3 flex gap-1 z-10">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header: avatar + name + time + close */}
        <div className="absolute top-7 inset-x-3 flex items-center gap-2.5 z-10">
          <Avatar src={story.author.avatarUrl} name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">{displayName}</p>
            <p className="text-xs text-white/70">{timeAgo(story.createdAt)}</p>
          </div>
          {isOwn && onDelete && (
            <button
              onClick={() => onDelete(story.id, groupIdx)}
              aria-label="Eliminar historia"
              className="size-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar visor"
            className="size-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Footer: views count for own stories */}
        {isOwn && (
          <div className="absolute bottom-6 inset-x-0 flex justify-center z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <svg className="size-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-xs text-white font-medium">{story.viewCount} vistas</span>
            </div>
          </div>
        )}

        {/* Tap zones (invisible, on top of content) */}
        <div
          className="absolute inset-0 z-20"
          onClick={handleTap}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        />
      </div>

      {/* Group navigation arrows (visible on wider screens) */}
      {groupIdx > 0 && (
        <button
          onClick={goToPrev}
          aria-label="Grupo anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 hidden sm:flex size-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={goToNext}
          aria-label="Grupo siguiente"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 hidden sm:flex size-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
