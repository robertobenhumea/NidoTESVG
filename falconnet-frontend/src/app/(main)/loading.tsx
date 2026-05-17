import { SkeletonCard, SkeletonAvatar, Skeleton } from '@/components/ui/Skeleton';

export default function MainLoading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Stories bar skeleton */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <Skeleton rounded="xl" className="size-16" />
            <Skeleton rounded="full" height="10px" width="48px" />
          </div>
        ))}
      </div>

      {/* Create post skeleton */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3">
        <SkeletonAvatar />
        <Skeleton rounded="xl" className="flex-1 h-10" />
      </div>

      {/* Feed posts */}
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
