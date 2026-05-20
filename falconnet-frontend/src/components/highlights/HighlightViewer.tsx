'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Destacado, HighlightStory } from '@/types';

const STORY_DURATION = 6000; // ms per slide
const HOLD_THRESHOLD = 180;
const TAP_MOVE_MAX   = 14;
const SWIPE_DOWN_MIN = 80;
const SWIPE_HOR_MIN  = 55;

const BRAND_GRADIENT = 'linear-gradient(135deg, #1d4ed8, #3b82f6)';

interface Props {
  highlights: Destacado[];
  startIndex: number;
  onClose: () => void;
}

export function HighlightViewer({ highlights, startIndex, onClose }: Props) {
  const [hlIdx,       setHlIdx]       = useState(startIndex);
  const [storyIdx,    setStoryIdx]    = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [holdPaused,  setHoldPaused]  = useState(false);
  const [swipeDy,     setSwipeDy]     = useState(0);
  const [tapFlash,    setTapFlash]    = useState<'left' | 'right' | null>(null);
  const [mounted,     setMounted]     = useState(false);

  const hl       = highlights[hlIdx];
  const story: HighlightStory | undefined = hl?.historias[storyIdx];
  const totalStories = hl?.historias.length ?? 0;

  const rafRef      = useRef<number>(0);
  const startAtRef  = useRef<number>(0);
  const storedMsRef = useRef<number>(0);
  const goToNextRef = useRef<() => void>(() => {});
  const pointerRef  = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldRef   = useRef(false);
  const tapFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

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

  const goToNext = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (storyIdx < totalStories - 1) {
      setStoryIdx((i) => i + 1);
    } else if (hlIdx < highlights.length - 1) {
      setHlIdx((h) => h + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, totalStories, hlIdx, highlights.length, onClose]);

  useEffect(() => { goToNextRef.current = goToNext; }, [goToNext]);

  const goToPrev = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (hlIdx > 0) {
      setHlIdx((h) => h - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, hlIdx]);

  const goToNextHL = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (hlIdx < highlights.length - 1) {
      setHlIdx((h) => h + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [hlIdx, highlights.length, onClose]);

  const goToPrevHL = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    if (hlIdx > 0) {
      setHlIdx((h) => h - 1);
      setStoryIdx(0);
    }
  }, [hlIdx]);

  useEffect(() => {
    storedMsRef.current = 0;
    setProgress(0);
    setImgLoaded(false);
    setHoldPaused(false);
    if (!isHoldRef.current && totalStories > 0) startTimer();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlIdx, storyIdx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')          { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'ArrowLeft')  goToPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goToNext, goToPrev]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Preload next story image
  useEffect(() => {
    const nextStory = hl?.historias[storyIdx + 1] ?? highlights[hlIdx + 1]?.historias[0];
    if (nextStory?.imagenUrl) {
      const img = new Image();
      img.src = nextStory.imagenUrl;
    }
  }, [storyIdx, hlIdx, hl, highlights]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (tapFlashRef.current) clearTimeout(tapFlashRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function flashTap(side: 'left' | 'right') {
    if (tapFlashRef.current) clearTimeout(tapFlashRef.current);
    setTapFlash(side);
    tapFlashRef.current = setTimeout(() => setTapFlash(null), 220);
  }

  function clearHoldTimer() {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    isHoldRef.current  = false;
    setSwipeDy(0);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (!pointerRef.current) return;
      isHoldRef.current = true;
      pauseTimer();
      setHoldPaused(true);
    }, HOLD_THRESHOLD);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current) return;
    const dx = Math.abs(e.clientX - pointerRef.current.x);
    const dy = e.clientY - pointerRef.current.y;
    if ((dx > 10 || Math.abs(dy) > 10) && holdTimerRef.current) clearHoldTimer();
    if (dy > 0) setSwipeDy(Math.min(dy, 200));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    pointerRef.current = null;
    clearHoldTimer();
    if (isHoldRef.current) {
      isHoldRef.current = false;
      setHoldPaused(false);
      setSwipeDy(0);
      resumeTimer();
      return;
    }
    if (!start) return;
    const dx    = e.clientX - start.x;
    const dy    = e.clientY - start.y;
    const dt    = performance.now() - start.t;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const curDy = swipeDy;
    setSwipeDy(0);
    if (dy > SWIPE_DOWN_MIN && absDx < 90 && dt < 600) { onClose(); return; }
    if (absDx > SWIPE_HOR_MIN && absDy < 50 && dt < 500) {
      if (dx < 0) goToNextHL(); else goToPrevHL();
      return;
    }
    if (dt < 400 && absDx < TAP_MOVE_MAX && absDy < TAP_MOVE_MAX && curDy < 15) {
      const pct = e.clientX / window.innerWidth;
      if (pct < 0.35) { flashTap('left'); goToPrev(); }
      else if (pct > 0.65) { flashTap('right'); goToNext(); }
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

  if (!mounted || !hl) return null;

  const swipeScale   = 1 - (swipeDy / 1800);
  const swipeOpacity = 1 - (swipeDy / 260);

  const coverBg = hl.coverColor ?? undefined;

  const content = (
    <div
      className="fixed inset-0 z-[80] bg-black flex items-center justify-center"
      role="dialog"
      aria-modal
      aria-label={`Visor de ${hl.nombre}`}
    >
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
        {/* ── Media background ── */}
        {story ? (
          story.imagenUrl ? (
            <div className="absolute inset-0" style={{ backgroundColor: story.colorFondo ?? '#1A1A2E' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={story.id}
                src={story.imagenUrl}
                alt=""
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
              style={{ backgroundColor: story.colorFondo ?? '#1A1A2E' }}
            >
              {story.texto && (
                <p className="text-white text-2xl font-bold text-center leading-relaxed break-words"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {story.texto}
                </p>
              )}
            </div>
          )
        ) : (
          /* No stories — show cover */
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: coverBg ?? BRAND_GRADIENT }}
          >
            {hl.emoji && <span className="text-6xl">{hl.emoji}</span>}
            <p className="text-white text-xl font-semibold">{hl.nombre}</p>
            <p className="text-white/60 text-sm">Sin historias</p>
          </div>
        )}

        {/* Text overlay for image+text stories */}
        {story?.texto && story.imagenUrl && (
          <div className="absolute inset-x-0 bottom-28 flex items-center justify-center px-6 z-[22] pointer-events-none">
            <p className="text-white text-2xl font-bold text-center leading-relaxed break-words"
              style={{ textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)' }}>
              {story.texto}
            </p>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none z-[21]"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-[21]"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

        {/* ── Progress bars ── */}
        {totalStories > 0 && (
          <div
            className="absolute inset-x-0 top-0 z-30 px-3 flex gap-1"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            {hl.historias.map((_, i) => (
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
        )}

        {/* ── Header: highlight info + close ── */}
        <div
          className="absolute inset-x-0 z-30 px-3 flex items-center gap-2.5"
          style={{ top: `calc(max(12px, env(safe-area-inset-top)) + ${totalStories > 0 ? '18px' : '12px'})` }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Cover circle mini */}
          <div
            className="size-9 rounded-full overflow-hidden shrink-0 border-2 border-white/60"
            style={{ background: coverBg ?? BRAND_GRADIENT }}
          >
            {hl.coverImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={hl.coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : hl.emoji ? (
              <div className="w-full h-full flex items-center justify-center text-lg">{hl.emoji}</div>
            ) : null}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate drop-shadow-sm">
              {hl.nombre}
            </p>
            {totalStories > 0 && (
              <p className="text-[11px] text-white/70 leading-tight">
                {storyIdx + 1} / {totalStories}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-9 flex items-center justify-center rounded-full text-white/90 hover:bg-white/20 transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tap zones */}
        {totalStories > 0 && (
          <div
            className="absolute inset-0 z-20"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        )}

        {/* Left tap flash */}
        <div
          aria-hidden
          className="absolute top-0 left-0 bottom-0 z-[23] pointer-events-none flex items-center pl-4"
          style={{
            width: '35%',
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

        {/* Right tap flash */}
        <div
          aria-hidden
          className="absolute top-0 right-0 bottom-0 z-[23] pointer-events-none flex items-center justify-end pr-4"
          style={{
            width: '35%',
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

        {/* Long-press pause indicator */}
        {holdPaused && (
          <div className="absolute inset-0 z-[24] pointer-events-none flex items-center justify-center">
            <div className="flex items-center gap-[6px] px-5 py-3.5 rounded-full bg-black/55 backdrop-blur-md shadow-xl">
              <div className="w-[3.5px] h-7 bg-white rounded-full" />
              <div className="w-[3.5px] h-7 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Desktop highlight navigation arrows */}
      {hlIdx > 0 && (
        <button
          onClick={goToPrevHL}
          aria-label="Destacado anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-[81] hidden sm:flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {hlIdx < highlights.length - 1 && (
        <button
          onClick={goToNextHL}
          aria-label="Siguiente destacado"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-[81] hidden sm:flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
