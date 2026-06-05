'use client';

/**
 * MailAttachmentViewer — fullscreen viewer for mail attachments
 *
 * Features:
 *  - Secure fetch via JWT (no public URLs)
 *  - Images: zoom (wheel + pinch + double-tap), pan, keyboard nav, swipe
 *  - PDFs: inline iframe preview + download
 *  - Docs/audio: icon + download button
 *  - Download with % progress
 *  - Multi-file navigation (dots / arrows)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStoredAuthToken } from '@/lib/utils';

/* ── helpers ─────────────────────────────────────────────── */

function resolveSecure(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function authFetchXHR(
  url: string,
  onProgress?: (pct: number) => void,
): Promise<{ blob: Blob; contentType: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', resolveSecure(url));
    const token = getStoredAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'blob';
    xhr.onprogress = ev => {
      if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ blob: xhr.response as Blob, contentType: xhr.getResponseHeader('content-type') ?? (xhr.response as Blob).type });
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send();
  });
}

function triggerDownload(objectUrl: string, fileName: string) {
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function isMailImage(name: string, mime?: string | null): boolean {
  if (mime?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(name);
}

export function isMailPdf(name: string, mime?: string | null): boolean {
  if (mime === 'application/pdf') return true;
  return /\.pdf$/i.test(name);
}

export function isMailAudio(name: string, mime?: string | null): boolean {
  if (mime?.startsWith('audio/')) return true;
  return /\.(mp3|ogg|wav|m4a|webm)$/i.test(name);
}

function fileEmoji(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📋';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (ext === 'txt') return '📃';
  if (['mp3', 'ogg', 'wav', 'm4a'].includes(ext)) return '🎵';
  if (['mp4', 'mov', 'webm'].includes(ext)) return '🎬';
  return '📎';
}

/* ── Zoom / pan constants ─────────────────────────────────── */

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DOUBLE_TAP_MS = 280;
const SWIPE_PX = 55;

function clamp(z: number) { return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)); }

function getTouchDist(t: React.TouchList): number | null {
  if (t.length < 2) return null;
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}

/* ── Types ───────────────────────────────────────────────── */

export interface MailViewerItem {
  /** Secure relative URL, e.g. /correos/adjuntos/42/descargar */
  downloadUrl: string;
  nombreArchivo: string;
  tipoArchivo?: string | null;
  tamanio?: number | null;
}

/* ── SecureMailThumbnail ─────────────────────────────────── */

/**
 * Loads an image securely (JWT) and renders a thumbnail.
 * Shows a shimmer skeleton while loading.
 */
export function SecureMailThumbnail({
  downloadUrl,
  alt,
  className,
  onClick,
}: {
  downloadUrl: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setObjectUrl(null);
    setError(false);
    setLoaded(false);

    void (async () => {
      try {
        const { blob } = await authFetchXHR(downloadUrl);
        url = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(url);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [downloadUrl]);

  if (error) {
    return (
      <div className={`grid place-items-center rounded-lg bg-red-500/10 text-xs text-red-500 ${className ?? 'h-16 w-16'}`}>
        ✗
      </div>
    );
  }

  if (!objectUrl) {
    return <div className={`animate-pulse rounded-lg bg-[var(--bg-elevated)] ${className ?? 'h-16 w-16'}`} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt={alt}
      className={`${className ?? ''} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={() => setLoaded(true)}
      onClick={onClick}
      style={onClick ? { cursor: 'zoom-in' } : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}

/* ── MailAttachmentViewer ────────────────────────────────── */

export function MailAttachmentViewer({
  item,
  items = [],
  onClose,
}: {
  item: MailViewerItem;
  items?: MailViewerItem[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex(i => i.downloadUrl === item.downloadUrl)));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [dlProgress, setDlProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  /* zoom / pan */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const touchRef = useRef<{ sx: number; sy: number; px: number; py: number; dist: number | null; time: number } | null>(null);
  const lastTapRef = useRef(0);

  const current = items[index] ?? item;
  const kind = useMemo(() => {
    if (isMailImage(current.nombreArchivo, current.tipoArchivo)) return 'image';
    if (isMailPdf(current.nombreArchivo, current.tipoArchivo)) return 'pdf';
    if (isMailAudio(current.nombreArchivo, current.tipoArchivo)) return 'audio';
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
    let url: string | null = null;
    setLoadPct(0);
    setLoadError('');
    setObjectUrl(null);

    authFetchXHR(current.downloadUrl, setLoadPct)
      .then(({ blob }) => {
        url = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(url);
      })
      .catch(err => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'No se pudo abrir el archivo');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [current.downloadUrl]);

  /* keyboard */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (items.length > 1) {
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft') navigate(-1);
      }
      if (kind === 'image') {
        if (e.key === '+' || e.key === '=') setZoom(z => clamp(z + 0.3));
        if (e.key === '-') setZoom(z => { const n = clamp(z - 0.3); if (n === 1) setPan({ x: 0, y: 0 }); return n; });
        if (e.key === '0') resetZoom();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items.length, kind, navigate, onClose, resetZoom]);

  /* wheel zoom */
  useEffect(() => {
    if (kind !== 'image') return;
    const el = wrapRef.current;
    if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => { const n = clamp(z - e.deltaY * 0.0015); if (n === 1) setPan({ x: 0, y: 0 }); return n; });
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, [kind]);

  /* mouse drag */
  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1 || kind !== 'image') return;
    e.preventDefault();
    mouseRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!mouseRef.current) return;
    setPan({ x: mouseRef.current.px + e.clientX - mouseRef.current.sx, y: mouseRef.current.py + e.clientY - mouseRef.current.sy });
  }
  function onMouseUp() { mouseRef.current = null; }

  /* touch */
  function onTouchStart(e: React.TouchEvent) {
    const now = Date.now();
    if (e.touches.length === 1 && kind === 'image') {
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        zoom > 1 ? resetZoom() : setZoom(2.5);
        touchRef.current = null;
        return;
      }
      lastTapRef.current = now;
    }
    touchRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: pan.x, py: pan.y, dist: getTouchDist(e.touches), time: now };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current) return;
    if (e.touches.length === 2 && touchRef.current.dist !== null) {
      e.preventDefault();
      const nd = getTouchDist(e.touches);
      if (nd !== null) { setZoom(z => clamp(z * (nd / touchRef.current!.dist!))); touchRef.current = { ...touchRef.current, dist: nd }; }
      return;
    }
    if (zoom > 1 && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchRef.current.sx, dy = e.touches[0].clientY - touchRef.current.sy;
      setPan({ x: touchRef.current.px + dx, y: touchRef.current.py + dy });
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.sx;
    const dy = e.changedTouches[0].clientY - touchRef.current.sy;
    if (zoom <= 1 && items.length > 1 && Math.abs(dx) > SWIPE_PX && Math.abs(dy) < 80 && Date.now() - touchRef.current.time < 400) {
      dx < 0 ? navigate(1) : navigate(-1);
    }
    touchRef.current = null;
  }

  /* download */
  async function download() {
    if (objectUrl) { triggerDownload(objectUrl, current.nombreArchivo); return; }
    setDownloading(true);
    setDlProgress(0);
    try {
      const { blob } = await authFetchXHR(current.downloadUrl, setDlProgress);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, current.nombreArchivo);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch { window.alert('No se pudo descargar el archivo.'); }
    finally { setDownloading(false); setDlProgress(0); }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 text-white" role="dialog" aria-modal>

      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-black/40 backdrop-blur-sm px-3">
        <button type="button" onClick={onClose}
          className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
          aria-label="Cerrar">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{current.nombreArchivo}</p>
          <p className="text-[11px] text-white/40 leading-tight">
            {current.tipoArchivo ?? kind}
            {current.tamanio ? ` · ${current.tamanio < 1024 * 1024 ? `${Math.ceil(current.tamanio / 1024)} KB` : `${(current.tamanio / (1024 * 1024)).toFixed(1)} MB`}` : ''}
            {items.length > 1 ? ` · ${index + 1}/${items.length}` : ''}
          </p>
        </div>

        {/* zoom controls — image only, desktop */}
        {kind === 'image' && objectUrl && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setZoom(z => { const n = clamp(z - 0.3); if (n === 1) setPan({ x: 0, y: 0 }); return n; })} disabled={zoom <= 1}
              className="grid size-7 place-items-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm font-bold">−</button>
            <span className="min-w-[40px] text-center text-[11px] tabular-nums text-white/60">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(z => clamp(z + 0.3))} disabled={zoom >= MAX_ZOOM}
              className="grid size-7 place-items-center rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm font-bold">+</button>
            {zoom > 1 && <button type="button" onClick={resetZoom} className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px]">1:1</button>}
          </div>
        )}

        {/* download */}
        <button type="button" onClick={() => void download()} disabled={downloading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-60 transition-colors">
          {downloading
            ? <><span className="inline-block size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />{dlProgress}%</>
            : <><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>Descargar</>
          }
        </button>
      </div>

      {/* Content */}
      <div ref={wrapRef}
        className="relative min-h-0 flex-1 overflow-hidden select-none"
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}>

        {/* Loading */}
        {!objectUrl && !loadError && (
          <div className="grid h-full place-items-center px-6">
            <div className="w-full max-w-xs text-center">
              <span className="mb-4 inline-block size-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-white transition-all duration-150" style={{ width: `${loadPct}%` }} />
              </div>
              <p className="mt-2 text-sm text-white/50">{loadPct > 0 ? `${loadPct}%` : 'Cargando…'}</p>
            </div>
          </div>
        )}

        {loadError && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div><p className="mb-3 text-4xl">⚠️</p><p className="text-sm text-red-300">{loadError}</p></div>
          </div>
        )}

        {/* IMAGE */}
        {objectUrl && kind === 'image' && (
          <div className="grid h-full w-full place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={objectUrl} alt={current.nombreArchivo} draggable={false}
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
              <button type="button" onClick={() => void download()} className="text-xs text-[var(--brand)] hover:underline">Descargar PDF</button>
            </div>
            <iframe src={objectUrl} title={current.nombreArchivo} className="min-h-0 flex-1 w-full bg-white" />
          </div>
        )}

        {/* AUDIO */}
        {objectUrl && kind === 'audio' && (
          <div className="grid h-full place-items-center px-6">
            <div className="w-full max-w-xl rounded-2xl bg-white/10 p-6 text-center">
              <p className="mb-1 text-4xl">🎵</p>
              <p className="mb-4 text-sm font-semibold truncate">{current.nombreArchivo}</p>
              <audio src={objectUrl} controls className="w-full" />
            </div>
          </div>
        )}

        {/* DOCUMENT */}
        {objectUrl && kind === 'document' && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="mb-3 text-5xl">{fileEmoji(current.nombreArchivo)}</p>
              <p className="mb-1 text-base font-semibold">{current.nombreArchivo}</p>
              <p className="mb-6 text-sm text-white/50">Vista previa no disponible para este tipo de archivo.</p>
              <button type="button" onClick={() => void download()} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90">
                Descargar archivo
              </button>
            </div>
          </div>
        )}

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <button type="button" onClick={() => navigate(-1)} disabled={index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-0 transition-all backdrop-blur-sm">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" onClick={() => navigate(1)} disabled={index >= items.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-0 transition-all backdrop-blur-sm">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Dots / strip */}
      {items.length > 1 && (
        <div className="shrink-0 bg-black/40 py-2.5 px-4">
          {items.length <= 12 ? (
            <div className="flex justify-center gap-1.5">
              {items.map((_, i) => (
                <button key={i} type="button" onClick={() => setIndex(i)}
                  className={`rounded-full transition-all ${i === index ? 'size-2.5 bg-white' : 'size-2 bg-white/30 hover:bg-white/60'}`} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-xs text-white/60">
              <button type="button" onClick={() => navigate(-1)} disabled={index === 0} className="rounded bg-white/10 px-2.5 py-1 disabled:opacity-30">Ant.</button>
              <span className="tabular-nums">{index + 1} / {items.length}</span>
              <button type="button" onClick={() => navigate(1)} disabled={index >= items.length - 1} className="rounded bg-white/10 px-2.5 py-1 disabled:opacity-30">Sig.</button>
            </div>
          )}
        </div>
      )}

      <p className="hidden sm:block shrink-0 pb-1.5 text-center text-[10px] text-white/20 select-none">
        ← → navegar &nbsp;·&nbsp; +/− zoom &nbsp;·&nbsp; 0 reset &nbsp;·&nbsp; Esc cerrar
        {kind === 'image' ? ' &nbsp;·&nbsp; doble clic / rueda zoom' : ''}
      </p>
    </div>
  );
}
