import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const styles: Record<AlertVariant, { wrap: string; icon: string; label: string }> = {
  info:    { wrap: 'bg-sky-50   border-sky-200   dark:bg-sky-900/20   dark:border-sky-800',   icon: 'text-sky-500',   label: 'Información' },
  success: { wrap: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800', icon: 'text-green-500', label: 'Éxito' },
  warning: { wrap: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', icon: 'text-amber-500', label: 'Advertencia' },
  error:   { wrap: 'bg-red-50   border-red-200   dark:bg-red-900/20   dark:border-red-800',   icon: 'text-red-500',   label: 'Error' },
};

const icons: Record<AlertVariant, ReactNode> = {
  info: (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" strokeWidth={2.5}/>
    </svg>
  ),
  success: (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m10.29 3.86-8.16 14.14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeWidth={2.5}/>
    </svg>
  ),
  error: (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/>
    </svg>
  ),
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

function Alert({ variant = 'info', title, children, onDismiss, className }: AlertProps) {
  const s = styles[variant];
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 p-4 rounded-2xl border',
        s.wrap,
        className,
      )}
    >
      <span className={cn('shrink-0 mt-px', s.icon)} aria-label={s.label}>
        {icons[variant]}
      </span>
      <div className="flex-1 min-w-0 text-sm">
        {title && (
          <p className="font-semibold text-[var(--text-primary)] mb-0.5">{title}</p>
        )}
        <div className="text-[var(--text-secondary)] leading-snug">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Cerrar alerta"
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mt-px"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export { Alert };
