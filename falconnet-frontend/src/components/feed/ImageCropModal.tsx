'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const ASPECT_W  = 4;
const ASPECT_H  = 3;
const OUTPUT_W  = 1200;
const OUTPUT_H  = 900;
const MAX_SCALE = 5;
const MIN_SCALE = 0.25;

interface ImageCropModalProps {
  src:       string;
  file:      File;
  onConfirm: (cropped: File) => void;
  onCancel:  () => void;
}

export function ImageCropModal({ src, file, onConfirm, onCancel }: ImageCropModalProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const imgRef        = useRef<HTMLImageElement>(null);
  const fillScaleRef  = useRef(1);

  const isDragging = useRef(false);
  const dragStart  = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTouch  = useRef<{ x: number; y: number } | null>(null);
  const lastPinch  = useRef<{ dist: number; initScale: number } | null>(null);

  const [offset,    setOffset]    = useState({ x: 0, y: 0 });
  const [scale,     setScale]     = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cropRect,  setCropRect]  = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Compute crop frame rect centered in the container
  const updateCropRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const CW = el.clientWidth;
    const CH = el.clientHeight;
    const pad = 28;
    let w = Math.min(CW - pad * 2, (CH - pad * 2) * ASPECT_W / ASPECT_H);
    let h = w * ASPECT_H / ASPECT_W;
    if (h > CH - pad * 2) { h = CH - pad * 2; w = h * ASPECT_W / ASPECT_H; }
    setCropRect({ x: (CW - w) / 2, y: (CH - h) / 2, w, h });
  }, []);

  useEffect(() => {
    updateCropRect();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateCropRect);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateCropRect]);

  // After image loads and crop rect is ready, set initial scale so image fills the crop frame
  useEffect(() => {
    if (!imgLoaded || cropRect.w === 0) return;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;
    const CW = container.clientWidth;
    const CH = container.clientHeight;
    const cs = Math.min(CW / img.naturalWidth, CH / img.naturalHeight);
    // scale at which image exactly covers the crop frame (like object-cover within crop area)
    const fill = Math.max(
      cropRect.w / (img.naturalWidth  * cs),
      cropRect.h / (img.naturalHeight * cs),
    );
    fillScaleRef.current = fill;
    setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, fill)));
  }, [imgLoaded, cropRect]);

  // ESC + body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onCancel]);

  // Non-passive wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s - e.deltaY / 400)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Document-level mouse drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !dragStart.current) return;
      setOffset({
        x: dragStart.current.ox + e.clientX - dragStart.current.x,
        y: dragStart.current.oy + e.clientY - dragStart.current.y,
      });
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',  onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
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
      setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, lastPinch.current.initScale * (dist / lastPinch.current.dist))));
    }
  }

  function handleTouchEnd() { lastTouch.current = null; lastPinch.current = null; }

  function resetCrop() {
    setOffset({ x: 0, y: 0 });
    setScale(fillScaleRef.current);
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

      // object-contain base scale — maps natural px → CSS px at scale=1
      const cs = Math.min(CW / NW, CH / NH);

      // Formula: screen pixel (sx,sy) → image pixel
      //   imgX = (sx - CW/2 - offset.x) / (scale * cs) + NW/2
      //   imgY = (sy - CH/2 - offset.y) / (scale * cs) + NH/2
      const { x: cropX, y: cropY, w: cropW, h: cropH } = cropRect;

      const srcX = (cropX              - CW / 2 - offset.x) / (scale * cs) + NW / 2;
      const srcY = (cropY              - CH / 2 - offset.y) / (scale * cs) + NH / 2;
      const srcW = cropW / (scale * cs);
      const srcH = cropH / (scale * cs);

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

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);
      ctx.drawImage(img, clSrcX, clSrcY, clSrcW, clSrcH, 0, 0, OUTPUT_W, OUTPUT_H);

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          onConfirm(
            blob
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
    <div className="fixed inset-0 z-[200] flex flex-col bg-black select-none">

      {/* ── Top bar ── */}
      <div className="w-full flex items-center justify-between px-4 py-3 shrink-0">
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

      {/* ── Image area ── */}
      {/* Full image is visible; crop frame shows the selected region */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full overflow-hidden"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        aria-label="Área de ajuste — arrastra para reencuadrar"
      >
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
        )}

        {/* Full image — object-contain keeps the entire image visible */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={() => { setImgLoaded(true); updateCropRect(); }}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            transform:       `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            willChange:      'transform',
            transition:      'none',
          }}
        />

        {/* Dark overlay + crop frame — four-rect technique avoids SVG complexity */}
        {imgLoaded && cropRect.w > 0 && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden>

            {/* Dimmed regions outside the crop frame */}
            <div className="absolute top-0 left-0 right-0 bg-black/65"
              style={{ height: cropRect.y }} />
            <div className="absolute left-0 right-0 bottom-0 bg-black/65"
              style={{ top: cropRect.y + cropRect.h }} />
            <div className="absolute bg-black/65"
              style={{ top: cropRect.y, height: cropRect.h, left: 0, width: cropRect.x }} />
            <div className="absolute bg-black/65"
              style={{ top: cropRect.y, height: cropRect.h, left: cropRect.x + cropRect.w, right: 0 }} />

            {/* Crop frame */}
            <div
              className="absolute border border-white/70"
              style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
            >
              {/* Rule-of-thirds */}
              <div className="absolute inset-y-0 left-1/3  w-px bg-white/20" />
              <div className="absolute inset-y-0 left-2/3  w-px bg-white/20" />
              <div className="absolute inset-x-0 top-1/3   h-px bg-white/20" />
              <div className="absolute inset-x-0 top-2/3   h-px bg-white/20" />

              {/* Corner brackets */}
              <div className="absolute top-0    left-0  size-5 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute top-0    right-0 size-5 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute bottom-0 left-0  size-5 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-white rounded-br" />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div
        className="w-full px-4 pt-4 pb-6 space-y-3 shrink-0"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <svg className="size-4 text-white/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
          </svg>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-[var(--brand)] h-1 rounded-full cursor-pointer"
            aria-label="Zoom"
          />
          <svg className="size-5 text-white/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
            <line x1="11" y1="8"  x2="11"   y2="14"    strokeLinecap="round" />
            <line x1="8"  y1="11" x2="14"   y2="11"    strokeLinecap="round" />
          </svg>
        </div>

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
