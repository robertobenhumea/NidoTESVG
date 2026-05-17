import { cn } from '@/lib/utils';

type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

const roundedMap: Record<Rounded, string> = {
  none: '',
  sm:   'rounded',
  md:   'rounded-lg',
  lg:   'rounded-xl',
  xl:   'rounded-2xl',
  full: 'rounded-full',
};

interface SkeletonProps {
  className?: string;
  rounded?: Rounded;
  /** Convenience height (e.g. "h-4" Tailwind class or "20px" inline) */
  height?: string;
  width?: string;
}

/** Single skeleton block — compose these for skeleton screens. */
function Skeleton({ className, rounded = 'md', height, width }: SkeletonProps) {
  const isUtility = (v?: string) => v?.startsWith('h-') || v?.startsWith('w-') || v?.startsWith('size-');

  return (
    <div
      aria-hidden
      className={cn(
        'bg-[var(--bg-elevated)] animate-pulse',
        roundedMap[rounded],
        isUtility(height) ? height : undefined,
        isUtility(width)  ? width  : undefined,
        className,
      )}
      style={{
        height: !isUtility(height) ? height : undefined,
        width:  !isUtility(width)  ? width  : undefined,
      }}
    />
  );
}

/** Pre-composed avatar skeleton */
function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'size-8', md: 'size-10', lg: 'size-14' }[size];
  return <Skeleton rounded="full" className={s} />;
}

/** Pre-composed text line skeleton */
function SkeletonText({ lines = 1, lastWidth = '60%' }: { lines?: number; lastWidth?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          rounded="full"
          height="12px"
          width={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  );
}

/** Post card skeleton */
function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-1.5">
          <Skeleton rounded="full" height="14px" width="140px" />
          <Skeleton rounded="full" height="12px" width="90px" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <Skeleton rounded="xl" height="200px" />
    </div>
  );
}

export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonCard };
