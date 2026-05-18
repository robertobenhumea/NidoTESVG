'use client';

import { useEffect, useRef, useState } from 'react';

// Output dimensions (4:3, 1200x900 JPEG)
const ASPECT_W  = 4;
const ASPECT_H  = 3;
const OUTPUT_W  = 1200;
const OUTPUT_H  = 900;
const MAX_SCALE = 5;

interface ImageCropModalProps {
  src:       string;
  file:      File;
  onConfirm: (cropped: File) => void;
  onCancel:  () => void;
}

export function ImageCropModal({ src, file, onConfirm, onCancel }: ImageCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);

  // Interaction refs (avoid stale closures in listeners)
  const isDragging  = useRef(false);
  const dragStart   = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTouch   = useRef<{ x: number; y: number } | null>(null);
  const lastPinch   = useRef<{ dist: number; initScale: number } | null>(null);

  const [offset,    setOffset]    = useState({ x: 0, y: 0 });
  const [scale,     setScale]     = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ESC + body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  // Non-passive wheel zoom on the crop container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.max(1, Math.min(MAX_SCALE, s - e.deltaY / 400)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Document-level mouse move/up for desktop drag
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !dragStart.current) return;
      setOffset({
        x: dragStart.current.ox + e.clientX - dragStart.current.x,
        y: dragStart.current.oy + e.clientY - dragStart.current.y,
      });
    }
    function onMouseUp() { isDragging.current = false; }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current  = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinch.current = null;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastPinch.current = { dist, initScale: scale };
      lastTouch.current = null;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastPinch.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const next = lastPinch.current.initScale * (dist / lastPinch.current.dist);
      setScale(Math.max(1, Math.min(MAX_SCALE, next)));
    }
  }

  function handleTouchEnd() {
    lastTouch.current = null;
    lastPinch.current = null;
  }

  function resetCrop() {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  }

  async function handleConfirm() {
    const img       = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) { onConfirm(file); return; }

    setExporting(true);
    try {
      const CW = container.clientWidth;
      const CH = container.clientHeight;
      const NW = img.naturalWidth;
      const NH = img.naturalHeight;

      // Scale that makes the image cover the container with object-fit: cover at zoom=1
      const coverScale = Math.max(CW / NW, CH / NH);

      // Natural image offset for the cover crop (centers the image)
      const natOffsetX = (NW - CW / coverScale) / 2;
      const natOffsetY = (NH - CH / coverScale) / 2;

      // Container (0,0) in element space (see derivation in getCropRect)
      const ex0 = CW / 2 * (1 - 1 / scale) - offset.x / scale;
      const ey0 = CH / 2 * (1 - 1 / scale) - offset.y / scale;

      // Source rect in natural image coords
      const srcX = natOffsetX + ex0 / coverScale;
      const srcY = natOffsetY + ey0 / coverScale;
      const srcW = CW / (scale * coverScale);
      const srcH = CH / (scale * coverScale);

      // Clamp to image bounds
      const clSrcX = Math.max(0, Math.min(NW - 1, srcX));
      const clSrcY = Math.max(0, Math.min(NH - 1, srcY));
      const clSrcW = Math.min(NW - clSrcX, Math.max(1, srcW));
      const clSrcH = Math.min(NH - clSrcY, Math.max(1, srcH));

      const canvas = document.createElement('canvas');
      canvas.width  = OUTPUT_W;
      canvas.height = OUTPUT_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { onConfirm(file); return; }

      ctx.drawImage(img, clSrcX, clSrcY, clSrcW, clSrcH, 0, 0, OUTPUT_W, OUTPUT_H);

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          onConfirm(blob
            ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            : file,
          );
          resolve();
        }, 'image/jpeg', 0.92);
      });
    } catch {
      onConfirm(file);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black select-none">

      {/* Top bar */}
      <div className="w-full max-w-lg flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onCancel}
          className="h-9 px-4 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
        <p className="text-sm font-semibold text-white tracking-tight">Ajustar foto</p>
        <button
          onClick={handleConfirm}
          disabled={exporting || !imgLoaded}
          className="h-9 px-4 rounded-xl text-sm font-semibold bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>

      {/* Crop viewport */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg overflow-hidden bg-black"
        style={{
          aspectRatio: `${ASPECT_W}/${ASPECT_H}`,
          cursor:      'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        aria-label="Área de recorte — arrastra para reencuadrar"
      >
        {/* Loading skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-white/10" />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform:       `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            willChange:      'transform',
            transition:      'none',
          }}
        />

        {/* Rule-of-thirds grid overlay */}
        {imgLoaded && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {/* Vertical thirds */}
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
            {/* Horizontal thirds */}
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
            {/* Corner brackets */}
            <div className="absolute top-3 left-3 size-5 border-t-2 border-l-2 border-white/70 rounded-tl" />
            <div className="absolute top-3 right-3 size-5 border-t-2 border-r-2 border-white/70 rounded-tr" />
            <div className="absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-white/70 rounded-bl" />
            <div className="absolute bottom-3 right-3 size-5 border-b-2 border-r-2 border-white/70 rounded-br" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-lg px-4 pt-4 pb-6 space-y-3 shrink-0">
        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <svg className="size-4 text-white/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
          </svg>
          <input
            type="range"
            min={1}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-[var(--brand)] h-1 rounded-full cursor-pointer"
            aria-label="Zoom"
          />
          <svg className="size-5 text-white/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
            <line x1="11" y1="8" x2="11" y2="14" strokeLinecap="round" />
            <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round" />
          </svg>
        </div>

        {/* Hints + reset */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-white/35">
            Arrastra · Pellizca · Scroll para zoom
          </p>
          <button
            onClick={resetCrop}
            className="text-[11px] font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            Restablecer
          </button>
        </div>
      </div>
    </div>
  );
}
