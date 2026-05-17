'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { marketplaceService } from '@/services/marketplace.service';
import type { MarketplaceListing, ProductoCategoria } from '@/types';

const CATEGORIES: { label: string; value: ProductoCategoria | null }[] = [
  { label: 'Todo',       value: null },
  { label: 'Apuntes',   value: 'APUNTES' },
  { label: 'Tecnología',value: 'TECNOLOGIA' },
  { label: 'Ropa',      value: 'ROPA' },
  { label: 'Comida',    value: 'COMIDA' },
  { label: 'Servicios', value: 'SERVICIOS' },
  { label: 'Gaming',    value: 'GAMING' },
  { label: 'Fitness',   value: 'FITNESS' },
  { label: 'Transporte',value: 'TRANSPORTE' },
  { label: 'Otros',     value: 'OTROS' },
];

const STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  VENDIDO:    'Vendido',
  PAUSADO:    'Pausado',
};

function ProductCard({
  listing,
  onFavorite,
}: {
  listing: MarketplaceListing;
  onFavorite: (id: number) => void;
}) {
  const isSold    = listing.status === 'VENDIDO';
  const isPaused  = listing.status === 'PAUSADO';

  return (
    <div className={`bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col ${isSold || isPaused ? 'opacity-70' : ''}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[var(--bg-elevated)]">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-[var(--text-muted)]">
            🛍️
          </div>
        )}
        {/* Status badge */}
        {(isSold || isPaused) && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-semibold">
            {STATUS_LABELS[listing.status]}
          </div>
        )}
        {/* Favorite */}
        <button
          onClick={() => onFavorite(listing.id)}
          aria-label={listing.isFavorite ? 'Quitar favorito' : 'Agregar favorito'}
          className="absolute top-2 right-2 size-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-black/70"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill={listing.isFavorite ? '#ef4444' : 'none'}
            stroke={listing.isFavorite ? '#ef4444' : 'white'}
            strokeWidth={2}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight line-clamp-2">{listing.title}</p>
        <p className="text-base font-bold text-[var(--brand)]">
          ${listing.price.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
        </p>
        {listing.location && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {listing.location}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-auto pt-1">
          <Avatar src={listing.vendorAvatar} name={listing.vendorName} size="xs" />
          <span className="text-xs text-[var(--text-muted)] truncate">{listing.vendorName}</span>
          <span className="text-xs text-[var(--text-muted)] ml-auto shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    titulo: '', descripcion: '', precio: '',
    categoria: 'OTROS' as ProductoCategoria, imagenUrl: '', ubicacion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
      await marketplaceService.create({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        precio: price,
        categoria: form.categoria,
        imagenUrl: form.imagenUrl.trim() || undefined,
        ubicacion: form.ubicacion.trim() || undefined,
        cantidad: 1,
      });
      onCreated();
    } catch {
      setError('Error al publicar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Nueva publicación</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Título *</label>
            <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="¿Qué vendes?" className="input-field w-full" maxLength={100} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Descripción *</label>
            <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Describe tu artículo…" rows={3} className="input-field w-full resize-none" maxLength={500} />
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
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">URL de imagen</label>
            <input value={form.imagenUrl} onChange={(e) => set('imagenUrl', e.target.value)} placeholder="https://…" className="input-field w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">Ubicación</label>
            <input value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Ej: Aula 12, Cafetería…" className="input-field w-full" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors">
              {loading ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [listings, setListings]   = useState<MarketplaceListing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const [page, setPage]           = useState(0);
  const [query, setQuery]         = useState('');
  const [category, setCategory]   = useState<ProductoCategoria | null>(null);
  const [createOpen, setCreate]   = useState(false);
  const [error, setError]         = useState('');
  const searchTimeout             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
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

  // Initial load + reload on filter change
  useEffect(() => {
    setPage(0);
    load(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  // Debounce search
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
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Marketplace</h1>
        <button
          onClick={() => setCreate(true)}
          className="h-9 px-4 text-sm font-medium rounded-xl bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-colors"
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
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={String(cat.value)}
            onClick={() => setCategory(cat.value)}
            className={`shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-colors ${
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-[var(--bg-elevated)]" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 rounded-full bg-[var(--bg-elevated)]" />
                <div className="h-4 w-20 rounded-full bg-[var(--bg-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <button onClick={() => load(true)} className="mt-3 text-sm text-[var(--brand)] hover:underline">Reintentar</button>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 select-none">🛍️</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Sin resultados</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Sé el primero en publicar algo.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {listings.map((l) => (
              <ProductCard key={l.id} listing={l} onFavorite={handleFavorite} />
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

      {/* Create Modal */}
      {createOpen && (
        <CreateListingModal
          onClose={() => setCreate(false)}
          onCreated={() => { setCreate(false); load(true); }}
        />
      )}
    </div>
  );
}
