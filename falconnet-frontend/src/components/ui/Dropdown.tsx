'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item */
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full mt-1.5 z-50 min-w-[180px]',
            'bg-[var(--bg-surface)] border border-[var(--border)]',
            'rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/40 py-1.5',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && <div className="my-1.5 h-px bg-[var(--border)]" />}
              <button
                role="menuitem"
                onClick={() => { item.onClick(); setOpen(false); }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left',
                  'transition-colors duration-100',
                  'disabled:opacity-40 disabled:pointer-events-none',
                  item.danger
                    ? 'text-red-500 hover:bg-red-500/8 dark:hover:bg-red-500/10'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
                )}
              >
                {item.icon && (
                  <span className="size-4 shrink-0 text-[var(--text-muted)]">{item.icon}</span>
                )}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { Dropdown };
