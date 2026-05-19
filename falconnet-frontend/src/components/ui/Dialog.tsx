'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Allow dialog panel to fill most of the screen height on mobile */
  fullHeightMobile?: boolean;
  className?: string;
}

/**
 * Bottom-sheet on mobile, centered modal on desktop.
 * Semantically distinct from Modal (which uses <dialog> element).
 */
function Dialog({ open, onClose, title, children, fullHeightMobile = false, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'relative w-full z-10',
          'bg-[var(--bg-surface)] border border-[var(--border)]',
          'shadow-2xl shadow-black/20 dark:shadow-black/60',
          // Mobile: bottom sheet
          'rounded-t-2xl',
          fullHeightMobile ? 'max-h-[90dvh] flex flex-col' : 'max-h-[90dvh] overflow-y-auto',
          // Desktop: centered card
          'sm:rounded-2xl sm:max-w-md sm:mx-4',
          className,
        )}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="size-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className={cn('p-5', fullHeightMobile && 'flex-1 overflow-y-auto')}
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export { Dialog };
