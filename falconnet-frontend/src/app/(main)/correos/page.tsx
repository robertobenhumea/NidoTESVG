'use client';

import { useState, useEffect, useCallback, useRef, type TouchEvent as RTouchEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { timeAgo, cn } from '@/lib/utils';
import { ComposeModal } from './components/ComposeModal';
import { MailDetail }   from './components/MailDetail';
import type { CorreoItem, Tab, FilterType, BUser } from './components/types';

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
  msg:        CorreoItem;
  tab:        Tab;
  isSelected: boolean;
  onClick:    () => void;
  onFavorite: (id: number) => void;
  onTrash:    (id: number) => void;
}

function MailItem({ msg, tab, isSelected, onClick, onFavorite, onTrash }: MailItemProps) {
  const [dragX, setDragX]       = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX                  = useRef(0);
  const startY                  = useRef(0);
  const axisLock                = useRef<'x' | 'y' | null>(null);

  const isInbox  = tab === 'entrada';
  const isUnread = !msg.leido && tab === 'entrada';

  const displayName = isInbox
    ? (msg.emisorNombre ?? `#${msg.emisorId}`)
    : (msg.destinatarioNombres?.join(', ') ?? '…');

  const preview = (msg.cuerpo ?? '').replace(/\n+/g, ' ').trim();

  function onTouchStart(e: RTouchEvent<HTMLButtonElement>) {
    startX.current   = e.touches[0].clientX;
    startY.current   = e.touches[0].clientY;
    axisLock.current = null;
  }

  function onTouchMove(e: RTouchEvent<HTMLButtonElement>) {
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
    if (dragging && dragX < -52 && isInbox) {
      onTrash(msg.id);
    }
    setDragX(0);
    setDragging(false);
    axisLock.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe reveal — trash */}
      {isInbox && dragX < -8 && (
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

      <button
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform:  `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
        className={cn(
          'w-full text-left px-3 py-3 rounded-xl transition-colors duration-150',
          isSelected
            ? 'bg-[var(--brand-muted)]'
            : 'hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]',
        )}
      >
        <div className="flex items-start gap-3">
          {/* Avatar + unread dot */}
          <div className="relative shrink-0 mt-0.5">
            <Avatar
              src={isInbox ? resolveUrl(msg.emisorFoto) : undefined}
              name={displayName}
              size="sm"
            />
            {isUnread && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--brand)] border-2 border-[var(--bg-surface)]" />
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
                {timeAgo(msg.fecha)}
              </time>
            </div>
            <p className={cn(
              'text-xs truncate',
              isUnread ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
            )}>
              {msg.asunto}
            </p>
            {preview && (
              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 leading-snug">
                {preview}
              </p>
            )}
          </div>

          {/* Star */}
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
        </div>
      </button>
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
};

const TAB_LABELS: Record<Tab, string> = {
  entrada:   'Entrada',
  enviados:  'Enviados',
  favoritos: 'Favoritos',
};

function SidebarNav({
  tab, unreadCount, onSwitchTab, onCompose,
}: {
  tab: Tab; unreadCount: number;
  onSwitchTab: (t: Tab) => void; onCompose: () => void;
}) {
  const tabs: Tab[] = ['entrada', 'enviados', 'favoritos'];
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
interface ReplyContext { to: BUser[]; subject: string; }

export default function CorreosPage() {
  const [tab, setTab]               = useState<Tab>('entrada');
  const [items, setItems]           = useState<CorreoItem[]>([]);
  const [selected, setSelected]     = useState<CorreoItem | null>(null);
  const [loading, setLoading]       = useState(true);
  const [compose, setCompose]       = useState(false);
  const [replyCtx, setReplyCtx]     = useState<ReplyContext | null>(null);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterType>('all');
  const [drawer, setDrawer]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const path = tab === 'entrada' ? '/correos/entrada' : tab === 'enviados' ? '/correos/enviados' : '/correos/favoritos';
      setItems(await api.get<CorreoItem[]>(path));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  /* ── Actions ── */
  async function handleFavorite(id: number) {
    await api.put(`/correos/${id}/favorito`).catch(() => {});
    setItems(prev => {
      const wasFav = prev.find(m => m.id === id)?.esFavorito;
      showToast(wasFav ? 'Quitado de favoritos' : '⭐ Marcado como favorito');
      const updated = prev.map(m => m.id === id ? { ...m, esFavorito: !m.esFavorito } : m);
      return tab === 'favoritos' ? updated.filter(m => m.id !== id) : updated;
    });
    setSelected(s => s?.id === id ? { ...s, esFavorito: !s.esFavorito } : s);
    if (tab === 'favoritos') setSelected(s => s?.id === id ? null : s);
  }

  async function handleTrash(id: number) {
    await api.put(`/correos/${id}/papelera`).catch(() => {});
    setItems(p => p.filter(m => m.id !== id));
    setSelected(s => s?.id === id ? null : s);
    showToast('Movido a papelera');
  }

  function openMessage(msg: CorreoItem) {
    setSelected(msg);
    if (tab === 'entrada' && !msg.leido) {
      api.put(`/correos/${msg.id}/leer`).catch(() => {});
      setItems(p => p.map(m => m.id === msg.id ? { ...m, leido: true } : m));
    }
  }

  function handleReply() {
    if (!selected || tab !== 'entrada') return;
    setReplyCtx({
      to: [{
        id:         selected.emisorId,
        username:   selected.emisorNombre ?? `Usuario #${selected.emisorId}`,
        fotoPerfil: selected.emisorFoto,
      }],
      subject: selected.asunto.startsWith('Re: ') ? selected.asunto : `Re: ${selected.asunto}`,
    });
    setCompose(true);
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
  }

  /* ── Keyboard shortcuts — use ref to avoid stale closures ── */
  const handlersRef = useRef({ handleFavorite, handleTrash, handleReply });
  handlersRef.current = { handleFavorite, handleTrash, handleReply };

  const stateRef = useRef({ selected, tab, compose, drawer });
  stateRef.current = { selected, tab, compose, drawer };

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  /* ── Filtered items ── */
  const filteredItems = items
    .filter(m => {
      if (filter === 'unread')  return !m.leido;
      if (filter === 'starred') return m.esFavorito;
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

  const unreadCount = items.filter(m => !m.leido).length;

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
            unreadCount={unreadCount}
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
                unreadCount={unreadCount}
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
              {tab === 'entrada' && unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-[var(--brand)]">({unreadCount})</span>
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
              {TAB_LABELS[tab]}
              {tab === 'entrada' && unreadCount > 0 && (
                <span className="ml-1.5 text-[var(--brand)] normal-case tracking-normal">({unreadCount})</span>
              )}
            </span>
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
          </div>

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
                className="w-full pl-8 pr-8 h-9 rounded-xl bg-[var(--bg-elevated)] border border-transparent focus:border-[var(--border-focus)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="px-3 pb-2 flex items-center gap-1.5 shrink-0">
            {([
              { key: 'all' as const,     label: 'Todos' },
              { key: 'unread' as const,  label: 'No leídos' },
              { key: 'starred' as const, label: '⭐ Favoritos' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
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
            ) : filteredItems.length === 0 ? (
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
                  />
                ))}
              </div>
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
            if (tab === 'enviados') load();
            showToast('Mensaje enviado', 'success');
          }}
          initialTo={replyCtx?.to}
          initialSubject={replyCtx?.subject}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </>
  );
}
