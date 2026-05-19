'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { REACTIONS } from '@/lib/constants';
import { commentReactionService } from '@/services/comment-reaction.service';
import type { ReactionType } from '@/types';

/* ─── Position helpers ───────────────────────────────────────── */

interface Pos { bottom: number; left: number }

const PICKER_W = 268;

function calcPos(btn: HTMLElement): Pos {
  const r   = btn.getBoundingClientRect();
  const gap = 8;
  const bottom = window.innerHeight - r.top + gap;
  const left   = Math.max(12, Math.min(
    r.left + r.width / 2 - PICKER_W / 2,
    window.innerWidth - PICKER_W - 12,
  ));
  return { bottom, left };
}

/* ─── Portal picker ──────────────────────────────────────────── */

function ReactionPickerPortal({
  pos, current, closing, onSelect, onClose, onMouseEnter, onMouseLeave,
}: {
  pos: Pos;
  current?: ReactionType;
  closing: boolean;
  onSelect: (t: ReactionType) => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return createPortal(
    <>
      {/* Full-screen invisible backdrop — catches taps/clicks outside */}
      <div
        className="fixed inset-0 z-[69]"
        style={{ pointerEvents: closing ? 'none' : 'auto' }}
        aria-hidden
        onClick={onClose}
        onTouchStart={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* Picker panel */}
      <div
        role="menu"
        aria-label="Elige una reacción"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position: 'fixed',
          bottom: pos.bottom,
          left: pos.left,
          width: PICKER_W,
          zIndex: 70,
          opacity: closing ? 0 : 1,
          transform: closing
            ? 'scale(0.88) translateY(6px)'
            : 'scale(1)    translateY(0)',
          transition: 'opacity 150ms ease, transform 150ms ease',
          pointerEvents: closing ? 'none' : 'auto',
        }}
      >
        <div className="flex items-center gap-0.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl px-2 py-2 shadow-2xl shadow-black/20 dark:shadow-black/60">
          {REACTIONS.map((r, i) => {
            const active = current === r.type;
            return (
              <button
                key={r.type}
                role="menuitem"
                aria-label={r.label}
                aria-pressed={active}
                /* prevent focus-steal so button stays visually stable */
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onSelect(r.type as ReactionType); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(r.type as ReactionType); }}
                style={{ animationDelay: `${i * 25}ms` }}
                className={cn(
                  'group flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 flex-1',
                  'transition-transform duration-100 active:scale-90',
                  'hover:scale-[1.35] focus-visible:outline-2 focus-visible:outline-[var(--brand)]',
                  'animate-in zoom-in-75 fade-in',
                  active && 'scale-[1.2]',
                )}
              >
                <span className="text-[22px] leading-none select-none" aria-hidden>
                  {r.emoji}
                </span>
                <span className={cn(
                  'text-[8px] font-medium leading-none whitespace-nowrap transition-colors',
                  active
                    ? 'text-[var(--brand)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
                )}>
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function CommentReactionButton({
  commentId,
  initialCount   = 0,
  initialReaction,
}: {
  commentId: number;
  initialCount?: number;
  initialReaction?: ReactionType;
}) {
  const [count,        setCount]    = useState(initialCount);
  const [userReaction, setReaction] = useState<ReactionType | undefined>(initialReaction);
  const [pickerOpen,   setPicker]   = useState(false);
  const [closing,      setClosing]  = useState(false);
  const [pos,          setPos]      = useState<Pos>({ bottom: 0, left: 0 });
  const [mounted,      setMounted]  = useState(false);

  const btnRef       = useRef<HTMLButtonElement>(null);
  const holdTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHold      = useRef(false);
  const prevSnapshot = useRef<{ count: number; reaction: ReactionType | undefined } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  /* Close on scroll anywhere in the page */
  useEffect(() => {
    if (!pickerOpen) return;
    const close = () => startClose();
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [pickerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearHold()  { if (holdTimer.current)  { clearTimeout(holdTimer.current);  holdTimer.current  = null; } }
  function clearClose() { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } }

  function startOpen() {
    if (pickerOpen || closing) return;
    if (btnRef.current) setPos(calcPos(btnRef.current));
    setPicker(true);
  }

  function startClose() {
    clearClose();
    setClosing(true);
    setTimeout(() => { setClosing(false); setPicker(false); }, 150);
  }

  /* Optimistic reaction toggle */
  const applyReaction = useCallback(async (type: ReactionType) => {
    prevSnapshot.current = { count, reaction: userReaction };
    const removing  = userReaction === type;
    const replacing = !!userReaction && !removing;

    setReaction(removing ? undefined : type);
    setCount((c) => removing ? Math.max(0, c - 1) : replacing ? c : c + 1);

    try {
      const res = await commentReactionService.toggle(commentId, type);
      setCount(res.reactionCount);
      setReaction(res.accion === 'quitado' ? undefined : res.tipo as ReactionType);
    } catch {
      if (prevSnapshot.current) {
        setCount(prevSnapshot.current.count);
        setReaction(prevSnapshot.current.reaction);
      }
    }
  }, [commentId, count, userReaction]);

  function handleSelect(type: ReactionType) {
    startClose();          // close picker first (fade-out)
    applyReaction(type);   // apply immediately (optimistic)
  }

  /* ── Touch handlers ── */
  function onTouchStart() {
    if (pickerOpen) return;
    didHold.current   = false;
    holdTimer.current = setTimeout(() => {
      didHold.current  = true;
      holdTimer.current = null;
      startOpen();
    }, 500);
  }

  function onTouchMove() { clearHold(); }

  function onTouchEnd(e: React.TouchEvent) {
    if (holdTimer.current) {
      // Quick tap — timer still pending
      clearHold();
      if (!pickerOpen) {
        e.preventDefault(); // kill the 300ms ghost click
        applyReaction('LIKE' as ReactionType);
      }
    }
    // If long-press fired, picker is already open — do nothing
  }

  /* ── Mouse handlers (desktop) ── */
  function onMouseEnter() {
    clearClose();
    if (!pickerOpen && !closing) {
      holdTimer.current = setTimeout(() => { holdTimer.current = null; startOpen(); }, 400);
    }
  }

  function onMouseLeave() {
    clearHold();
    if (pickerOpen) {
      // Short grace period so cursor can reach the picker
      closeTimer.current = setTimeout(() => startClose(), 120);
    }
  }

  function onPickerMouseEnter() { clearClose(); }
  function onPickerMouseLeave() { startClose(); }

  function onClick() {
    clearHold();
    if (!pickerOpen && !closing) applyReaction('LIKE' as ReactionType);
  }

  const rxInfo = REACTIONS.find((r) => r.type === userReaction);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseLeave={onMouseLeave}
    >
      <button
        ref={btnRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        aria-label={
          userReaction
            ? `${rxInfo?.label ?? 'Reacción'} — mantén para cambiar`
            : 'Me gusta — mantén para más reacciones'
        }
        aria-pressed={!!userReaction}
        className={cn(
          'flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium',
          'transition-all duration-150 select-none touch-manipulation',
          'focus-visible:outline-2 focus-visible:outline-[var(--brand)]',
          userReaction
            ? 'text-[var(--brand)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
        )}
      >
        {userReaction ? (
          <span className="text-sm leading-none" aria-hidden>{rxInfo?.emoji}</span>
        ) : (
          <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M7 10v12" strokeLinecap="round" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {count > 0 && <span className="tabular-nums">{count}</span>}
        {count === 0 && !userReaction && <span>Me gusta</span>}
      </button>

      {mounted && (pickerOpen || closing) && (
        <ReactionPickerPortal
          pos={pos}
          current={userReaction}
          closing={closing}
          onSelect={handleSelect}
          onClose={startClose}
          onMouseEnter={onPickerMouseEnter}
          onMouseLeave={onPickerMouseLeave}
        />
      )}
    </div>
  );
}
