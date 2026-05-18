'use client';

import { useState } from 'react';
import { cn, getInitials } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
  online?: boolean;
  story?: boolean;
}

const sizeMap: Record<AvatarSize, { class: string; text: string }> = {
  xs: { class: 'size-6',  text: 'text-[10px]' },
  sm: { class: 'size-8',  text: 'text-xs' },
  md: { class: 'size-10', text: 'text-sm' },
  lg: { class: 'size-14', text: 'text-lg' },
  xl: { class: 'size-20', text: 'text-2xl' },
};

const onlineSizeMap: Record<AvatarSize, string> = {
  xs: 'size-2 border',
  sm: 'size-2.5 border',
  md: 'size-3 border-2',
  lg: 'size-3.5 border-2',
  xl: 'size-4 border-2',
};

const GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#3b82f6', '#2563eb'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'],
  ['#8b5cf6', '#7c3aed'],
  ['#ec4899', '#db2777'],
  ['#14b8a6', '#0d9488'],
];

function getGradient(name?: string): { background: string; color: string } {
  const idx = name
    ? Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length
    : 0;
  const [from, to] = GRADIENTS[idx];
  const color = idx === 3 ? '#1a1a2e' : '#ffffff';
  return {
    background: `linear-gradient(135deg, ${from}, ${to})`,
    color,
  };
}

function Avatar({ src, name, size = 'md', className, online, story }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { class: sizeClass, text } = sizeMap[size];
  const initials   = name ? getInitials(name) : '?';
  const showImage  = !!src && !imgError;
  const gradient   = getGradient(name);

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          sizeClass,
          'rounded-full overflow-hidden',
          story && 'ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--bg-surface)]',
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={name ?? 'Avatar'}
            onError={() => setImgError(true)}
            className="object-cover w-full h-full"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className={cn('w-full h-full flex items-center justify-center font-bold select-none', text)}
            style={gradient}
            aria-hidden
          >
            {initials}
          </div>
        )}
      </div>

      {online && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-green-500',
            'border-[var(--bg-surface)]',
            onlineSizeMap[size],
          )}
        />
      )}
    </div>
  );
}

export { Avatar };
