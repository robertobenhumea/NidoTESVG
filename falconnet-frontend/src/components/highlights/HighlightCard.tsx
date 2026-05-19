'use client';

import { useRef, useState } from 'react';
import type { Destacado } from '@/types';

const BRAND_GRADIENT = 'linear-gradient(135deg, #1d4ed8, #3b82f6)';

interface Props {
  highlight: Destacado;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
}

export function HighlightCard({ highlight, onOpen, onEdit, onDelete, isOwner }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  function handlePointerDown() {
    didLongPressRef.current = false;
    if (!isOwner) return;
    longPressRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setMenuOpen(true);
    }, 500);
  }

  function handlePointerUp() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function handlePointerCancel() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    didLongPressRef.current = false;
  }

  function handleClick() {
    if (didLongPressRef.current) return;
    if (menuOpen) { setMenuOpen(false); return; }
    onOpen();
  }

  const coverBg = highlight.coverColor ?? undefined;
  const hasImage = Boolean(highlight.coverImageUrl);

  return (
    <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 snap-start select-none">
      <div className="relative">
        {/* Ring */}
        <div
          className="size-[68px] rounded-full p-[2.5px]"
          style={{ background: 'var(--brand, #2563eb)' }}
        >
          <div
            className="w-full h-full rounded-full overflow-hidden relative cursor-pointer"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            role="button"
            tabIndex={0}
            aria-label={`Ver destacado ${highlight.nombre}`}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
          >
            {hasImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={highlight.coverImageUrl}
                alt={highlight.nombre}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl"
                style={{ background: coverBg ?? BRAND_GRADIENT }}
              >
                {highlight.emoji ? (
                  <span role="img" aria-hidden="true">{highlight.emoji}</span>
                ) : (
                  <svg className="size-7 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Historia count badge */}
        {highlight.historiaCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center leading-none border border-[var(--bg-surface)] tabular-nums">
            {highlight.historiaCount > 9 ? '9+' : highlight.historiaCount}
          </span>
        )}

        {/* 3-dot menu button for owner */}
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            aria-label="Opciones del destacado"
            className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        )}

        {/* Context menu */}
        {menuOpen && isOwner && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-36 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit?.(); }}
                className="w-full px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete?.(); }}
                className="w-full px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Label */}
      <p className="text-[11px] font-medium text-[var(--text-primary)] text-center truncate w-full leading-tight">
        {highlight.nombre}
      </p>
    </div>
  );
}
