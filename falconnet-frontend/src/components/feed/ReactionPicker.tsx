'use client';

import { cn } from '@/lib/utils';
import { REACTIONS } from '@/lib/constants';
import type { ReactionType } from '@/types';

interface ReactionPickerProps {
  open: boolean;
  closing: boolean;
  current?: ReactionType;
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
}

export function ReactionPicker({ open, closing, current, onSelect, onClose }: ReactionPickerProps) {
  if (!open && !closing) return null;

  return (
    <>
      {/* Invisible backdrop — closes picker on click or touch outside */}
      <div
        className={cn(
          'fixed inset-0 z-40',
          // While closing, pointer events off so no accidental triggers
          closing ? 'pointer-events-none' : 'pointer-events-auto',
        )}
        onClick={onClose}
        onTouchStart={onClose}
        aria-hidden
      />

      <div
        className={cn(
          'absolute bottom-full left-0 mb-2 z-50',
          'transition-all duration-150 origin-bottom-left',
          closing
            ? 'opacity-0 scale-90 pointer-events-none'
            : 'opacity-100 scale-100',
        )}
        role="menu"
        aria-label="Elige una reacción"
      >
        <div className="flex items-center gap-0.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl px-2 py-2 shadow-xl shadow-black/10 dark:shadow-black/40">
          {REACTIONS.map((r, idx) => {
            const isActive = current === r.type;
            return (
              <button
                key={r.type}
                role="menuitem"
                aria-label={r.label}
                aria-pressed={isActive}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(r.type as ReactionType);
                }}
                onTouchEnd={(e) => {
                  // Prevent ghost click / double-fire on mobile
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(r.type as ReactionType);
                }}
                style={{ animationDelay: `${idx * 30}ms` }}
                className={cn(
                  'group flex flex-col items-center gap-1 rounded-xl px-2 py-1.5',
                  'transition-transform duration-100 hover:scale-[1.3] focus-visible:outline-2 focus-visible:outline-[var(--brand)]',
                  // Mobile: bigger touch targets
                  'sm:px-2 sm:py-1.5',
                  isActive && 'scale-[1.3]',
                )}
              >
                <span className="text-[22px] sm:text-[22px] leading-none select-none">{r.emoji}</span>
                <span
                  className={cn(
                    'text-[9px] font-medium leading-none whitespace-nowrap transition-colors',
                    isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]',
                    'group-hover:text-[var(--text-secondary)]',
                  )}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
