import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'brand';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
  brand:   'bg-[var(--brand-muted)] text-[var(--brand-text)]',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  error:   'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info:    'bg-sky-100   text-sky-700   dark:bg-sky-900/30   dark:text-sky-400',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

function Badge({ children, variant = 'default', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        styles[variant],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { Badge };
