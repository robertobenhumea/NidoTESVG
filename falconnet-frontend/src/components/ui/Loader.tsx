import { cn } from '@/lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const spinnerSizes: Record<SpinnerSize, string> = {
  xs: 'size-3.5 border',
  sm: 'size-5   border-2',
  md: 'size-7   border-2',
  lg: 'size-10  border-[3px]',
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando…"
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        spinnerSizes[size],
        className,
      )}
    />
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-label="Cargando página…">
      <Spinner size="lg" className="text-[var(--brand)]" />
    </div>
  );
}

/** Thin progress bar fixed to top of screen — shown during page transitions. */
function TopProgressBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[200] h-0.5 overflow-hidden"
    >
      <div className="h-full w-full bg-[var(--brand-muted)]">
        <div className="h-full bg-[var(--brand)] animate-progress-bar" />
      </div>
    </div>
  );
}

export { Spinner, PageLoader, TopProgressBar };
