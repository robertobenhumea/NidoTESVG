'use client';

import { useUIStore, type ToastItem, type ToastType } from '@/store/ui.store';
import { cn } from '@/lib/utils';

/* ── Icons ── */
const ToastIcon = ({ type }: { type: ToastType }) => {
  const base = 'size-5 rounded-full flex items-center justify-center text-white shrink-0 text-[11px] font-bold mt-px';
  const colors: Record<ToastType, string> = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    warning: 'bg-amber-500',
    info:    'bg-[var(--brand)]',
  };
  const icons: Record<ToastType, string> = {
    success: '✓',
    error:   '✕',
    warning: '!',
    info:    'i',
  };
  return <span className={cn(base, colors[type])}>{icons[type]}</span>;
};

/* ── Single toast item ── */
function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 rounded-2xl',
        'bg-[var(--bg-surface)] border border-[var(--border)]',
        'shadow-xl shadow-black/10 dark:shadow-black/40',
        'text-sm text-[var(--text-primary)]',
        'min-w-[260px] max-w-sm w-full',
        'animate-toast-in',
      )}
    >
      <ToastIcon type={toast.type} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0 mt-0.5"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/* ── Toaster — renders all active toasts ── */
export function Toaster() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones del sistema"
      className={cn(
        'fixed z-[100] flex flex-col gap-2 pointer-events-none',
        // Mobile: above the bottom nav
        'bottom-[calc(var(--nav-bottom-h)+var(--safe-bottom)+8px)] inset-x-0 items-center px-4',
        // Desktop: bottom-right corner
        'lg:bottom-4 lg:right-4 lg:left-auto lg:items-end lg:px-0',
      )}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full lg:w-auto">
          <ToastCard toast={t} onDismiss={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
