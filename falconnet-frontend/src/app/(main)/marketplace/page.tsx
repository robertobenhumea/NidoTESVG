'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo, resolveUrl } from '@/lib/utils';
import { marketplaceService } from '@/services/marketplace.service';
import { useAuth } from '@/hooks/useAuth';
import type { MarketplaceListing, ProductoCategoria } from '@/types';

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

/* ─── ProductCard ─────────────────────────────────────────────── */

function ProductCard({
  listing,
  onFavorite,
  onClick,
}: {
  listing: MarketplaceListing;
  onFavorite: (id: number) => void;
  onClick: (listing: MarketplaceListing) => void;
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
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

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--bg-surface)] sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
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
          <div className="p-4 pt-0 mt-auto">
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
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSend() {
    if (!nombre.trim()) { setError('Ingresa tu nombre.'); return; }
    setLoading(true);
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
    } catch {
      setError('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="p-6 text-center">
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
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Contactar vendedor</h3>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><IcClose /></button>
            </div>

            <div className="p-4 space-y-3">
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

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
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
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[var(--bg-surface)] sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Nueva publicación</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><IcClose /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[80dvh] overflow-y-auto">
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

          <div className="flex gap-2 pt-1">
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

export default function MarketplacePage() {
  const { user } = useAuth();
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

  const load = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); } else { setLoadingMore(true); }
    setError('');
    const currentPage = reset ? 0 : page;
    try {
      const data = await marketplaceService.getListings({
        page: currentPage,
        size: 12,
        q: query || undefined,
        categoria: category ?? undefined,
      });
      setListings((prev) => reset ? data.listings : [...prev, ...data.listings]);
      setHasMore(data.hasMore);
      setPage(data.page + 1);
    } catch {
      setError('No se pudo cargar el marketplace.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, query, category]);

  useEffect(() => {
    setPage(0);
    load(true);
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
