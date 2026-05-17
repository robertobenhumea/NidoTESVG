import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  hover?: boolean;
}

function Card({ padding = true, hover = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]',
        padding && 'p-4',
        hover && 'transition-colors duration-150 hover:bg-[var(--bg-elevated)] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-semibold text-[var(--text-primary)]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm text-[var(--text-secondary)]', className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardBody };
