'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo, resolveUrl } from '@/lib/utils';
import { marketplaceService } from '@/services/marketplace.service';
import { useAuth } from '@/hooks/useAuth';
import type { MarketplaceListing, ProductoCategoria, SolicitudCompra } from '@/types';

/* ─── Constants ─────────────────────────────────────────────── */

const CATEGORIES: { label: string; value: ProductoCategoria | null }[] = [
  { label: 'Todo',        value: null },
  { label: 'Apuntes',    value: 'APUNTES' },
  { label: 'Tecnología', value: 'TECNOLOGIA' },
  { label: 'Ropa',       value: 'ROPA' },
  { label: 'Comida',     value: 'COMIDA' },
  { label: 'Servicios',  value: 'SERVICIOS' },
  { label: 'Gaming',     value: 'GAMING' },
  { label: 'Fitness',    value: 'FITNESS' },
  { label: 'Transporte', value: 'TRANSPORTE' },
  { label: 'Otros',      value: 'OTROS' },
];

const CATEGORY_ICONS: Record<string, string> = {
  APUNTES: '📚', TECNOLOGIA: '💻', ROPA: '👕', COMIDA: '🍔',
  SERVICIOS: '🛠️', GAMING: '🎮', FITNESS: '💪', TRANSPORTE: '🚗', OTROS: '📦',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DISPONIBLE: { label: 'Disponible', color: 'bg-emerald-500' },
  VENDIDO:    { label: 'Vendido',    color: 'bg-gray-500' },
  PAUSADO:    { label: 'Pausado',    color: 'bg-amber-500' },
};

/* ─── Icons ──────────────────────────────────────────────────── */

function IcHeart({ filled }: { filled?: boolean }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24"
      fill={filled ? '#ef4444' : 'none'}
      stroke={filled ? '#ef4444' : 'currentColor'}
      strokeWidth={2}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcPin() {
  return (
    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IcClose() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IcUpload() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function IcMessage() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IcCheck() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IcX() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IcBox() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IcCalendar() {
  return (
    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IcClock() {
  return (
    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ─── Solicitud Estado Badge ─────────────────────────────────── */

const SOLICITUD_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  PENDIENTE:  { label: 'Pendiente',  bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-400' },
  ACEPTADA:   { label: 'Aceptada',   bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  RECHAZADA:  { label: 'Rechazada',  bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-400' },
  ENTREGADA:  { label: 'Entregada',  bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-500 dark:text-gray-400' },
};

/* ─── SolicitudCard ──────────────────────────────────────────── */

function SolicitudCard({
  solicitud,
  onUpdate,
}: {
  solicitud: SolicitudCompra;
  onUpdate: (id: number, estado: string) => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const isPending = solicitud.estado === 'PENDIENTE';
  const statusCfg = SOLICITUD_STATUS[solicitud.estado] ?? SOLICITUD_STATUS.PENDIENTE;

  async function handleAction(estado: string) {
    setUpdating(estado);
    try {
      await onUpdate(solicitud.id, estado);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div
      className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden transition-all duration-300"
      style={{ opacity: updating ? 0.7 : 1 }}
    >
      {/* Product row */}
      <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
        <div className="size-12 shrink-0 rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
          {solicitud.productoImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolveUrl(solicitud.productoImageUrl) ?? solicitud.productoImageUrl}
              alt={solicitud.productoTitulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">📦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">{solicitud.productoTitulo}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
            <IcCalendar />
            {timeAgo(solicitud.createdAt)}
          </p>
        </div>
        {/* Estado badge */}
        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Buyer info + message */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Avatar src={solicitud.compradorAvatar} name={solicitud.compradorNombre} size="xs" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)]">{solicitud.compradorNombre}</p>
            <p className="text-[11px] text-[var(--text-muted)]">Comprador</p>
          </div>
        </div>

        {solicitud.mensaje && (
          <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)] rounded-xl p-2.5 leading-relaxed line-clamp-3">
            {solicitud.mensaje}
          </p>
        )}

        {(solicitud.lugar || solicitud.horario) && (
          <div className="flex flex-wrap gap-2">
            {solicitud.lugar && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg">
                <IcPin />{solicitud.lugar}
              </span>
            )}
            {solicitud.horario && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg">
                <IcClock />{solicitud.horario}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons — only when PENDIENTE */}
      {isPending && (
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={() => handleAction('ACEPTADA')}
            disabled={updating !== null}
            className="flex-1 min-h-[36px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <IcCheck />
            {updating === 'ACEPTADA' ? 'Aceptando…' : 'Aceptar'}
          </button>
          <button
            onClick={() => handleAction('RECHAZADA')}
            disabled={updating !== null}
            className="flex-1 min-h-[36px] rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <IcX />
            {updating === 'RECHAZADA' ? 'Rechazando…' : 'Rechazar'}
          </button>
          <button
            onClick={() => handleAction('ENTREGADA')}
            disabled={updating !== null}
            className="flex-1 min-h-[36px] rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <IcBox />
            {updating === 'ENTREGADA' ? 'Marcando…' : 'Vendido'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── SolicitudSkeleton ──────────────────────────────────────── */

function SolicitudSkeleton() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
        <div className="size-12 rounded-xl bg-[var(--bg-elevated)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3 w-1/3 rounded-full bg-[var(--bg-elevated)]" />
        </div>
        <div className="h-5 w-16 rounded-full bg-[var(--bg-elevated)]" />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3 w-28 rounded-full bg-[var(--bg-elevated)]" />
        </div>
        <div className="h-10 rounded-xl bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}

/* ─── SolicitudesPanel ───────────────────────────────────────── */

function SolicitudesPanel() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    marketplaceService.getSolicitudesRecibidas()
      .then((data) => setSolicitudes(data))
      .catch(() => setError('No se pudieron cargar las solicitudes.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdate(id: number, estado: string) {
    // Optimistic update
    const prev = solicitudes;
    setSolicitudes((s) =>
      s.map((sol) =>
        sol.id === id
          ? { ...sol, estado: estado as SolicitudCompra['estado'] }
          : sol,
      ),
    );
    try {
      await marketplaceService.actualizarSolicitud(id, estado);
    } catch {
      // Rollback on failure
      setSolicitudes(prev);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <SolicitudSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError('');
            marketplaceService.getSolicitudesRecibidas()
              .then((data) => setSolicitudes(data))
              .catch(() => setError('No se pudieron cargar las solicitudes.'))
              .finally(() => setLoading(false));
          }}
          className="text-sm text-[var(--brand)] hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4 text-3xl select-none">
          📬
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Sin solicitudes aún</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[220px] mx-auto">
          Cuando alguien quiera comprar uno de tus productos, verás sus solicitudes aquí.
        </p>
      </div>
    );
  }

  const pending  = solicitudes.filter((s) => s.estado === 'PENDIENTE');
  const finished = solicitudes.filter((s) => s.estado !== 'PENDIENTE');

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Pendientes · {pending.length}
          </p>
          <div className="space-y-3">
            {pending.map((s) => (
              <SolicitudCard key={s.id} solicitud={s} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}
      {finished.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Historial · {finished.length}
          </p>
          <div className="space-y-3">
            {finished.map((s) => (
              <SolicitudCard key={s.id} solicitud={s} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ProductCard ─────────────────────────────────────────────── */

function ProductCard({
  listing,
  onFavorite,
  onClick,
  onContact,
}: {
  listing: MarketplaceListing;
  onFavorite: (id: number) => void;
  onClick: (listing: MarketplaceListing) => void;
  onContact: (listing: MarketplaceListing) => void;
}) {
  const isSold   = listing.status === 'VENDIDO';
  const isPaused = listing.status === 'PAUSADO';
  const unavailable = isSold || isPaused;
  const status = STATUS_CONFIG[listing.status];
  const categoryIcon = CATEGORY_ICONS[listing.category] ?? '📦';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver ${listing.title}`}
      onClick={() => onClick(listing)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(listing)}
      className={`group bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${unavailable ? 'opacity-60' : ''}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[var(--bg-elevated)] overflow-hidden shrink-0">
        {listing.imageUrl ? (
          <Image
            src={resolveUrl(listing.imageUrl) ?? listing.imageUrl}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
            <span className="text-3xl">{categoryIcon}</span>
          </div>
        )}

        {/* Status badge */}
        {unavailable && (
          <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full ${status.color} text-white text-[10px] font-bold`}>
            {status.label}
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(listing.id); }}
          aria-label={listing.isFavorite ? 'Quitar favorito' : 'Agregar favorito'}
          className="absolute top-2 right-2 size-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110"
        >
          <IcHeart filled={listing.isFavorite} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight line-clamp-2">{listing.title}</p>
        <p className="text-base font-bold text-[var(--brand)] mt-0.5">
          ${listing.price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
        </p>
        {listing.location && (
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
            <IcPin />{listing.location}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-auto pt-2">
          <Avatar src={listing.vendorAvatar} name={listing.vendorName} size="xs" />
          <span className="text-[11px] text-[var(--text-muted)] truncate flex-1">{listing.vendorName}</span>
          <span className="text-[11px] text-[var(--text-muted)] shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>

        {!unavailable ? (
          <button
            onClick={(e) => { e.stopPropagation(); onContact(listing); }}
            className="mt-2 w-full h-8 rounded-xl bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-hover)] transition-colors flex items-center justify-center gap-1.5"
          >
            <IcMessage />
            Contactar
          </button>
        ) : (
          <div className="mt-2 w-full h-8 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs font-medium flex items-center justify-center">
            {STATUS_CONFIG[listing.status].label}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ProductDetailModal ──────────────────────────────────────── */

function ProductDetailModal({
  listing,
  onClose,
  onFavorite,
  onContact,
}: {
  listing: MarketplaceListing;
  onClose: () => void;
  onFavorite: (id: number) => void;
  onContact: (listing: MarketplaceListing) => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const unavailable = listing.status === 'VENDIDO' || listing.status === 'PAUSADO';
  const status = STATUS_CONFIG[listing.status];
  const categoryIcon = CATEGORY_ICONS[listing.category] ?? '📦';
  const imageUrl = listing.imageUrl ? (resolveUrl(listing.imageUrl) ?? listing.imageUrl) : null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image header */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-[var(--bg-elevated)] shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl text-[var(--text-muted)]">
              {categoryIcon}
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between p-3">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${status.color} text-white text-xs font-bold`}>
              <span className="size-1.5 rounded-full bg-white/80" />
              {status.label}
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <IcClose />
            </button>
          </div>

          {/* Price overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <p className="text-white text-xl font-bold drop-shadow">
                ${listing.price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
              {listing.favoriteCount > 0 && (
                <p className="text-white/80 text-xs">{listing.favoriteCount} {listing.favoriteCount === 1 ? 'persona interesada' : 'personas interesadas'}</p>
              )}
            </div>
            <button
              onClick={() => onFavorite(listing.id)}
              aria-label={listing.isFavorite ? 'Quitar favorito' : 'Guardar'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-semibold transition-all ${listing.isFavorite ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
            >
              <IcHeart filled={listing.isFavorite} />
              {listing.isFavorite ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Title + category */}
            <div>
              <div className="flex items-start gap-2">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex-1 leading-tight">{listing.title}</h2>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs font-medium">
                  {categoryIcon} {listing.category}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">{timeAgo(listing.createdAt)}{listing.location ? ` · ${listing.location}` : ''}</p>
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Descripción</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Vendor */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Avatar src={listing.vendorAvatar} name={listing.vendorName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{listing.vendorName}</p>
                <p className="text-xs text-[var(--text-muted)]">Vendedor</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div
            className="p-4 pt-0 mt-auto shrink-0"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => !unavailable && onContact(listing)}
              disabled={unavailable}
              className="w-full h-11 rounded-xl bg-[var(--brand)] text-white font-semibold text-sm hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <IcMessage />
              {unavailable ? 'No disponible' : 'Contactar vendedor'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── ContactModal ────────────────────────────────────────────── */

function ContactModal({
  listing,
  buyerName,
  onClose,
}: {
  listing: MarketplaceListing;
  buyerName: string;
  onClose: () => void;
}) {
  const [nombre, setNombre]   = useState(buyerName);
  const [mensaje, setMensaje] = useState('');
  const [aula, setAula]       = useState('');
  const [horario, setHorario] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSend() {
    if (!nombre.trim()) { setError('Ingresa tu nombre.'); return; }
    setSending(true);
    setError('');
    try {
      await marketplaceService.requestPurchase({
        productoId: listing.id,
        nombreComprador: nombre.trim(),
        mensaje: mensaje.trim() || undefined,
        aula: aula.trim() || undefined,
        horario: horario.trim() || undefined,
      });
      setDone(true);
      // Auto-cierre después de mostrar confirmación
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error('CONTACT ERROR:', err);
      setError('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        {done ? (
          <div
            className="p-6 text-center"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <svg className="size-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-base font-bold text-[var(--text-primary)]">¡Solicitud enviada!</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">{listing.vendorName} recibirá tu mensaje.</p>
            <button onClick={onClose} className="w-full h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors">
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Contactar vendedor</h3>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><IcClose /></button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Product mini-card */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)]">
                <div className="size-11 rounded-xl overflow-hidden shrink-0 bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
                  {listing.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={resolveUrl(listing.imageUrl) ?? listing.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{CATEGORY_ICONS[listing.category] ?? '📦'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">{listing.title}</p>
                  <p className="text-sm font-bold text-[var(--brand)]">${listing.price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Tu nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿Cómo te llamas?" className="input-field w-full" />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Mensaje</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="¿Tienes alguna pregunta o propuesta?"
                  rows={3}
                  maxLength={300}
                  className="input-field w-full resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Aula / Lugar</label>
                  <input value={aula} onChange={(e) => setAula(e.target.value)} placeholder="Ej: Aula 12" className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Horario</label>
                  <input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Ej: 10am–12pm" className="input-field w-full" />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            {/* Buttons always visible at bottom */}
            <div
              className="flex gap-2 p-4 pt-3 border-t border-[var(--border)] shrink-0 bg-[var(--bg-surface)]"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors"
              >
                {sending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ─── CreateListingModal ──────────────────────────────────────── */

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    titulo: '', descripcion: '', precio: '',
    categoria: 'OTROS' as ProductoCategoria, ubicacion: '',
  });
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const fileRef                         = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function set(field: string, val: string) {
    setForm((p) => ({ ...p, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descripcion.trim() || !form.precio) {
      setError('Completa los campos requeridos.');
      return;
    }
    const price = parseFloat(form.precio);
    if (isNaN(price) || price <= 0) { setError('Precio inválido.'); return; }

    setLoading(true);
    setError('');
    try {
      let imagenUrl: string | undefined;
      if (imageFile) {
        setUploading(true);
        const raw = await marketplaceService.uploadImage(imageFile);
        setUploading(false);
        imagenUrl = raw;
      }
      await marketplaceService.create({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        precio: price,
        categoria: form.categoria,
        imagenUrl,
        ubicacion: form.ubicacion.trim() || undefined,
        cantidad: 1,
      });
      onCreated();
    } catch {
      setUploading(false);
      setError('Error al publicar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Nueva publicación</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><IcClose /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Image upload */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Foto del producto</label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[var(--bg-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 size-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <IcClose />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
              >
                <IcUpload />
                <span className="text-sm font-medium">Subir foto</span>
                <span className="text-xs">JPG, PNG · Máx 5 MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Título *</label>
            <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="¿Qué vendes?" className="input-field w-full" maxLength={100} />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Descripción *</label>
            <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Estado, características, incluye…" rows={3} className="input-field w-full resize-none" maxLength={500} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Precio (MXN) *</label>
              <input type="number" value={form.precio} onChange={(e) => set('precio', e.target.value)} placeholder="0.00" min={0} className="input-field w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Categoría</label>
              <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)} className="input-field w-full">
                {CATEGORIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value!}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Ubicación / Punto de entrega</label>
            <input value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Ej: Aula 12, Cafetería…" className="input-field w-full" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div
            className="flex gap-2 pt-1 pb-1"
            style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
          >
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors">
              {uploading ? 'Subiendo imagen…' : loading ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[var(--bg-elevated)]" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-3/4 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-4 w-20 rounded-full bg-[var(--bg-elevated)]" />
        <div className="flex items-center gap-1.5 mt-2">
          <div className="size-5 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3 w-24 rounded-full bg-[var(--bg-elevated)]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

type MarketTab = 'explorar' | 'solicitudes';

export default function MarketplacePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab]       = useState<MarketTab>('explorar');
  const [hasOwnListings, setHasOwnListings] = useState(false);
  const [listings, setListings]         = useState<MarketplaceListing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(false);
  const [page, setPage]                 = useState(0);
  const [query, setQuery]               = useState('');
  const [category, setCategory]         = useState<ProductoCategoria | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);
  const [detailListing, setDetail]      = useState<MarketplaceListing | null>(null);
  const [contactListing, setContact]    = useState<MarketplaceListing | null>(null);
  const [error, setError]               = useState('');
  const searchTimeout                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (reset = false, pageOverride?: number) => {
    if (reset) { setLoading(true); } else { setLoadingMore(true); }
    setError('');
    const currentPage = pageOverride ?? (reset ? 0 : page);
    try {
      const data = await marketplaceService.getListings({
        page: currentPage,
        size: 12,
        q: query || undefined,
        categoria: category ?? undefined,
      });
      setListings((prev) => {
        const merged = reset ? data.listings : [...prev, ...data.listings];
        return merged;
      });
      setHasMore(data.hasMore);
      setPage(data.page + 1);
      // If any listing belongs to this user, show the solicitudes tab
      setHasOwnListings((already) => {
        if (already) return true;
        return data.listings.some((l) => l.vendorId === (user?.id ?? -1));
      });
    } catch {
      setError('No se pudo cargar el marketplace.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, query, category, user?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  function handleSearch(val: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setQuery(val), 400);
  }

  function handleFavorite(id: number) {
    marketplaceService.toggleFavorite(id).catch(() => {});
    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, isFavorite: !l.isFavorite, favoriteCount: l.isFavorite ? l.favoriteCount - 1 : l.favoriteCount + 1 }
          : l,
      ),
    );
    if (detailListing?.id === id) {
      setDetail((d) => d ? { ...d, isFavorite: !d.isFavorite, favoriteCount: d.isFavorite ? d.favoriteCount - 1 : d.favoriteCount + 1 } : null);
    }
  }

  function handleOpenDetail(listing: MarketplaceListing) {
    setDetail(listing);
  }

  function handleOpenContact(listing: MarketplaceListing) {
    setDetail(null);
    setContact(listing);
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Marketplace</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Compra y vende con tus compañeros</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="shrink-0 h-9 px-4 text-sm font-semibold rounded-xl bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
        >
          + Publicar
        </button>
      </div>

      {/* Tab switcher — only shown when user has own listings */}
      {hasOwnListings && (
        <div className="flex gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setActiveTab('explorar')}
            className={`flex-1 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'explorar'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Explorar
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex-1 h-8 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'solicitudes'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Mis solicitudes
          </button>
        </div>
      )}

      {/* Solicitudes tab content */}
      {activeTab === 'solicitudes' && hasOwnListings ? (
        <SolicitudesPanel />
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar artículos…"
              className="w-full h-10 pl-9 pr-4 rounded-xl text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 sm:-mx-4 px-3 sm:px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={String(cat.value)}
                onClick={() => setCategory(cat.value)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-[var(--text-muted)]">{error}</p>
              <button onClick={() => load(true)} className="text-sm text-[var(--brand)] hover:underline">Reintentar</button>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 select-none">🛍️</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Sin resultados</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Sé el primero en publicar algo.</p>
              <button onClick={() => setCreateOpen(true)} className="mt-4 text-sm font-medium text-[var(--brand)] hover:underline">
                Publicar ahora
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listings.map((l) => (
                  <ProductCard
                    key={l.id}
                    listing={l}
                    onFavorite={handleFavorite}
                    onClick={handleOpenDetail}
                    onContact={handleOpenContact}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => load(false)}
                    disabled={loadingMore}
                    className="h-9 px-6 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? 'Cargando…' : 'Ver más'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      {createOpen && (
        <CreateListingModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); load(true); }}
        />
      )}

      {detailListing && (
        <ProductDetailModal
          listing={detailListing}
          onClose={() => setDetail(null)}
          onFavorite={handleFavorite}
          onContact={handleOpenContact}
        />
      )}

      {contactListing && (
        <ContactModal
          listing={contactListing}
          buyerName={user?.displayName ?? user?.username ?? ''}
          onClose={() => setContact(null)}
        />
      )}
    </div>
  );
}
