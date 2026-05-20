'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/ui/Avatar';
import { marketplaceService } from '@/services/marketplace.service';
import { useAuth } from '@/hooks/useAuth';
import { timeAgo, resolveUrl } from '@/lib/utils';
import type { MarketplaceListing } from '@/types';

/* ── Constants ─────────────────────────────────────────────────── */

const CATEGORY_ICONS: Record<string, string> = {
  APUNTES: '📚', TECNOLOGIA: '💻', ROPA: '👕', COMIDA: '🍔',
  SERVICIOS: '🛠️', GAMING: '🎮', FITNESS: '💪', TRANSPORTE: '🚗', OTROS: '📦',
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DISPONIBLE: { label: 'Disponible', color: 'bg-emerald-500' },
  VENDIDO:    { label: 'Vendido',    color: 'bg-gray-500'    },
  PAUSADO:    { label: 'Pausado',    color: 'bg-amber-500'   },
};

/* ── Icons ────────────────────────────────────────────────────── */

function IcHeart({ filled }: { filled?: boolean }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24"
      fill={filled ? '#ef4444' : 'none'}
      stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth={2}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
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

/* ── Contact modal ─────────────────────────────────────────────── */

function ContactModal({
  listing,
  buyerName,
  onClose,
}: {
  listing: MarketplaceListing;
  buyerName: string;
  onClose: () => void;
}) {
  const [nombre,  setNombre]  = useState(buyerName);
  const [mensaje, setMensaje] = useState('');
  const [aula,    setAula]    = useState('');
  const [horario, setHorario] = useState('');
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

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
      setTimeout(onClose, 2000);
    } catch {
      setError('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {done ? (
          <div className="p-6 text-center" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <svg className="size-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-bold text-[var(--text-primary)]">¡Solicitud enviada!</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">El vendedor recibirá tu mensaje.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Contactar vendedor</h3>
              <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors">
                <IcClose />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-elevated)]">
                {listing.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={resolveUrl(listing.imageUrl) ?? listing.imageUrl} alt="" className="size-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="size-10 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-xl shrink-0">
                    {CATEGORY_ICONS[listing.category] ?? '📦'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{listing.title}</p>
                  <p className="text-sm font-bold text-[var(--brand)]">${listing.price.toLocaleString('es-MX')}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Tu nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre completo"
                  className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Mensaje (opcional)</label>
                <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2} placeholder="Escribe un mensaje al vendedor..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] resize-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Aula</label>
                  <input value={aula} onChange={(e) => setAula(e.target.value)} placeholder="Ej: A-101"
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Horario</label>
                  <input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Ej: 10:00–11:00"
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border)] shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <button onClick={handleSend} disabled={sending || !nombre.trim()}
                className="w-full h-11 rounded-xl bg-[var(--brand)] text-white font-semibold text-sm hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {sending && <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                Enviar solicitud
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ── Detail modal ─────────────────────────────────────────────── */

function DetailModal({
  listing,
  isFavorite,
  onClose,
  onFavoriteToggle,
  onContact,
}: {
  listing: MarketplaceListing;
  isFavorite: boolean;
  onClose: () => void;
  onFavoriteToggle: () => void;
  onContact: () => void;
}) {
  const unavailable = listing.status !== 'DISPONIBLE';
  const status      = STATUS_CFG[listing.status];
  const catIcon     = CATEGORY_ICONS[listing.category] ?? '📦';
  const imageUrl    = listing.imageUrl ? (resolveUrl(listing.imageUrl) ?? listing.imageUrl) : null;

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-[var(--bg-elevated)] shrink-0">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl text-[var(--text-muted)]">
              {catIcon}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          <div className="absolute top-0 inset-x-0 flex items-center justify-between p-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.color} text-white text-[11px] font-bold`}>
              <span className="size-1.5 rounded-full bg-white/80" />
              {status.label}
            </div>
            <button onClick={onClose}
              className="size-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <IcClose />
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <p className="text-white text-xl font-bold drop-shadow">
                ${listing.price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
              {listing.favoriteCount > 0 && (
                <p className="text-white/80 text-xs">
                  {listing.favoriteCount} {listing.favoriteCount === 1 ? 'persona interesada' : 'personas interesadas'}
                </p>
              )}
            </div>
            <button
              onClick={onFavoriteToggle}
              aria-label={isFavorite ? 'Quitar favorito' : 'Guardar'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-semibold transition-all ${
                isFavorite ? 'bg-red-500/80 text-white' : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              <IcHeart filled={isFavorite} />
              {isFavorite ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-start gap-2">
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex-1 leading-tight">{listing.title}</h2>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs font-medium">
                  {catIcon} {listing.category}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {timeAgo(listing.createdAt)}{listing.location ? ` · ${listing.location}` : ''}
              </p>
            </div>

            {listing.description && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Descripción</p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Avatar src={listing.vendorAvatar} name={listing.vendorName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{listing.vendorName}</p>
                <p className="text-xs text-[var(--text-muted)]">Vendedor</p>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0 mt-auto shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={!unavailable ? onContact : undefined}
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

/* ── Main exported card ────────────────────────────────────────── */

interface Props {
  listing: MarketplaceListing;
  onUpdate?: (updated: MarketplaceListing) => void;
}

export function MarketplaceCard({ listing: initialListing, onUpdate }: Props) {
  const { user } = useAuth();

  const [listing,       setListing]       = useState(initialListing);
  const [showDetail,    setShowDetail]    = useState(false);
  const [showContact,   setShowContact]   = useState(false);
  const [favLoading,    setFavLoading]    = useState(false);

  // Sync if parent updates the listing (e.g., favorites toggled elsewhere)
  useEffect(() => { setListing(initialListing); }, [initialListing]);

  const isSold      = listing.status === 'VENDIDO';
  const isPaused    = listing.status === 'PAUSADO';
  const unavailable = isSold || isPaused;
  const status      = STATUS_CFG[listing.status];
  const catIcon     = CATEGORY_ICONS[listing.category] ?? '📦';
  const imageUrl    = listing.imageUrl ? (resolveUrl(listing.imageUrl) ?? listing.imageUrl) : null;

  async function toggleFav(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);
    const optimistic: MarketplaceListing = {
      ...listing,
      isFavorite:    !listing.isFavorite,
      favoriteCount: listing.favoriteCount + (listing.isFavorite ? -1 : 1),
    };
    setListing(optimistic);
    onUpdate?.(optimistic);
    try {
      await marketplaceService.toggleFavorite(listing.id);
    } catch {
      setListing(listing);
      onUpdate?.(listing);
    } finally {
      setFavLoading(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Ver ${listing.title}`}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => e.key === 'Enter' && setShowDetail(true)}
        className={`group bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${unavailable ? 'opacity-60' : ''}`}
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] bg-[var(--bg-elevated)] overflow-hidden shrink-0">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={listing.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
              <span className="text-3xl">{catIcon}</span>
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
            onClick={toggleFav}
            disabled={favLoading}
            aria-label={listing.isFavorite ? 'Quitar favorito' : 'Guardar'}
            className="absolute top-2 right-2 size-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 disabled:opacity-50"
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
              onClick={(e) => { e.stopPropagation(); setShowContact(true); }}
              className="mt-2 w-full h-8 rounded-xl bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-hover)] transition-colors flex items-center justify-center gap-1.5"
            >
              <IcMessage />
              Contactar
            </button>
          ) : (
            <div className="mt-2 w-full h-8 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs font-medium flex items-center justify-center">
              {STATUS_CFG[listing.status].label}
            </div>
          )}
        </div>
      </div>

      {showDetail && (
        <DetailModal
          listing={listing}
          isFavorite={listing.isFavorite}
          onClose={() => setShowDetail(false)}
          onFavoriteToggle={() => toggleFav()}
          onContact={() => { setShowDetail(false); setShowContact(true); }}
        />
      )}

      {showContact && (
        <ContactModal
          listing={listing}
          buyerName={user?.displayName ?? user?.username ?? ''}
          onClose={() => setShowContact(false)}
        />
      )}
    </>
  );
}
