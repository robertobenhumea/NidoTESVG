import Image from 'next/image';
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

const sizeMap: Record<AvatarSize, { px: number; class: string; text: string }> = {
  xs: { px: 24, class: 'size-6',  text: 'text-[10px]' },
  sm: { px: 32, class: 'size-8',  text: 'text-xs' },
  md: { px: 40, class: 'size-10', text: 'text-sm' },
  lg: { px: 56, class: 'size-14', text: 'text-lg' },
  xl: { px: 80, class: 'size-20', text: 'text-2xl' },
};

const onlineSizeMap: Record<AvatarSize, string> = {
  xs: 'size-2 border',
  sm: 'size-2.5 border',
  md: 'size-3 border-2',
  lg: 'size-3.5 border-2',
  xl: 'size-4 border-2',
};

function Avatar({ src, name, size = 'md', className, online, story }: AvatarProps) {
  const { px, class: sizeClass, text } = sizeMap[size];
  const initials = name ? getInitials(name) : '?';

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          sizeClass,
          'rounded-full overflow-hidden',
          story &&
            'ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--bg-surface)]',
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={name ?? 'Avatar'}
            width={px}
            height={px}
            className="object-cover w-full h-full"
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center font-semibold',
              'bg-[var(--brand-muted)] text-[var(--brand-text)]',
              text,
            )}
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
