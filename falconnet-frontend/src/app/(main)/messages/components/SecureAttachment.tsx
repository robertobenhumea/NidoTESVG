'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getStoredAuthToken, resolveUrl } from '@/lib/utils';

/* ── helpers ─────────────────────────────────────────────── */

function authHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function canPreviewByName(value: string): boolean {
  const lower = value.toLowerCase().split('?', 1)[0];
  return /\.(png|jpe?g|webp|gif|pdf)$/.test(lower);
}

function isPdfFile(value: string): boolean {
  return /\.pdf($|\?)/i.test(value);
}

function isLikelyMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isImageFile(value: string): boolean {
  const lower = value.toLowerCase().split('?', 1)[0];
  return /\.(png|jpe?g|webp|gif)$/.test(lower);
}

export function isAudioFile(value: string): boolean {
  return /\.(webm|ogg|mp3|m4a|mp4|wav)($|\?)/i.test(value);
}

export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📋';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (ext === 'txt') return '📃';
  if (['mp3', 'ogg', 'wav', 'm4a'].includes(ext)) return '🎵';
  if (['mp4', 'mov'].includes(ext)) return '🎬';
  return '📎';
}

export function fetchBlobWithProgress(
  url: string,
  onProgress?: (percent: number) => void,
): Promise<{ blob: Blob; contentType: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', resolveUrl(url) ?? url);
    const token = getStoredAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'blob';
    xhr.onprogress = event => {
      if (event.lengthComputable && onProgress)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({
          blob: xhr.response as Blob,
          contentType:
            xhr.getResponseHeader('content-type') ?? (xhr.response as Blob).type,
        });
      } else {
        reject(new Error('No se pudo abrir el archivo'));
      }
    };
    xhr.onerror = () => reject(new Error('No se pudo abrir el archivo'));
    xhr.send();
  });
}

function triggerDownload(objectUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ── SecureImage ─────────────────────────────────────────── */

export function SecureImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    setObjectUrl(null);
    setError(false);
    setLoaded(false);

    void (async () => {
      try {
        const res = await fetch(resolveUrl(src) ?? src, { headers: authHeader() });
        if (!res.ok) throw new Error('err');
        const blob = await res.blob();
        currentUrl = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(currentUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src]);

  if (error) {
    return (
      <div className="grid h-32 w-56 place-items-center rounded-xl bg-red-500/10 px-3 text-center text-xs text-red-500">
        No se pudo cargar
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div
        className={`animate-pulse rounded-xl bg-[var(--bg-elevated)] ${className ?? 'h-32 w-56'}`}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt={alt}
      className={`${className ?? ''} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onClick={onClick}
      style={onClick ? { cursor: 'zoom-in' } : undefined}
    />
  );
}

/* ── openSecureAttachment ────────────────────────────────── */

export async function openSecureAttachment(
  url: string,
  fileName: string,
  onProgress?: (percent: number) => void,
) {
  const mobile = isLikelyMobile();
  const expectedImage = isImageFile(fileName) || isImageFile(url);
  const expectedPreview =
    expectedImage || (!mobile && (canPreviewByName(fileName) || canPreviewByName(url)));
  const previewWindow =
    !mobile && expectedPreview ? window.open('', '_blank') : null;

  try {
    if (previewWindow) {
      previewWindow.document.write(
        '<!doctype html><title>FalconNet</title><body style="font-family:system-ui;padding:24px">Abriendo archivo…</body>',
      );
    }

    const { blob, contentType } = await fetchBlobWithProgress(url, onProgress);
    const objectUrl = URL.createObjectURL(blob);
    const canPreview =
      !mobile &&
      (contentType.startsWith('image/') || contentType === 'application/pdf');

    if (canPreview) {
      if (previewWindow) {
        previewWindow.location.href = objectUrl;
      } else {
        const opened = window.open(objectUrl, '_blank');
        if (!opened) triggerDownload(objectUrl, fileName);
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      return;
    }

    previewWindow?.close();
    triggerDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  } catch {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.document.body.innerHTML =
        'No se pudo abrir el archivo. Vuelve a intentarlo.';
    }
    window.alert('No se pudo abrir el archivo. Revisa tu conexión o vuelve a iniciar sesión.');
  }
}

/* ── Types ───────────────────────────────────────────────── */

export type AttachmentViewerItem = {
  url: string;
  fileName: string;
  type?: string | null;
};

/* ── SecureAttachmentViewer ──────────────────────────────── */

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DOUBLE_TAP_MS = 280;
const SWIPE_THRESHOLD = 55;

function clampZoom(z: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

function getTouchDist(touches: React.TouchList): number | null {
  if (touches.length < 2) return null;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export function SecureAttachmentViewer({
  item,
  items = [],
  onClose,
}: {
  item: AttachmentViewerItem;
  items?: AttachmentViewerItem[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(
    () => Math.max(0, items.findIndex(e => e.url === item.url)),
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const imgWrapRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);
  const touchRef = useRef<{ startX: number; startY: number; px: number; py: number; dist: number | null; time: number } | null>(null);
  const lastTapRef = useRef(0);

  const current = items[index] ?? item;

  const kind = useMemo(() => {
    if (current.type === 'IMAGE' || isImageFile(current.fileName) || isImageFile(current.url)) return 'image';
    if (current.type === 'AUDIO' || isAudioFile(current.fileName) || isAudioFile(current.url)) return 'audio';
    if (isPdfFile(current.fileName) || isPdfFile(current.url)) return 'pdf';
    return 'document';
  }, [current]);

  const navigate = useCallback((dir: 1 | -1) => {
    setIndex(i => Math.max(0, Math.min(items.length - 1, i + dir)));
  }, [items.length]);

  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  /* reset zoom on index change */
  useEffect(() => { resetZoom(); }, [index, resetZoom]);

  /* load blob */
  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    setProgress(0);
    setError('');
    setObjectUrl(null);

    fetchBlobWithProgress(current.url, setProgress)
      .then(({ blob }) => {
        localUrl = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(localUrl);
      })
      .catch(err => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'No se pudo abrir el archivo');
      });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [current.url]);

  /* keyboard */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (items.length > 1) {
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft') navigate(-1);
      }
      if (kind === 'image') {
        if (e.key === '+' || e.key === '=') setZoom(z => clampZoom(z + 0.3));
        if (e.key === '-') setZoom(z => { const n = clampZoom(z - 0.3); if (n === 1) setPan({ x: 0, y: 0 }); return n; });
        if (e.key === '0') resetZoom();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items.length, kind, navigate, onClose, resetZoom]);

  /* wheel zoom */
  useEffect(() => {
    if (kind !== 'image') return;
    const el = imgWrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => {
        const n = clampZoom(z - e.deltaY * 0.0015);
        if (n === 1) setPan({ x: 0, y: 0 });
        return n;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [kind]);

  /* mouse drag pan */
  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1 || kind !== 'image') return;
    e.preventDefault();
    mouseRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!mouseRef.current) return;
    setPan({ x: mouseRef.current.px + e.clientX - mouseRef.current.startX, y: mouseRef.current.py + e.clientY - mouseRef.current.startY });
  }
  function onMouseUp() { mouseRef.current = null; }

  /* touch */
  function onTouchStart(e: React.TouchEvent) {
    const now = Date.now();
    /* double-tap zoom toggle */
    if (e.touches.length === 1 && kind === 'image') {
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        zoom > 1 ? resetZoom() : setZoom(2.5);
        touchRef.current = null;
        return;
      }
      lastTapRef.current = now;
    }
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      px: pan.x, py: pan.y,
      dist: getTouchDist(e.touches),
      time: now,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current) return;

    /* pinch to zoom */
    if (e.touches.length === 2 && touchRef.current.dist !== null) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches);
      if (newDist !== null) {
        setZoom(z => clampZoom(z * (newDist / touchRef.current!.dist!)));
        touchRef.current = { ...touchRef.current, dist: newDist };
      }
      return;
    }

    /* pan when zoomed */
    if (zoom > 1 && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const dy = e.touches[0].clientY - touchRef.current.startY;
      setPan({ x: touchRef.current.px + dx, y: touchRef.current.py + dy });
      return;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    const elapsed = Date.now() - touchRef.current.time;
    /* swipe navigation (only when not zoomed) */
    if (zoom <= 1 && items.length > 1 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dy) < 80 && elapsed < 400) {
      dx < 0 ? navigate(1) : navigate(-1);
    }
    touchRef.current = null;
  }

  /* download */
  async function download() {
    if (objectUrl) { triggerDownload(objectUrl, current.fileName); return; }
    setDownloading(true);
    setDlProgress(0);
    try {
      const { blob } = await fetchBlobWithProgress(current.url, setDlProgress);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, current.fileName);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch { window.alert('No se pudo descargar el archivo.'); }
    finally { setDownloading(false); setDlProgress(0); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95 text-white" role="dialog" aria-modal>

      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 px-3 bg-black/40 backdrop-blur-sm">
        <button type="button" onClick={onClose}
          className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
          aria-label="Cerrar">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{current.fileName}</p>
          {items.length > 1 && <p className="text-[11px] text-white/40 leading-tight">{index + 1} / {items.length}</p>}
        </div>

        {/* Zoom controls (desktop, image only) */}
        {kind === 'image' && objectUrl && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setZoom(z => { const n = clampZoom(z - 0.3); if (n === 1) setPan({ x: 0, y: 0 }); return n; })} disabled={zoom <= 1}
              className="grid size-7 place-items-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm font-bold" aria-label="Alejar">−</button>
            <span className="min-w-[40px] text-center text-[11px] tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(z => clampZoom(z + 0.3))} disabled={zoom >= MAX_ZOOM}
              className="grid size-7 place-items-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm font-bold" aria-label="Acercar">+</button>
            {zoom > 1 && (
              <button type="button" onClick={resetZoom} className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px]">1:1</button>
            )}
          </div>
        )}

        {/* Download button */}
        <button type="button" onClick={() => void download()} disabled={downloading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-60 transition-colors">
          {downloading ? (
            <><span className="inline-block size-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />{dlProgress}%</>
          ) : (
            <><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>Descargar</>
          )}
        </button>
      </div>

      {/* Content */}
      <div ref={imgWrapRef}
        className="relative min-h-0 flex-1 overflow-hidden select-none"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}>

        {/* Loading */}
        {!objectUrl && !error && (
          <div className="grid h-full place-items-center px-6">
            <div className="w-full max-w-xs text-center">
              <div className="mb-4 flex justify-center">
                <span className="inline-block size-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-white transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-sm text-white/50">{progress > 0 ? `${progress}%` : 'Cargando…'}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="mb-3 text-4xl">⚠️</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* IMAGE */}
        {objectUrl && kind === 'image' && (
          <div className="grid h-full w-full place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={objectUrl} alt={current.fileName} draggable={false}
              onDoubleClick={() => zoom > 1 ? resetZoom() : setZoom(2.5)}
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: mouseRef.current ? 'none' : 'transform 0.12s ease',
                maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                userSelect: 'none', cursor: zoom > 1 ? 'grab' : 'zoom-in',
              }}
            />
          </div>
        )}

        {/* PDF */}
        {objectUrl && kind === 'pdf' && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between bg-white/5 px-4 py-2">
              <span className="text-xs text-white/60">📄 Vista previa del PDF</span>
              <button type="button" onClick={() => void download()} className="text-xs text-[var(--brand)] hover:underline">Descargar</button>
            </div>
            <iframe src={objectUrl} title={current.fileName} className="min-h-0 flex-1 w-full bg-white" />
          </div>
        )}

        {/* AUDIO */}
        {objectUrl && kind === 'audio' && (
          <div className="grid h-full place-items-center px-6">
            <div className="w-full max-w-xl rounded-2xl bg-white/10 p-6 text-center">
              <p className="mb-1 text-4xl">🎵</p>
              <p className="mb-4 text-sm font-semibold truncate">{current.fileName}</p>
              <audio src={objectUrl} controls className="w-full" />
            </div>
          </div>
        )}

        {/* DOCUMENT */}
        {objectUrl && kind === 'document' && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="mb-3 text-5xl">{getFileIcon(current.fileName)}</p>
              <p className="mb-1 text-base font-semibold">{current.fileName}</p>
              <p className="mb-6 text-sm text-white/50">Vista previa no disponible.</p>
              <button type="button" onClick={() => void download()}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90">
                Descargar archivo
              </button>
            </div>
          </div>
        )}

        {/* Nav arrows (desktop) */}
        {items.length > 1 && (
          <>
            <button type="button" onClick={() => navigate(-1)} disabled={index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-0 transition-all backdrop-blur-sm"
              aria-label="Anterior">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" onClick={() => navigate(1)} disabled={index >= items.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-0 transition-all backdrop-blur-sm"
              aria-label="Siguiente">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail dots / strip */}
      {items.length > 1 && (
        <div className="shrink-0 bg-black/40 py-2.5 px-4">
          {items.length <= 12 ? (
            <div className="flex justify-center gap-1.5">
              {items.map((_, i) => (
                <button key={i} type="button" onClick={() => setIndex(i)}
                  className={`rounded-full transition-all ${i === index ? 'size-2.5 bg-white' : 'size-2 bg-white/30 hover:bg-white/60'}`}
                  aria-label={`Archivo ${i + 1}`} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-xs text-white/60">
              <button type="button" onClick={() => navigate(-1)} disabled={index === 0}
                className="rounded bg-white/10 px-2.5 py-1 disabled:opacity-30 hover:bg-white/20">Anterior</button>
              <span className="tabular-nums">{index + 1} / {items.length}</span>
              <button type="button" onClick={() => navigate(1)} disabled={index >= items.length - 1}
                className="rounded bg-white/10 px-2.5 py-1 disabled:opacity-30 hover:bg-white/20">Siguiente</button>
            </div>
          )}
        </div>
      )}

      {/* keyboard hint */}
      <p className="hidden sm:block shrink-0 pb-1.5 text-center text-[10px] text-white/20 select-none">
        ← → navegar &nbsp;·&nbsp; +/− zoom &nbsp;·&nbsp; 0 reset &nbsp;·&nbsp; Esc cerrar
        {kind === 'image' ? ' &nbsp;·&nbsp; doble clic / rueda zoom' : ''}
      </p>
    </div>
  );
}
