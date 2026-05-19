'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside) onClose();
  }

  // Close on Escape
  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    onClose();
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      onCancel={handleCancel}
      className={cn(
        'rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]',
        'shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        'w-full mx-0 sm:mx-4 p-0',
        'open:flex open:flex-col',
        'max-h-[90dvh] overflow-y-auto',
        'sm:self-center self-end',
        sizeClasses[size],
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Cerrar"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
      <div className="p-5 overflow-y-auto">{children}</div>
    </dialog>
  );
}

export { Modal };
