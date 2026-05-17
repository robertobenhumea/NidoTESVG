'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';

interface AvatarModalProps {
  src?: string | null;
  name: string;
  open: boolean;
  onClose: () => void;
}

export function AvatarModal({ src, name, open, onClose }: AvatarModalProps) {
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
      {/* Close button */}
      <button
        className="absolute top-safe-top right-4 top-4 size-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
        </svg>
      </button>

      {/* Avatar */}
      <div
        className="relative size-64 md:size-80 rounded-full overflow-hidden ring-4 ring-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {src ? (
          <Image
            src={src}
            alt={`Foto de ${name}`}
            fill
            className="object-cover"
            sizes="320px"
            priority
          />
        ) : (
          <div className="size-full bg-[var(--brand-muted)] flex items-center justify-center text-[var(--brand-text)] text-6xl font-bold select-none">
            {getInitials(name)}
          </div>
        )}
      </div>

      {/* Name */}
      <p className="mt-5 text-white font-semibold text-lg drop-shadow-sm">
        {name}
      </p>
    </div>
  );
}
