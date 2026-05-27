'use client';

import { useEffect, useState } from 'react';
import { getStoredAuthToken, resolveUrl } from '@/lib/utils';

function authHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function canPreviewByName(value: string): boolean {
  const lower = value.toLowerCase().split('?', 1)[0];
  return /\.(png|jpe?g|webp|gif|pdf)$/.test(lower);
}

function isLikelyMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isImageFile(value: string): boolean {
  const lower = value.toLowerCase().split('?', 1)[0];
  return /\.(png|jpe?g|webp|gif)$/.test(lower);
}

function triggerDownload(objectUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function SecureImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    async function load() {
      setError(false);
      setObjectUrl(null);
      const res = await fetch(resolveUrl(src) ?? src, { headers: authHeader() });
      if (!res.ok) throw new Error('No se pudo cargar la imagen');
      const blob = await res.blob();
      currentUrl = URL.createObjectURL(blob);
      if (!cancelled) setObjectUrl(currentUrl);
    }

    void load().catch(() => {
      if (!cancelled) {
        setObjectUrl(null);
        setError(true);
      }
    });
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src]);

  if (!objectUrl) {
    if (error) {
      return <div className="grid h-32 w-56 place-items-center rounded-xl bg-red-500/10 px-3 text-center text-xs text-red-500">No se pudo cargar la imagen</div>;
    }
    return <div className="grid h-32 w-56 place-items-center rounded-xl bg-black/10 text-xs opacity-70">Cargando imagen...</div>;
  }

  return <img src={objectUrl} alt={alt} className={className} />;
}

export async function openSecureAttachment(url: string, fileName: string) {
  const mobile = isLikelyMobile();
  const expectedImage = isImageFile(fileName) || isImageFile(url);
  const expectedPreview = expectedImage || (!mobile && (canPreviewByName(fileName) || canPreviewByName(url)));
  const previewWindow = !mobile && expectedPreview ? window.open('', '_blank') : null;

  try {
    if (previewWindow) {
      previewWindow.document.write('<!doctype html><title>FalconNet</title><body style="font-family:system-ui;padding:24px">Abriendo archivo...</body>');
    }

    const res = await fetch(resolveUrl(url) ?? url, { headers: authHeader() });
    if (!res.ok) throw new Error('No se pudo abrir el archivo');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const contentType = res.headers.get('content-type') ?? blob.type;
    const canPreview = !mobile && (contentType.startsWith('image/') || contentType === 'application/pdf');

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
      previewWindow.document.body.innerHTML = 'No se pudo abrir el archivo. Vuelve a intentarlo.';
    }
    window.alert('No se pudo abrir el archivo. Revisa tu conexión o vuelve a iniciar sesión.');
  }
}
