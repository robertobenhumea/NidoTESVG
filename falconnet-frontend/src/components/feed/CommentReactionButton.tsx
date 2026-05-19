'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { REACTIONS } from '@/lib/constants';
import { commentReactionService } from '@/services/comment-reaction.service';
import type { ReactionType } from '@/types';

interface CommentReactionButtonProps {
  commentId: number;
  initialCount?: number;
  initialReaction?: ReactionType;
}

function getReaction(type?: ReactionType) {
  return REACTIONS.find((r) => r.type === type);
}

/** Mini reaction picker that appears above the button */
function MiniReactionPicker({
  open,
  current,
  onSelect,
  onClose,
  closing,
}: {
  open: boolean;
  current?: ReactionType;
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  closing: boolean;
}) {
  if (!open && !closing) return null;

  return (
    <>
      {/* Invisible backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onTouchStart={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-auto',
          'transition-all duration-150',
          closing
            ? 'opacity-0 scale-90 pointer-events-none'
            : 'opacity-100 scale-100',
        )}
        role="menu"
        aria-label="Elige una reacción"
      >
        <div className="flex items-center gap-0.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl px-1.5 py-1.5 shadow-xl shadow-black/15 dark:shadow-black/50">
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
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(r.type as ReactionType);
                }}
                style={{ animationDelay: `${idx * 30}ms` }}
                className={cn(
                  'group flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1',
                  'transition-transform duration-100 hover:scale-[1.4] focus-visible:outline-2 focus-visible:outline-[var(--brand)]',
                  'animate-in zoom-in-75 fade-in',
                  isActive && 'scale-[1.3]',
                )}
              >
                <span className="text-[20px] leading-none select-none">{r.emoji}</span>
                <span
                  className={cn(
                    'text-[8px] font-medium leading-none whitespace-nowrap transition-colors',
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

export function CommentReactionButton({
  commentId,
  initialCount = 0,
  initialReaction,
}: CommentReactionButtonProps) {
  const [count, setCount]           = useState(initialCount);
  const [userReaction, setReaction] = useState<ReactionType | undefined>(initialReaction);
  const [pickerOpen, setPicker]     = useState(false);
  const [closing, setClosing]       = useState(false);

  const holdRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHold    = useRef(false);
  // Store optimistic rollback data
  const prevState  = useRef<{ count: number; reaction: ReactionType | undefined } | null>(null);

  function clearHold() {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  }

  function closePicker() {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setPicker(false);
    }, 150);
  }

  const applyReaction = useCallback(async (type: ReactionType) => {
    // Save rollback state
    prevState.current = { count, reaction: userReaction };

    // Optimistic update
    const wasThis  = userReaction === type;
    const hadOther = !!userReaction && !wasThis;
    setReaction(wasThis ? undefined : type);
    setCount((c) =>
      wasThis  ? Math.max(0, c - 1) :
      hadOther ? c :
                 c + 1,
    );

    try {
      const res = await commentReactionService.toggle(commentId, type);
      // Sync with server truth
      setCount(res.reactionCount);
      setReaction(res.accion === 'quitado' ? undefined : res.tipo);
    } catch {
      // Rollback
      if (prevState.current) {
        setCount(prevState.current.count);
        setReaction(prevState.current.reaction);
      }
    }
  }, [commentId, count, userReaction]);

  // Touch: long-press to open picker, tap for quick like
  function onTouchStart(e: React.TouchEvent) {
    didHold.current = false;
    holdRef.current = setTimeout(() => {
      didHold.current = true;
      holdRef.current = null;
      setPicker(true);
    }, 500);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (holdRef.current) {
      clearHold();
      if (!didHold.current && !pickerOpen) {
        e.preventDefault();
        applyReaction('LIKE');
      }
    }
  }

  function onTouchMove() {
    clearHold();
  }

  // Desktop: hover to open picker after delay, click for quick like
  function onMouseEnter() {
    holdRef.current = setTimeout(() => { holdRef.current = null; setPicker(true); }, 400);
  }

  function onMouseLeave() {
    clearHold();
    if (pickerOpen) closePicker();
  }

  function onClick() {
    clearHold();
    if (!pickerOpen && !closing) applyReaction('LIKE');
  }

  function handlePickerSelect(type: ReactionType) {
    closePicker();
    applyReaction(type);
  }

  const rxInfo = getReaction(userReaction);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseLeave={onMouseLeave}
    >
      <MiniReactionPicker
        open={pickerOpen}
        current={userReaction}
        onSelect={handlePickerSelect}
        onClose={closePicker}
        closing={closing}
      />

      <button
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        aria-label={
          userReaction
            ? `${rxInfo?.label ?? 'Reacción'} (mantén para cambiar)`
            : 'Me gusta (mantén para más reacciones)'
        }
        aria-pressed={!!userReaction}
        className={cn(
          'flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium',
          'transition-all duration-150 select-none touch-none',
          'focus-visible:outline-2 focus-visible:outline-[var(--brand)]',
          userReaction
            ? 'text-[var(--brand)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
        )}
      >
        {userReaction ? (
          <span
            className="text-sm leading-none transition-transform duration-200 animate-in zoom-in-75"
            aria-hidden
          >
            {rxInfo?.emoji}
          </span>
        ) : (
          <svg
            className="size-3 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path d="M7 10v12" strokeLinecap="round" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {count > 0 && (
          <span className="tabular-nums">{count}</span>
        )}
        {count === 0 && !userReaction && (
          <span>Me gusta</span>
        )}
      </button>
    </div>
  );
}
