'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PostMediaProps {
  src:  string;
  alt?: string;
}

export function PostMedia({ src, alt = 'Imagen de la publicación' }: PostMediaProps) {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  if (error) return null;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-[var(--bg-elevated)]',
        !loaded && 'min-h-[200px]',
      )}
    >
      {/* Skeleton pulse — visible until image loads */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-[var(--bg-elevated)]" />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          'w-full max-h-[520px] object-cover block',
          'transition-opacity duration-300 ease-in',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
