'use client';

import { useEffect, useState } from 'react';
import { getInitials } from '@/lib/utils';

interface AvatarModalProps {
  src?: string | null;
  name: string;
  open: boolean;
  onClose: () => void;
}

export function AvatarModal({ src, name, open, onClose }: AvatarModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={`Foto de perfil de ${name}`}
    >
      <button
        className="absolute top-4 right-4 size-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        onClick={onClose}
        aria-label="Cerrar"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className="relative size-64 md:size-80 rounded-full overflow-hidden ring-4 ring-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {src && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={`Foto de ${name}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-[var(--brand-muted)] to-[var(--brand)] flex items-center justify-center text-white text-6xl font-bold select-none">
            {getInitials(name)}
          </div>
        )}
      </div>

      <p className="mt-5 text-white font-semibold text-lg drop-shadow-sm select-none">
        {name}
      </p>
    </div>
  );
}
