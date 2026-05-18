'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { storyService } from '@/services/story.service';
import type { StoryGroup } from '@/types';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const STORY_DURATION  = 6000;  // ms per story
const HOLD_THRESHOLD  = 180;   // ms — tap vs long-press
const TAP_MOVE_MAX    = 14;    // px — max drift to still count as tap
const SWIPE_DOWN_MIN  = 80;    // px — swipe-down to close
const SWIPE_HOR_MIN   = 55;    // px — horizontal swipe to change group

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Props {
  groups:            StoryGroup[];
  initialGroupIndex: number;
  currentUserId?:    number;
  onClose:           () => void;
  onGroupViewed?:    (groupIndex: number, storyIndex: number) => void;
  onDelete?:         (storyId: number) => void;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function StoryViewer({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onGroupViewed,
  onDelete,
}: Props) {

  /* ── State ── */
  const [groupIdx,       setGroupIdx]       = useState(initialGroupIndex);
  const [storyIdx,       setStoryIdx]       = useState(0);
  const [progress,       setProgress]       = useState(0);
  const [imgLoaded,      setImgLoaded]      = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [holdPaused,     setHoldPaused]     = useState(false);   // visual only
  const [swipeDy,        setSwipeDy]        = useState(0);
  const [tapFlash,       setTapFlash]       = useState<'left' | 'right' | null>(null);

  const group        = groups[groupIdx];
  const story        = group?.stories[storyIdx];
  const isOwn        = story?.author.id === currentUserId;
  const totalStories = group?.stories.length ?? 0;

  /* ── rAF timer refs (no React state — direct control) ── */
  const rafRef      = useRef<number>(0);
  const startAtRef  = useRef<number>(0);   // performance.now() when this segment started
  const storedMsRef = useRef<number>(0);   // ms accumulated before current segment

  /* ── Stable navigation ref (avoids stale closure inside rAF) ── */
  const goToNextRef = useRef<() => void>(() => {});

  /* ── Pointer tracking refs ── */
  const pointerRef   = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldRef    = useRef(false);     // currently in long-press pause
  const tapFlashRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─────────────────────────────────────────
     rAF tick — always reads from refs, never
     captures stale state via closure
  ───────────────────────────────────────── */
  const tickRef = useRef<(now: number) => void>(() => {});
  tickRef.current = (now: number) => {
    const elapsed = storedMsRef.current + (now - startAtRef.current);
    setProgress(Math.min((elapsed / STORY_DURATION) * 100, 100));
    if (elapsed >= STORY_DURATION) {
      storedMsRef.current = 0;
      goToNextRef.current();
      return;
    }
    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  /* ─────────────────────────────────────────
     Timer controls — pure ref operations
  ───────────────────────────────────────── */
  const startTimer = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, []);

  const pauseTimer = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current += performance.now() - startAtRef.current;
  }, []);

  const resumeTimer = useCallback(() => {
    startAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, []);

  /* ─────────────────────────────────────────
     Navigation
  ───────────────────────────────────────── */
  const goToNext = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
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

  useEffect(() => { goToNextRef.current = goToNext; }, [goToNext]);

  const goToPrev = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
    }
    // at very first story: do nothing (just restart timer via effect)
  }, [storyIdx, groupIdx]);

  const goToNextGroup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [groupIdx, groups.length, onClose]);

  const goToPrevGroup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
    }
  }, [groupIdx]);

  /* ─────────────────────────────────────────
     Story/group change effect
     Restarts timer whenever current story changes.
     Does NOT restart if user is currently holding.
  ───────────────────────────────────────── */
  useEffect(() => {
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    setDeleteConfirm(false);
    setHoldPaused(false);

    if (!isHoldRef.current) startTimer();

    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  /* ── Mark viewed ── */
  useEffect(() => {
    if (!story) return;
    onGroupViewed?.(groupIdx, storyIdx);
    storyService.markViewed(story.id).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, story?.id]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')          { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'ArrowLeft')  goToPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goToNext, goToPrev]);

  /* ── Body scroll lock ── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ─────────────────────────────────────────
     Tap flash (brief visual indicator)
  ───────────────────────────────────────── */
  function flashTap(side: 'left' | 'right') {
    if (tapFlashRef.current) clearTimeout(tapFlashRef.current);
    setTapFlash(side);
    tapFlashRef.current = setTimeout(() => setTapFlash(null), 220);
  }

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  /* ─────────────────────────────────────────
     Pointer handlers

     Architecture:
     • pointerDown  → schedule hold timer (don't pause yet)
     • hold fires   → user is pressing: pause timer
     • pointerUp    → if was hold: resume. if was tap: navigate.
     • pointerCancel→ cancel hold, resume if holding

     Key insight: for quick taps the timer is NEVER paused —
     it keeps running and resets only on navigation.
     This matches Instagram/Facebook behaviour exactly.
  ───────────────────────────────────────── */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (deleteConfirm) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    isHoldRef.current  = false;
    setSwipeDy(0);

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (!pointerRef.current) return;    // already released — was a tap
      isHoldRef.current = true;
      pauseTimer();
      setHoldPaused(true);
    }, HOLD_THRESHOLD);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current) return;

    const dx = Math.abs(e.clientX - pointerRef.current.x);
    const dy = e.clientY - pointerRef.current.y;

    // Movement cancels long-press (it's a swipe)
    if ((dx > 10 || Math.abs(dy) > 10) && holdTimerRef.current) {
      clearHoldTimer();
    }

    if (dy > 0) setSwipeDy(Math.min(dy, 200));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    pointerRef.current = null;
    clearHoldTimer();

    /* ── Long-press release: just resume ── */
    if (isHoldRef.current) {
      isHoldRef.current = false;
      setHoldPaused(false);
      setSwipeDy(0);
      if (!deleteConfirm) resumeTimer();
      return;
    }

    if (!start) return;

    const dx        = e.clientX - start.x;
    const dy        = e.clientY - start.y;
    const dt        = performance.now() - start.t;
    const absDx     = Math.abs(dx);
    const absDy     = Math.abs(dy);
    const curSwipeDy = swipeDy;
    setSwipeDy(0);

    /* ── Swipe down → close ── */
    if (dy > SWIPE_DOWN_MIN && absDx < 90 && dt < 600) {
      onClose();
      return;
    }

    /* ── Horizontal swipe → change group ── */
    if (absDx > SWIPE_HOR_MIN && absDy < 50 && dt < 500) {
      if (dx < 0) goToNextGroup();
      else        goToPrevGroup();
      return;
    }

    /* ── Quick tap → story navigation ── */
    if (dt < 400 && absDx < TAP_MOVE_MAX && absDy < TAP_MOVE_MAX && curSwipeDy < 15) {
      const pct = e.clientX / window.innerWidth;
      if (pct < 0.35) {
        flashTap('left');
        goToPrev();
      } else if (pct > 0.65) {
        flashTap('right');
        goToNext();
      }
    }
  }

  function handlePointerCancel() {
    pointerRef.current = null;
    clearHoldTimer();
    if (isHoldRef.current) {
      isHoldRef.current = false;
      setHoldPaused(false);
      resumeTimer();
    }
    setSwipeDy(0);
  }

  /* ── Delete ── */
  function handleDelete() {
    if (!story) return;
    const deletedTotal = totalStories;
    const deletedIdx   = storyIdx;
    onDelete?.(story.id);
    setDeleteConfirm(false);
    setHoldPaused(false);

    if (deletedTotal <= 1) { onClose(); return; }

    const nextIdx = deletedIdx >= deletedTotal - 1 ? deletedIdx - 1 : deletedIdx;
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    setStoryIdx(nextIdx);
  }

  /* ── Guard ── */
  if (!group || !story) return null;

  const displayName  = story.author.displayName ?? story.author.username;
  const swipeScale   = 1 - (swipeDy / 1800);
  const swipeOpacity = 1 - (swipeDy / 260);

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      role="dialog"
      aria-modal
      aria-label="Visor de historias"
    >
      {/* Story container — swipe-down transform applied here */}
      <div
        className="relative w-full h-full overflow-hidden select-none"
        style={{
          maxWidth:    430,
          isolation:   'isolate',
          transform:   swipeDy > 0
            ? `translateY(${swipeDy * 0.45}px) scale(${swipeScale})`
            : undefined,
          opacity:     swipeDy > 0 ? swipeOpacity : 1,
          transition:  swipeDy === 0 ? 'transform 0.22s ease, opacity 0.22s ease' : 'none',
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

        {/* Text overlay for image+text stories */}
        {story.text && story.imageUrl && (
          <div className="absolute inset-x-0 bottom-28 flex items-center justify-center px-6 z-[22] pointer-events-none">
            <p
              className="text-white text-2xl font-bold text-center leading-relaxed break-words"
              style={{ textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)' }}
            >
              {story.text}
            </p>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none z-[21]"
             style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-[21]"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

        {/* ── Progress bars ── */}
        <div
          className="absolute inset-x-0 top-0 z-30 px-3 flex gap-1"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < storyIdx ? '100%'
                       : i === storyIdx ? `${progress}%`
                       : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Header: avatar + controls ── */}
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
              onClick={() => { setDeleteConfirm(true); pauseTimer(); setHoldPaused(true); }}
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

        {/* ── View count (own stories) ── */}
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

        {/* ── Tap zones (z-20 — below header at z-30) ── */}
        <div
          className="absolute inset-0 z-20"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />

        {/* ── Left tap flash indicator ── */}
        <div
          aria-hidden
          className="absolute top-0 left-0 bottom-0 z-[23] pointer-events-none flex items-center pl-4"
          style={{
            width:      '35%',
            background: tapFlash === 'left'
              ? 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 100%)'
              : 'transparent',
            transition: 'background 0.12s ease',
          }}
        >
          {tapFlash === 'left' && (
            <div className="size-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Right tap flash indicator ── */}
        <div
          aria-hidden
          className="absolute top-0 right-0 bottom-0 z-[23] pointer-events-none flex items-center justify-end pr-4"
          style={{
            width:      '35%',
            background: tapFlash === 'right'
              ? 'linear-gradient(to left, rgba(0,0,0,0.3) 0%, transparent 100%)'
              : 'transparent',
            transition: 'background 0.12s ease',
          }}
        >
          {tapFlash === 'right' && (
            <div className="size-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Long-press pause indicator ── */}
        {holdPaused && !deleteConfirm && (
          <div className="absolute inset-0 z-[24] pointer-events-none flex items-center justify-center">
            <div className="flex items-center gap-[6px] px-5 py-3.5 rounded-full bg-black/55 backdrop-blur-md shadow-xl">
              <div className="w-[3.5px] h-7 bg-white rounded-full" />
              <div className="w-[3.5px] h-7 bg-white rounded-full" />
            </div>
          </div>
        )}

        {/* ── Delete confirmation ── */}
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
                    setHoldPaused(false);
                    resumeTimer();
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

      {/* ── Desktop group arrows ── */}
      {groupIdx > 0 && (
        <button
          onClick={goToPrevGroup}
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
          onClick={goToNextGroup}
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
