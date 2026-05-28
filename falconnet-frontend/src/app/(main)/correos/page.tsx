'use client';

import { useState, useEffect, useCallback, useRef, type TouchEvent as RTouchEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { api, FetchError } from '@/services/api';
import { cn } from '@/lib/utils';
import { mailTimeAgo } from './components/mailDate';
import { ComposeModal } from './components/ComposeModal';
import { MailDetail }   from './components/MailDetail';
import type { CorreoItem, CorreoPageResponse, Tab, FilterType, BUser } from './components/types';

const VALID_TABS = new Set<Tab>([
  'general','academico','equipos','marketplace','eventos',
  'institucional','importante','entrada','enviados',
  'favoritos','archivados','no-leidos','papelera',
]);

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/* ────────────────────────────────────────────────
   Skeleton loader
──────────────────────────────────────────────── */
function MailSkeleton() {
  return (
    <div className="space-y-px px-2 pt-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-xl">
          <div className="size-9 rounded-full bg-[var(--bg-elevated)] animate-pulse shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3 rounded-full bg-[var(--bg-elevated)] animate-pulse" style={{ width: `${55 + (i % 3) * 15}%` }} />
              <div className="h-2.5 w-8 rounded-full bg-[var(--bg-elevated)] animate-pulse shrink-0" />
            </div>
            <div className="h-2.5 rounded-full bg-[var(--bg-elevated)] animate-pulse" style={{ width: `${40 + (i % 4) * 10}%` }} />
            <div className="h-2.5 rounded-full bg-[var(--bg-elevated)] animate-pulse" style={{ width: `${30 + (i % 3) * 12}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Empty states
──────────────────────────────────────────────── */
const EMPTY_CONFIG: Record<Tab, { title: string; sub: string; icon: React.ReactNode }> = {
  general: {
    title: 'Sin correo general',
    sub: 'Los mensajes generales aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" /><path d="m22 6-10 7L2 6" />
      </svg>
    ),
  },
  academico: {
    title: 'Sin correo académico',
    sub: 'Clases, tareas y docentes aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 2 8l10 5 10-5-10-5z" /><path d="M6 10v5c0 2 3 4 6 4s6-2 6-4v-5" />
      </svg>
    ),
  },
  equipos: {
    title: 'Sin correo de equipos',
    sub: 'Solicitudes y coordinación de equipos aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
  marketplace: {
    title: 'Sin correo de marketplace',
    sub: 'Compras, ventas y acuerdos aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" />
      </svg>
    ),
  },
  eventos: {
    title: 'Sin correo de eventos',
    sub: 'Invitaciones y avisos de eventos aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  institucional: {
    title: 'Sin avisos institucionales',
    sub: 'Comunicados oficiales aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  importante: {
    title: 'Sin mensajes importantes',
    sub: 'Los correos prioritarios aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
    ),
  },
  entrada: {
    title: 'Bandeja vacía',
    sub:   'Los mensajes nuevos aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
  enviados: {
    title: 'Sin mensajes enviados',
    sub:   'Los correos que envíes aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  favoritos: {
    title: 'Sin favoritos aún',
    sub:   'Toca ⭐ en cualquier correo para guardarlo aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  archivados: {
    title: 'Sin archivados',
    sub:   'Los mensajes archivados quedarán guardados aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="4" rx="1" /><path d="M5 7v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M10 12h4" />
      </svg>
    ),
  },
  'no-leidos': {
    title: 'Todo leído',
    sub:   'Los mensajes pendientes aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 7 13.5 15.5a2.1 2.1 0 0 1-3 0L2 7" /><rect x="2" y="5" width="20" height="14" rx="2" />
      </svg>
    ),
  },
  papelera: {
    title: 'Papelera vacía',
    sub:   'Los mensajes eliminados aparecerán aquí',
    icon: (
      <svg className="size-10 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
      </svg>
    ),
  },
};

function EmptyState({ tab }: { tab: Tab }) {
  const { title, sub, icon } = EMPTY_CONFIG[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4 animate-fade-in">
      <div className="flex items-center justify-center rounded-2xl bg-[var(--bg-elevated)]" style={{ width: 72, height: 72 }}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px] leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Mail list item
──────────────────────────────────────────────── */
interface MailItemProps {
  msg:              CorreoItem;
  tab:              Tab;
  isSelected:       boolean;
  onClick:          () => void;
  onFavorite:       (id: number) => void;
  onTrash:          (id: number) => void;
  onArchive:        (id: number) => void;
  onRestore:        (id: number) => void;
  selectMode?:      boolean;
  isChecked?:       boolean;
  onToggleSelect?:  (id: number) => void;
}

function MailItem({ msg, tab, isSelected, onClick, onFavorite, onTrash, onArchive, onRestore, selectMode, isChecked, onToggleSelect }: MailItemProps) {
  const [dragX, setDragX]       = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX                  = useRef(0);
  const startY                  = useRef(0);
  const axisLock                = useRef<'x' | 'y' | null>(null);

  const isInbox  = tab !== 'enviados' && !msg.esMio;
  const isUnread = !msg.leido && isInbox;

  const displayName = isInbox
    ? (msg.emisor?.nombre ?? msg.emisorNombre ?? `#${msg.emisorId}`)
    : (msg.destinatarios?.map(u => u.nombre).join(', ') ?? msg.destinatarioNombres?.join(', ') ?? '…');
  const identity = isInbox ? msg.emisor : msg.destinatarios?.[0];

  const preview = (msg.cuerpo ?? '').replace(/\n+/g, ' ').trim();

  function onTouchStart(e: RTouchEvent<HTMLDivElement>) {
    startX.current   = e.touches[0].clientX;
    startY.current   = e.touches[0].clientY;
    axisLock.current = null;
  }

  function onTouchMove(e: RTouchEvent<HTMLDivElement>) {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!axisLock.current) {
      axisLock.current = Math.abs(dx) > Math.abs(dy) + 4 ? 'x' : 'y';
    }
    if (axisLock.current === 'x') {
      setDragging(true);
      setDragX(Math.max(-76, Math.min(0, dx)));
    }
  }

  function onTouchEnd() {
    if (dragging && dragX < -52 && isInbox && tab !== 'papelera') {
      onTrash(msg.id);
    }
    setDragX(0);
    setDragging(false);
    axisLock.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe reveal — trash */}
      {isInbox && tab !== 'papelera' && dragX < -8 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-5 rounded-xl bg-red-500"
          style={{ width: Math.abs(dragX) + 16 }}
        >
          <svg className="size-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={selectMode ? () => onToggleSelect?.(msg.id) : onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectMode ? onToggleSelect?.(msg.id) : onClick();
          }
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform:  `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
        className={cn(
          'w-full text-left px-3 py-3 rounded-xl transition-colors duration-150 cursor-pointer',
          isSelected && !selectMode
            ? 'bg-[var(--brand-muted)]'
            : isChecked
              ? 'bg-[var(--brand-muted)]/60'
              : 'hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]',
        )}
      >
        <div className="flex items-start gap-3">
          {/* Avatar / checkbox */}
          <div className="relative shrink-0 mt-0.5">
            {selectMode ? (
              <div className={cn(
                'size-9 rounded-full border-2 flex items-center justify-center transition-all',
                isChecked
                  ? 'border-[var(--brand)] bg-[var(--brand)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)]',
              )}>
                {isChecked && (
                  <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ) : (
              <>
                <Avatar
                  src={isInbox ? resolveUrl(msg.emisorFoto) : undefined}
                  name={displayName}
                  size="sm"
                />
                {isUnread && (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--brand)] border-2 border-[var(--bg-surface)]" />
                )}
              </>
            )}
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className={cn(
                'text-sm truncate leading-snug',
                isUnread ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]',
              )}>
                {displayName}
              </p>
              <time className="text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
                {mailTimeAgo(msg.fecha)}
              </time>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] truncate mb-0.5">
              {identity?.carrera ?? identity?.departamento ?? 'Instituto Tecnológico'}
              {identity?.semestre ? ` · ${identity.semestre}` : ''}
              {identity?.verificadoInstitucional ? ' · Verificado' : ''}
            </p>
              <p className={cn(
                'text-xs truncate',
                isUnread ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
              )}>
                {msg.prioridad === 'ALTA' && <span className="text-amber-500 mr-1">Alta</span>}
                {msg.asunto}
              </p>
            {(preview || msg.esComunicado) && (
              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 leading-snug flex items-center gap-1">
                {msg.esComunicado && (
                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 uppercase tracking-wide">
                    Comunicado
                  </span>
                )}
                {msg.tieneAdjuntos && <span aria-label="Tiene adjuntos">📎</span>}
                {msg.etiqueta && <span className="text-[var(--brand)]">#{msg.etiqueta}</span>}
                <span className="truncate">{preview}</span>
              </p>
            )}
          </div>

          {/* Star + archive (hidden in select mode) */}
          {!selectMode && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onFavorite(msg.id); }}
                aria-label={msg.esFavorito ? 'Quitar de favoritos' : 'Favorito'}
                className="size-6 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors shrink-0 -mr-0.5 mt-0.5"
              >
                <svg
                  className="size-3.5 transition-colors"
                  viewBox="0 0 24 24"
                  fill={msg.esFavorito ? '#f59e0b' : 'none'}
                  stroke={msg.esFavorito ? '#f59e0b' : 'currentColor'}
                  strokeWidth={2}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              {tab === 'papelera' ? (
                <button
                  onClick={e => { e.stopPropagation(); onRestore(msg.id); }}
                  aria-label="Restaurar"
                  className="size-6 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors shrink-0 mt-0.5 text-[var(--text-muted)]"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
                  </svg>
                </button>
              ) : isInbox && (
                <button
                  onClick={e => { e.stopPropagation(); onArchive(msg.id); }}
                  aria-label={msg.archivado ? 'Desarchivar' : 'Archivar'}
                  className="size-6 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors shrink-0 mt-0.5 text-[var(--text-muted)]"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="4" rx="1" /><path d="M5 7v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M10 12h4" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Toast notification
──────────────────────────────────────────────── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  return (
    <div
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-xl pointer-events-none animate-toast-in',
        'bottom-[calc(var(--nav-bottom-h)+var(--safe-bottom)+12px)] lg:bottom-6',
        type === 'success' && 'bg-green-500',
        type === 'error'   && 'bg-red-500',
        type === 'info'    && 'bg-[var(--text-primary)]',
      )}
    >
      {message}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sidebar navigation (shared desktop + drawer)
──────────────────────────────────────────────── */
const TAB_ICONS: Record<Tab, React.ReactNode> = {
  general: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" /><path d="m22 6-10 7L2 6" />
    </svg>
  ),
  academico: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 8l10 5 10-5-10-5z" /><path d="M6 10v5c0 2 3 4 6 4s6-2 6-4v-5" />
    </svg>
  ),
  equipos: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  ),
  marketplace: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" />
    </svg>
  ),
  eventos: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  institucional: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" />
    </svg>
  ),
  importante: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  ),
  entrada: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  enviados: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  favoritos: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  archivados: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="4" rx="1" /><path d="M5 7v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M10 12h4" />
    </svg>
  ),
  'no-leidos': (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 7 13.5 15.5a2.1 2.1 0 0 1-3 0L2 7" /><rect x="2" y="5" width="20" height="14" rx="2" />
    </svg>
  ),
  papelera: (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
    </svg>
  ),
};

const TAB_LABELS: Record<Tab, string> = {
  general: 'General',
  academico: 'Académico',
  equipos: 'Equipos',
  marketplace: 'Marketplace',
  eventos: 'Eventos',
  institucional: 'Institucional',
  importante: 'Importante',
  entrada:   'Entrada',
  enviados:  'Enviados',
  favoritos: 'Favoritos',
  archivados: 'Archivados',
  'no-leidos': 'No leídos',
  papelera: 'Papelera',
};

function SidebarNav({
  tab, unreadCount, onSwitchTab, onCompose,
}: {
  tab: Tab; unreadCount: number;
  onSwitchTab: (t: Tab) => void; onCompose: () => void;
}) {
  const tabs: Tab[] = ['general', 'academico', 'equipos', 'marketplace', 'eventos', 'institucional', 'importante', 'no-leidos', 'archivados', 'enviados', 'favoritos', 'papelera'];
  return (
    <>
      <div className="p-4 pb-3">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] active:scale-[0.97] transition-all shadow-sm"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Redactar
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => onSwitchTab(t)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              t === tab
                ? 'bg-[var(--brand-muted)] text-[var(--brand)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            {TAB_ICONS[t]}
            <span className="flex-1 text-left">{TAB_LABELS[t]}</span>
            {t === 'entrada' && unreadCount > 0 && (
              <span className="text-[10px] font-bold min-w-[18px] px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white tabular-nums text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] mt-2">
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          <kbd className="font-mono bg-[var(--bg-elevated)] px-1 py-0.5 rounded text-[9px]">C</kbd> redactar
          &nbsp;·&nbsp;
          <kbd className="font-mono bg-[var(--bg-elevated)] px-1 py-0.5 rounded text-[9px]">R</kbd> actualizar
          &nbsp;·&nbsp;
          <kbd className="font-mono bg-[var(--bg-elevated)] px-1 py-0.5 rounded text-[9px]">Esc</kbd> cerrar
        </p>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────
   Detail empty placeholder
──────────────────────────────────────────────── */
function DetailPlaceholder({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="size-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center shadow-sm">
        <svg className="size-9 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Selecciona un mensaje</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Elige un correo de la lista para leerlo</p>
      </div>
      <button
        onClick={onCompose}
        className="flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-colors"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Redactar nuevo
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Page
──────────────────────────────────────────────── */
type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward';

interface ReplyContext {
  to: BUser[];
  subject: string;
  mode: ComposeMode;
  initialBody?: string;
  threadId?: number;
  parentId?: number;
}

interface AdvFilters {
  q: string;
  categoria: string;
  fechaDesde: string;
  fechaHasta: string;
  tieneAdjuntos: '' | 'true' | 'false';
  esComunicado: '' | 'true' | 'false';
}

const DEFAULT_ADV: AdvFilters = {
  q: '', categoria: '', fechaDesde: '', fechaHasta: '', tieneAdjuntos: '', esComunicado: '',
};

const CATEGORIAS = [
  'GENERAL','ACADEMICO','INSTITUCIONAL','COORDINACION','TRAMITE',
  'JUSTIFICANTE','SOLICITUD','REPORTE','DUDA','EQUIPOS','MARKETPLACE','EVENTOS','IMPORTANTE',
];

export default function CorreosPage() {
  const searchParams                = useSearchParams();
  const router                      = useRouter();

  const [tab, setTab]               = useState<Tab>(() => {
    const p = searchParams.get('tab') as Tab | null;
    return p && VALID_TABS.has(p) ? p : 'enviados';
  });
  const [items, setItems]           = useState<CorreoItem[]>([]);
  const [selected, setSelected]     = useState<CorreoItem | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [compose, setCompose]       = useState(false);
  const [replyCtx, setReplyCtx]     = useState<ReplyContext | null>(null);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterType>('all');
  const [drawer, setDrawer]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loadError, setLoadError]   = useState(false);
  const loadGenRef                  = useRef(0);
  // Phase 4: advanced filters
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [advFilters, setAdvFilters]         = useState<AdvFilters>(DEFAULT_ADV);
  const [isSearchMode, setIsSearchMode]     = useState(false);
  const [advSearchTotal, setAdvSearchTotal] = useState(0);
  const [advSearchLoading, setAdvSearchLoading] = useState(false);
  // Phase 4: multi-select
  const [selectMode, setSelectMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const hasAdvFilters = advFilters.q !== '' || advFilters.categoria !== '' ||
    advFilters.fechaDesde !== '' || advFilters.fechaHasta !== '' ||
    advFilters.tieneAdjuntos !== '' || advFilters.esComunicado !== '';

  async function loadAdvSearch(pg = 0) {
    setAdvSearchLoading(true);
    if (pg === 0) { setSelected(null); setIsSearchMode(true); setItems([]); }
    const params = new URLSearchParams({ page: String(pg), size: '20' });
    if (advFilters.q)              params.set('q', advFilters.q);
    if (advFilters.categoria)      params.set('categoria', advFilters.categoria);
    if (advFilters.fechaDesde)     params.set('fechaDesde', advFilters.fechaDesde);
    if (advFilters.fechaHasta)     params.set('fechaHasta', advFilters.fechaHasta);
    if (advFilters.tieneAdjuntos)  params.set('tieneAdjuntos', advFilters.tieneAdjuntos);
    if (advFilters.esComunicado)   params.set('esComunicado', advFilters.esComunicado);
    try {
      const data = await api.get<CorreoPageResponse>(`/correos/buscar-avanzado?${params}`, { suppressAuthExpiry: true });
      setItems(prev => pg === 0 ? data.content : [...prev, ...data.content]);
      setHasMore(data.hasMore);
      setCurrentPage(pg);
      setAdvSearchTotal(data.totalElements);
    } catch {
      showToast('Error al buscar', 'error');
    } finally {
      setAdvSearchLoading(false);
    }
  }

  function clearAdvSearch() {
    setAdvFilters(DEFAULT_ADV);
    setIsSearchMode(false);
    setShowAdvFilters(false);
    setAdvSearchTotal(0);
    void load();
  }

  async function handleBulkAction(accion: string, etiqueta?: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await api.post('/correos/acciones-masivas', { ids, accion, etiqueta }, { suppressAuthExpiry: true });
      showToast(`${ids.length} correo${ids.length !== 1 ? 's' : ''} actualizados`, 'success');
      refreshInboxCount();
      const idSet = selectedIds;
      setSelectedIds(new Set());
      setSelectMode(false);
      if (accion === 'leer')
        setItems(p => p.map(m => idSet.has(m.id) ? { ...m, leido: true } : m));
      else if (accion === 'no-leer')
        setItems(p => p.map(m => idSet.has(m.id) ? { ...m, leido: false } : m));
      else if (accion === 'favorito')
        setItems(p => p.map(m => idSet.has(m.id) ? { ...m, esFavorito: true } : m));
      else if (accion === 'no-favorito')
        setItems(p => p.map(m => idSet.has(m.id) ? { ...m, esFavorito: false } : m));
      else if (['archivar', 'papelera', 'restaurar'].includes(accion)) {
        setItems(p => p.filter(m => !idSet.has(m.id)));
        setSelected(s => (s && idSet.has(s.id)) ? null : s);
      }
    } catch (err) {
      console.error('[correo/masiva] error:', err);
      showToast(err instanceof FetchError ? `Error ${err.status}: ${err.message}` : 'Error al aplicar la acción', 'error');
    }
  }

  const tabPath = useCallback((t: Tab): string => {
    const paths: Record<Tab, string> = {
      general:       '/correos/categoria/GENERAL',
      academico:     '/correos/categoria/ACADEMICO',
      equipos:       '/correos/categoria/EQUIPOS',
      marketplace:   '/correos/categoria/MARKETPLACE',
      eventos:       '/correos/categoria/EVENTOS',
      institucional: '/correos/categoria/INSTITUCIONAL',
      importante:    '/correos/categoria/IMPORTANTE',
      entrada:       '/correos/entrada',
      enviados:      '/correos/enviados',
      favoritos:     '/correos/favoritos',
      archivados:    '/correos/archivados',
      'no-leidos':   '/correos/no-leidos/lista',
      papelera:      '/correos/papelera',
    };
    return paths[t];
  }, []);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setSelected(null);
    setLoadError(false);
    setCurrentPage(0);
    setHasMore(false);
    try {
      const path = tabPath(tab);
      const data = await api.get<CorreoPageResponse | CorreoItem[]>(
        `${path}?page=0&size=20`,
        { suppressAuthExpiry: true },
      );
      if (gen !== loadGenRef.current) return;
      if (data && typeof data === 'object' && !Array.isArray(data) && 'content' in data) {
        const paged = data as CorreoPageResponse;
        setItems(paged.content ?? []);
        setHasMore(paged.hasMore ?? false);
        setCurrentPage(0);
      } else {
        setItems(Array.isArray(data) ? (data as CorreoItem[]) : []);
        setHasMore(false);
      }
    } catch {
      if (gen !== loadGenRef.current) return;
      setItems(prev => prev.length > 0 ? prev : []);
      setLoadError(true);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, [tab, tabPath]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const path = tabPath(tab);
      const data = await api.get<CorreoPageResponse>(
        `${path}?page=${nextPage}&size=20`,
        { suppressAuthExpiry: true },
      );
      setItems(prev => [...prev, ...(data.content ?? [])]);
      setHasMore(data.hasMore ?? false);
      setCurrentPage(nextPage);
    } catch {
      // ignore — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentPage, tab, tabPath]);

  useEffect(() => {
    const id = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  /* ── Unread badge (independent of current tab) ── */
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  const refreshInboxCount = useCallback(() => {
    api.get<{ count: number }>('/correos/no-leidos', { suppressAuthExpiry: true })
      .then(r => setInboxUnreadCount(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshInboxCount(); }, [refreshInboxCount]);

  /* ── Actions ── */
  async function handleFavorite(id: number) {
    const current = items.find(m => m.id === id)?.esFavorito ?? selected?.esFavorito ?? false;
    const newVal  = !current;

    // Optimistic update (always safe for toggling; defer removal from Favoritos until confirmed)
    if (tab !== 'favoritos' || newVal) {
      setItems(prev => prev.map(m => m.id === id ? { ...m, esFavorito: newVal } : m));
      setSelected(s => s?.id === id ? { ...s, esFavorito: newVal } : s);
    }

    try {
      await api.put(`/correos/${id}/favorito`, { favorito: newVal }, { suppressAuthExpiry: true });
      showToast(newVal ? '⭐ Marcado como favorito' : 'Quitado de favoritos');
      // Remove from Favoritos list only after backend confirms
      if (tab === 'favoritos' && !newVal) {
        setItems(prev => prev.filter(m => m.id !== id));
        setSelected(s => s?.id === id ? null : s);
      }
    } catch (err) {
      console.error('[correo/favorito] error:', err);
      // Revert optimistic update
      setItems(prev => prev.map(m => m.id === id ? { ...m, esFavorito: current } : m));
      setSelected(s => s?.id === id ? { ...s, esFavorito: current } : s);
      showToast(err instanceof FetchError ? `Error ${err.status}: ${err.message}` : 'No se pudo actualizar', 'error');
    }
  }

  async function handleTrash(id: number) {
    setItems(p => p.filter(m => m.id !== id));
    setSelected(s => s?.id === id ? null : s);
    try {
      await api.put(`/correos/${id}/papelera`, undefined, { suppressAuthExpiry: true });
      showToast('Movido a papelera');
      refreshInboxCount();
    } catch (err) {
      console.error('[correo/papelera] error:', err);
      showToast(err instanceof FetchError ? `Error ${err.status}: ${err.message}` : 'No se pudo mover a papelera', 'error');
      void load();
    }
  }

  async function handleArchive(id: number) {
    const current = items.find(m => m.id === id)?.archivado ?? selected?.archivado ?? false;
    const newVal  = !current;
    const removes = (tab === 'entrada' && newVal) || (tab === 'archivados' && !newVal);

    if (removes) {
      setItems(prev => prev.filter(m => m.id !== id));
      setSelected(s => s?.id === id ? null : s);
    } else {
      setItems(prev => prev.map(m => m.id === id ? { ...m, archivado: newVal } : m));
      setSelected(s => s?.id === id ? { ...s, archivado: newVal } : s);
    }

    try {
      await api.put(`/correos/${id}/archivar`, { archivado: newVal }, { suppressAuthExpiry: true });
      showToast(newVal ? 'Mensaje archivado' : 'Mensaje desarchivado');
    } catch (err) {
      console.error('[correo/archivar] error:', err);
      showToast(err instanceof FetchError ? `Error ${err.status}: ${err.message}` : 'No se pudo archivar el mensaje', 'error');
      void load();
    }
  }

  async function handleRestore(id: number) {
    setItems(prev => prev.filter(m => m.id !== id));
    setSelected(s => s?.id === id ? null : s);
    try {
      await api.put(`/correos/${id}/restaurar`, undefined, { suppressAuthExpiry: true });
      showToast('Mensaje restaurado');
    } catch (err) {
      console.error('[correo/restaurar] error:', err);
      showToast(err instanceof FetchError ? `Error ${err.status}: ${err.message}` : 'No se pudo restaurar el mensaje', 'error');
      void load();
    }
  }

  function openMessage(msg: CorreoItem) {
    setSelected(msg);
    if (!msg.esMio && !msg.leido) {
      api.put(`/correos/${msg.id}/leer`, undefined, { suppressAuthExpiry: true })
        .then(() => refreshInboxCount())
        .catch(() => {});
      setItems(p => p.map(m => m.id === msg.id ? { ...m, leido: true } : m));
    }
    // Fetch full body + threading detail (list only carries 200-char preview)
    api.get<CorreoItem>(`/correos/${msg.id}`, { suppressAuthExpiry: true })
      .then(detail => {
        setSelected(prev => prev?.id === msg.id ? { ...prev, ...detail } : prev);
      })
      .catch(() => {});
  }

  function handleReply() {
    if (!selected || tab === 'enviados' || tab === 'papelera') return;
    const rootId = selected.threadId ?? selected.id;
    setReplyCtx({
      mode:     'reply',
      to: [{
        id:         selected.emisorId,
        username:   selected.emisor?.nombre ?? selected.emisorNombre ?? `Usuario #${selected.emisorId}`,
        fotoPerfil: selected.emisor?.fotoPerfil ?? selected.emisorFoto,
        correo:     selected.emisor?.correo,
        rol:        selected.emisor?.rol,
        rolLabel:   selected.emisor?.rolLabel,
      }],
      subject:  selected.asunto.startsWith('Re: ') ? selected.asunto : `Re: ${selected.asunto}`,
      threadId: rootId,
      parentId: selected.id,
    });
    setCompose(true);
  }

  function handleReplyAll() {
    if (!selected || tab === 'enviados' || tab === 'papelera') return;
    const rootId = selected.threadId ?? selected.id;
    const recipients: BUser[] = [];

    // Include original sender
    recipients.push({
      id:         selected.emisorId,
      username:   selected.emisor?.nombre ?? selected.emisorNombre ?? `Usuario #${selected.emisorId}`,
      fotoPerfil: selected.emisor?.fotoPerfil ?? selected.emisorFoto,
      correo:     selected.emisor?.correo,
      rol:        selected.emisor?.rol,
      rolLabel:   selected.emisor?.rolLabel,
    });

    // Include all recipients (backend will filter self)
    if (selected.destinatarios) {
      for (const d of selected.destinatarios) {
        if (!recipients.find(r => r.id === d.id)) {
          recipients.push({
            id:         d.id,
            username:   d.nombre ?? d.username,
            fotoPerfil: d.fotoPerfil,
            correo:     d.correo,
            rol:        d.rol,
            rolLabel:   d.rolLabel,
          });
        }
      }
    }

    setReplyCtx({
      mode:     'replyAll',
      to:       recipients,
      subject:  selected.asunto.startsWith('Re: ') ? selected.asunto : `Re: ${selected.asunto}`,
      threadId: rootId,
      parentId: selected.id,
    });
    setCompose(true);
  }

  function handleForward() {
    if (!selected) return;
    const date = new Date(selected.fecha).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const senderName = selected.emisor?.nombre ?? selected.emisorNombre ?? `Usuario #${selected.emisorId}`;
    const quotedBody = `\n\n--- Mensaje original ---\nDe: ${senderName}\nFecha: ${date}\nAsunto: ${selected.asunto}\n\n${selected.cuerpo ?? ''}`;

    setReplyCtx({
      mode:        'forward',
      to:          [],
      subject:     selected.asunto.startsWith('Fw: ') ? selected.asunto : `Fw: ${selected.asunto}`,
      initialBody: quotedBody,
    });
    setCompose(true);
  }

  async function handleMarkUnread() {
    if (!selected) return;
    try {
      await api.patch(`/correos/${selected.id}/marcar-no-leido`, undefined, { suppressAuthExpiry: true });
      setItems(p => p.map(m => m.id === selected.id ? { ...m, leido: false } : m));
      setSelected(s => s ? { ...s, leido: false } : null);
      showToast('Marcado como no leído');
      refreshInboxCount();
    } catch (err) {
      console.error('[correo/no-leido] error:', err);
      showToast(err instanceof FetchError ? `Error ${err.status}: ${err.message}` : 'No se pudo marcar como no leído', 'error');
    }
  }

  function closeCompose() {
    setCompose(false);
    setReplyCtx(null);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setSearch('');
    setFilter('all');
    setDrawer(false);
    setHasMore(false);
    setCurrentPage(0);
    setIsSearchMode(false);
    setAdvFilters(DEFAULT_ADV);
    setShowAdvFilters(false);
    setAdvSearchTotal(0);
    setSelectMode(false);
    setSelectedIds(new Set());
    router.replace(`?tab=${t}`, { scroll: false });
  }

  /* ── Keyboard shortcuts — use ref to avoid stale closures ── */
  const handlersRef = useRef({ handleFavorite, handleTrash, handleReply, handleMarkUnread, handleReplyAll, handleForward });

  const stateRef = useRef({ selected, tab, compose, drawer });

  useEffect(() => {
    handlersRef.current = { handleFavorite, handleTrash, handleReply, handleMarkUnread, handleReplyAll, handleForward };
    stateRef.current = { selected, tab, compose, drawer };
  });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const { selected: sel, tab: t, compose: comp, drawer: dr } = stateRef.current;

      if (e.key === 'c' && !comp) { e.preventDefault(); setCompose(true); return; }
      if (e.key === 'r' && !comp) { e.preventDefault(); load(); return; }
      if (e.key === 'Escape') {
        if (comp) { closeCompose(); return; }
        if (sel)  { setSelected(null); return; }
        if (dr)   { setDrawer(false); return; }
      }
      if (sel) {
        if (e.key === 'f') { e.preventDefault(); handlersRef.current.handleFavorite(sel.id); }
        if (e.key === 'p' && t === 'entrada') { e.preventDefault(); handlersRef.current.handleReply(); }
        if ((e.key === 'Delete' || e.key === 'd') && t === 'entrada') {
          e.preventDefault(); handlersRef.current.handleTrash(sel.id);
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [load]);

  /* ── Filtered items ── */
  const filteredItems = items
    .filter(m => {
      if (filter === 'unread')       return !m.leido;
      if (filter === 'starred')      return m.esFavorito;
      if (filter === 'comunicados')  return m.esComunicado === true;
      return true;
    })
    .filter(m => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.asunto.toLowerCase().includes(q) ||
        m.emisorNombre?.toLowerCase().includes(q) ||
        m.destinatarioNombres?.some(n => n.toLowerCase().includes(q)) ||
        (m.cuerpo ?? '').toLowerCase().includes(q)
      );
    });

  /* ── Render ── */
  return (
    <>
      <div
        className="flex overflow-hidden"
        style={{ height: 'calc(100dvh - var(--nav-h) - var(--safe-top))' }}
      >

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-60 border-r border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
          <div className="px-4 pt-5 pb-1">
            <h1 className="text-base font-bold text-[var(--text-primary)] px-1 mb-4 tracking-tight">
              FalconNet Mail
            </h1>
          </div>
          <SidebarNav
            tab={tab}
            unreadCount={inboxUnreadCount}
            onSwitchTab={switchTab}
            onCompose={() => setCompose(true)}
          />
        </aside>

        {/* ── Mobile drawer ── */}
        {drawer && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <aside
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col animate-fade-in"
              style={{ paddingTop: 'calc(var(--nav-h) + var(--safe-top))' }}
            >
              <div className="px-4 pt-4 pb-1">
                <h1 className="text-base font-bold text-[var(--text-primary)] px-1 mb-3 tracking-tight">
                  FalconNet Mail
                </h1>
              </div>
              <SidebarNav
                tab={tab}
                unreadCount={inboxUnreadCount}
                onSwitchTab={switchTab}
                onCompose={() => { setCompose(true); setDrawer(false); }}
              />
            </aside>
          </>
        )}

        {/* ── Email list pane ── */}
        <section
          className={cn(
            'flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)] shrink-0',
            'w-full md:w-80 lg:w-96 xl:w-[26rem]',
            selected ? 'hidden md:flex' : 'flex',
          )}
        >
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] shrink-0">
            <button
              onClick={() => setDrawer(true)}
              className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Menú"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-[var(--text-primary)] flex-1 truncate">
              {TAB_LABELS[tab]}
              {tab === 'entrada' && inboxUnreadCount > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-[var(--brand)]">({inboxUnreadCount})</span>
              )}
            </h1>
            <button
              onClick={load}
              className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Actualizar"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              onClick={() => setCompose(true)}
              className="size-8 flex items-center justify-center rounded-lg text-[var(--brand)] hover:bg-[var(--brand-muted)] transition-colors"
              aria-label="Redactar"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>

          {/* Desktop section header */}
          <div className="hidden lg:flex items-center justify-between px-4 pt-4 pb-1 shrink-0">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              {isSearchMode ? `Resultados (${advSearchTotal})` : (
                <>
                  {TAB_LABELS[tab]}
                  {tab === 'entrada' && inboxUnreadCount > 0 && (
                    <span className="ml-1.5 text-[var(--brand)] normal-case tracking-normal">({inboxUnreadCount})</span>
                  )}
                </>
              )}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSelectMode(p => !p); setSelectedIds(new Set()); }}
                title="Selección múltiple"
                className={cn(
                  'size-6 flex items-center justify-center rounded-lg transition-colors',
                  selectMode ? 'text-[var(--brand)] bg-[var(--brand-muted)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                )}
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="4" height="4" rx="1" /><line x1="9" y1="7" x2="21" y2="7" />
                  <rect x="3" y="11" width="4" height="4" rx="1" /><line x1="9" y1="13" x2="21" y2="13" />
                  <rect x="3" y="17" width="4" height="4" rx="1" /><line x1="9" y1="19" x2="21" y2="19" />
                </svg>
              </button>
              <button
                onClick={() => setShowAdvFilters(p => !p)}
                title="Filtros avanzados"
                className={cn(
                  'size-6 flex items-center justify-center rounded-lg transition-colors',
                  showAdvFilters || hasAdvFilters || isSearchMode
                    ? 'text-[var(--brand)] bg-[var(--brand-muted)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                )}
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
              {!isSearchMode && (
                <button
                  onClick={load}
                  className="size-6 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Actualizar"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Bulk action bar — shown when multi-select is active */}
          {selectMode && (
            <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-[var(--text-muted)] flex-1 truncate">
                {selectedIds.size > 0
                  ? `${selectedIds.size} seleccionado${selectedIds.size !== 1 ? 's' : ''}`
                  : 'Seleccionar mensajes'}
              </span>
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('leer')}
                    title="Marcar como leídos"
                    className="size-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleBulkAction('no-leer')}
                    title="Marcar como no leídos"
                    className="size-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 7 13.5 15.5a2.1 2.1 0 0 1-3 0L2 7" /><rect x="2" y="5" width="20" height="14" rx="2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleBulkAction('favorito')}
                    title="Marcar favoritos"
                    className="size-7 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                  >
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  {tab !== 'papelera' && tab !== 'archivados' && tab !== 'enviados' && (
                    <button
                      onClick={() => handleBulkAction('archivar')}
                      title="Archivar"
                      className="size-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="4" rx="1" /><path d="M5 7v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M10 12h4" />
                      </svg>
                    </button>
                  )}
                  {tab === 'papelera' ? (
                    <button
                      onClick={() => handleBulkAction('restaurar')}
                      title="Restaurar"
                      className="size-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
                      </svg>
                    </button>
                  ) : tab !== 'enviados' && (
                    <button
                      onClick={() => handleBulkAction('papelera')}
                      title="Mover a papelera"
                      className="size-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-1.5 shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-muted)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar mensajes…"
                className="w-full pl-8 pr-16 h-9 rounded-xl bg-[var(--bg-elevated)] border border-transparent focus:border-[var(--border-focus)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="size-4 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setShowAdvFilters(p => !p)}
                  className={cn(
                    'lg:hidden size-6 flex items-center justify-center rounded-lg transition-colors',
                    showAdvFilters || hasAdvFilters || isSearchMode
                      ? 'text-[var(--brand)] bg-[var(--brand-muted)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]',
                  )}
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced filter panel */}
          {showAdvFilters && (
            <div className="mx-3 mb-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">Texto (asunto / cuerpo)</label>
                  <input
                    value={advFilters.q}
                    onChange={e => setAdvFilters(p => ({ ...p, q: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && void loadAdvSearch(0)}
                    placeholder="Palabras clave…"
                    className="w-full h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">Categoría</label>
                  <select
                    value={advFilters.categoria}
                    onChange={e => setAdvFilters(p => ({ ...p, categoria: e.target.value }))}
                    className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Todas</option>
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">Adjuntos</label>
                  <select
                    value={advFilters.tieneAdjuntos}
                    onChange={e => setAdvFilters(p => ({ ...p, tieneAdjuntos: e.target.value as AdvFilters['tieneAdjuntos'] }))}
                    className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Cualquiera</option>
                    <option value="true">Con adjuntos</option>
                    <option value="false">Sin adjuntos</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">Desde</label>
                  <input
                    type="date"
                    value={advFilters.fechaDesde}
                    onChange={e => setAdvFilters(p => ({ ...p, fechaDesde: e.target.value }))}
                    className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">Hasta</label>
                  <input
                    type="date"
                    value={advFilters.fechaHasta}
                    onChange={e => setAdvFilters(p => ({ ...p, fechaHasta: e.target.value }))}
                    className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">Tipo</label>
                  <select
                    value={advFilters.esComunicado}
                    onChange={e => setAdvFilters(p => ({ ...p, esComunicado: e.target.value as AdvFilters['esComunicado'] }))}
                    className="w-full h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="true">Solo comunicados</option>
                    <option value="false">Solo mensajes normales</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void loadAdvSearch(0)}
                  disabled={advSearchLoading}
                  className="flex-1 h-8 rounded-lg bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                >
                  {advSearchLoading ? (
                    <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                  Buscar
                </button>
                {(hasAdvFilters || isSearchMode) && (
                  <button
                    onClick={clearAdvSearch}
                    className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div className="px-3 pb-2 flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-hide">
            {([
              { key: 'all'         as const, label: 'Todos' },
              { key: 'unread'      as const, label: 'No leídos' },
              { key: 'starred'     as const, label: '⭐ Favoritos' },
              { key: 'comunicados' as const, label: '📢 Comunicados' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0',
                  filter === f.key
                    ? 'bg-[var(--brand)] text-white shadow-sm'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <MailSkeleton />
            ) : loadError && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4 animate-fade-in">
                <div className="flex items-center justify-center rounded-2xl bg-red-500/10" style={{ width: 72, height: 72 }}>
                  <svg className="size-9 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No se pudo cargar el correo</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px] leading-relaxed">Verifica tu conexión e intenta de nuevo</p>
                </div>
                <button
                  onClick={load}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] active:scale-[0.97] transition-all shadow-sm"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Reintentar
                </button>
              </div>
            ) : filteredItems.length === 0 && !loadError ? (
              search.trim() ? (
                <div className="text-center py-14 px-6 animate-fade-in">
                  <p className="text-sm text-[var(--text-muted)]">
                    Sin resultados para &ldquo;<span className="font-medium text-[var(--text-primary)]">{search}</span>&rdquo;
                  </p>
                  <button onClick={() => setSearch('')} className="text-xs text-[var(--brand)] mt-2 hover:underline">
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <EmptyState tab={tab} />
              )
            ) : (
              <>
                {loadError && (
                  <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                    <svg className="size-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    </svg>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 flex-1">No se pudo actualizar</span>
                    <button onClick={load} className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0">Reintentar</button>
                  </div>
                )}
                <div className="px-2 py-1 space-y-px">
                  {filteredItems.map(msg => (
                    <MailItem
                      key={msg.id}
                      msg={msg}
                      tab={tab}
                      isSelected={selected?.id === msg.id}
                      onClick={() => openMessage(msg)}
                      onFavorite={handleFavorite}
                      onTrash={handleTrash}
                      onArchive={handleArchive}
                      onRestore={handleRestore}
                      selectMode={selectMode}
                      isChecked={selectedIds.has(msg.id)}
                      onToggleSelect={id => setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      })}
                    />
                  ))}
                </div>
                {/* Load more */}
                {hasMore && !search.trim() && filter === 'all' && (
                  <div className="px-4 py-3 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 h-8 px-4 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      )}
                      {loadingMore ? 'Cargando…' : 'Cargar más'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Detail pane (tablet + desktop) ── */}
        <section className="hidden md:flex flex-1 min-w-0 flex-col bg-[var(--bg-base)]">
          {selected ? (
            <MailDetail
              msg={selected}
              tab={tab}
              onClose={() => setSelected(null)}
              onFavorite={handleFavorite}
              onTrash={handleTrash}
              onReply={handleReply}
              onMarkUnread={handleMarkUnread}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
            />
          ) : (
            <DetailPlaceholder onCompose={() => setCompose(true)} />
          )}
        </section>

        {/* ── Mobile detail (slide over) ── */}
        <div
          className={cn(
            'md:hidden fixed inset-x-0 bottom-0 z-30 bg-[var(--bg-surface)]',
            'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            selected ? 'translate-x-0' : 'translate-x-full',
          )}
          style={{ top: 'calc(var(--nav-h) + var(--safe-top))' }}
        >
          {selected && (
            <MailDetail
              msg={selected}
              tab={tab}
              onClose={() => setSelected(null)}
              onFavorite={handleFavorite}
              onTrash={handleTrash}
              onReply={handleReply}
              onMarkUnread={handleMarkUnread}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
            />
          )}
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      {!selected && (
        <button
          onClick={() => setCompose(true)}
          aria-label="Redactar nuevo mensaje"
          className={cn(
            'md:hidden fixed right-4 z-20',
            'bottom-[calc(var(--nav-bottom-h)+var(--safe-bottom)+16px)]',
            'size-14 rounded-2xl bg-[var(--brand)] text-white shadow-lg',
            'flex items-center justify-center',
            'hover:bg-[var(--brand-hover)] active:scale-95 transition-all',
          )}
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* ── Compose / Reply modal ── */}
      {compose && (
        <ComposeModal
          onClose={closeCompose}
          onSent={() => {
            closeCompose();
            if (tab === 'enviados') {
              load();
            } else {
              switchTab('enviados');
            }
            showToast('Mensaje enviado', 'success');
          }}
          mode={replyCtx?.mode ?? 'compose'}
          initialTo={replyCtx?.to}
          initialSubject={replyCtx?.subject}
          initialBody={replyCtx?.initialBody}
          threadId={replyCtx?.threadId}
          parentId={replyCtx?.parentId}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </>
  );
}
