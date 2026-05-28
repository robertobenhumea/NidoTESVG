'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/* ── Config ────────────────────────────────────────────────────── */

const CONFIGS = {
  avatar: {
    frameW: 280, frameH: 280,
    outputW: 512, outputH: 512,
    label: 'Foto de perfil',
    circle: true,
    hint: 'Arrastra para centrar · Desliza para hacer zoom',
  },
  cover: {
    frameW: 336, frameH: 140,
    outputW: 1200, outputH: 500,
    label: 'Foto de portada',
    circle: false,
    hint: 'Arrastra para reencuadrar · Desliza para hacer zoom',
  },
} as const;

type Mode = keyof typeof CONFIGS;

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  src: File | string;
  mode: Mode;
  onSave: (blob: Blob) => Promise<void>;
  onClose: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function clampOffset(
  ox: number, oy: number,
  scale: number,
  naturalW: number, naturalH: number,
  frameW: number, frameH: number,
): { x: number; y: number } {
  const renderedW = naturalW * scale;
  const renderedH = naturalH * scale;
  // Maximum offset that keeps the image covering the frame completely
  const maxX = Math.max(0, (renderedW - frameW) / 2);
  const maxY = Math.max(0, (renderedH - frameH) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/* ── Main component ────────────────────────────────────────────── */

export function ImageCropEditor({ src, mode, onSave, onClose }: Props) {
  const cfg = CONFIGS[mode];
  const { frameW, frameH, outputW, outputH } = cfg;

  const [imgSrc,   setImgSrc]   = useState('');
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [minScale, setMinScale] = useState(1);
  const [maxScale, setMaxScale] = useState(4);
  const [scale,    setScale]    = useState(1);
  const [offset,   setOffset]   = useState({ x: 0, y: 0 });
  const [saving,   setSaving]   = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [mounted,  setMounted]  = useState(false);

  // Pointer tracking for drag + pinch
  const pointersRef    = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef   = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
  const pinchStartRef  = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Build imgSrc: object-URL for File inputs, direct URL for string inputs
  useEffect(() => {
    if (typeof src === 'string') {
      setImgSrc(src);
      return;
    }
    const url = URL.createObjectURL(src);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [src]);

  // Escape key to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const nw  = img.naturalWidth;
    const nh  = img.naturalHeight;
    setNaturalW(nw);
    setNaturalH(nh);
    // Minimum scale: image must fill the entire frame
    const min = Math.max(frameW / nw, frameH / nh);
    const max = min * 4;
    setMinScale(min);
    setMaxScale(max);
    setScale(min);
    setOffset({ x: 0, y: 0 });
    setLoaded(true);
  }

  const applyScale = useCallback((newScale: number, currentOffset: { x: number; y: number }) => {
    const clamped = Math.max(minScale, Math.min(maxScale, newScale));
    const newOffset = clampOffset(currentOffset.x, currentOffset.y, clamped, naturalW, naturalH, frameW, frameH);
    setScale(clamped);
    setOffset(newOffset);
  }, [minScale, maxScale, naturalW, naturalH, frameW, frameH]);

  /* ── Pointer events ── */

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, offsetX: offset.x, offsetY: offset.y };
      pinchStartRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchStartRef.current = { dist: distanceBetween(pts[0], pts[1]), scale };
      dragStartRef.current = null;
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = distanceBetween(pts[0], pts[1]);
      const newScale = pinchStartRef.current.scale * (dist / pinchStartRef.current.dist);
      applyScale(newScale, offset);
    } else if (pointersRef.current.size === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      const newOffset = clampOffset(
        dragStartRef.current.offsetX + dx,
        dragStartRef.current.offsetY + dy,
        scale, naturalW, naturalH, frameW, frameH,
      );
      setOffset(newOffset);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) dragStartRef.current = null;
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    applyScale(scale * factor, offset);
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value) / 100;
    const newScale = minScale + t * (maxScale - minScale);
    applyScale(newScale, offset);
  }

  function handleReset() {
    setScale(minScale);
    setOffset({ x: 0, y: 0 });
  }

  /* ── Canvas export ── */

  async function handleSave() {
    if (!loaded || naturalW === 0) return;
    setSaving(true);
    try {
      // Compute which part of the original image is visible in the frame
      const imgLeft = frameW / 2 + offset.x - (naturalW * scale) / 2;
      const imgTop  = frameH / 2 + offset.y - (naturalH * scale) / 2;
      const srcX    = (0 - imgLeft) / scale;
      const srcY    = (0 - imgTop)  / scale;
      const srcW    = frameW / scale;
      const srcH    = frameH / scale;

      const canvas = document.createElement('canvas');
      canvas.width  = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const img = new Image();
      // crossOrigin needed when src is a URL (not a same-origin blob URL) to avoid canvas taint
      if (typeof src === 'string') img.crossOrigin = 'anonymous';
      img.src = imgSrc;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH);

      canvas.toBlob(async (blob) => {
        if (!blob) { setSaving(false); return; }
        await onSave(blob);
        setSaving(false);
      }, 'image/jpeg', 0.93);
    } catch {
      setSaving(false);
    }
  }

  /* ── Derived render values ── */

  const renderedW = naturalW * scale;
  const renderedH = naturalH * scale;
  const imgLeft   = frameW / 2 + offset.x - renderedW / 2;
  const imgTop    = frameH / 2 + offset.y - renderedH / 2;

  const sliderValue = naturalW > 0
    ? ((scale - minScale) / (maxScale - minScale)) * 100
    : 0;

  /* ── Portal render ── */

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[98dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{cfg.label}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div className="flex items-center justify-center py-6 px-4 bg-[#111] shrink-0">

          {/* Outer dark area — creates the frame cutout effect */}
          <div
            className="relative select-none"
            style={{
              // Box shadow creates the dark overlay around the frame
              boxShadow: cfg.circle
                ? `0 0 0 9999px rgba(0,0,0,0.7)`
                : `0 0 0 9999px rgba(0,0,0,0.7)`,
              borderRadius: cfg.circle ? '50%' : '4px',
              width:  frameW,
              height: frameH,
              overflow: 'hidden',
              cursor: loaded ? 'grab' : 'default',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* Image — positioned absolutely within the frame */}
            {imgSrc && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imgSrc}
                alt=""
                draggable={false}
                onLoad={handleImgLoad}
                style={{
                  position: 'absolute',
                  width:  renderedW || undefined,
                  height: renderedH || undefined,
                  left:   loaded ? imgLeft : 0,
                  top:    loaded ? imgTop  : 0,
                  maxWidth: 'none',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  imageRendering: 'auto',
                  opacity: loaded ? 1 : 0,
                  transition: 'opacity 0.25s ease',
                }}
              />
            )}

            {/* Loading skeleton */}
            {!loaded && (
              <div className="absolute inset-0 bg-[var(--bg-elevated)] animate-pulse" />
            )}

            {/* Frame border — renders on top as a ring/rect */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                border: '2px solid rgba(255,255,255,0.7)',
                borderRadius: cfg.circle ? '50%' : 4,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-4 shrink-0">

          {/* Hint */}
          <p className="text-xs text-[var(--text-muted)] text-center">{cfg.hint}</p>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <svg className="size-4 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={sliderValue}
              onChange={handleSlider}
              disabled={!loaded}
              className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--bg-elevated)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand)] [&::-webkit-slider-thumb]:cursor-pointer [&:disabled]:opacity-40 cursor-pointer"
              style={{
                background: loaded
                  ? `linear-gradient(to right, var(--brand) ${sliderValue}%, var(--bg-elevated) ${sliderValue}%)`
                  : undefined,
              }}
            />
            <svg className="size-5 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>

          {/* Reset */}
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              disabled={!loaded}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)] disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.87"/>
              </svg>
              Restablecer encuadre
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t border-[var(--border)] flex gap-3 shrink-0"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !loaded}
            className="flex-1 h-11 rounded-xl bg-[var(--brand)] text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving
              ? <><span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando…</>
              : 'Guardar'
            }
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
