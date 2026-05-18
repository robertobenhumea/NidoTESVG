'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { EquipoCard } from '@/components/equipos/EquipoCard';
import { equipoService } from '@/services/equipo.service';
import { ROUTES } from '@/lib/constants';
import type { ReclutamientoFeedItem, TipoReclutamiento } from '@/types';

/* ── Filter pills ── */
type FilterTipo = TipoReclutamiento | 'TODOS' | 'MIOS';

const FILTERS: { value: FilterTipo; label: string }[] = [
  { value: 'TODOS',        label: 'Todos' },
  { value: 'PROYECTO',     label: 'Proyectos' },
  { value: 'HACKATHON',    label: 'Hackathons' },
  { value: 'INNOVATEC',    label: 'Innovatec' },
  { value: 'TORNEO',       label: 'Torneos' },
  { value: 'INVESTIGACION',label: 'Investigación' },
  { value: 'STARTUP',      label: 'Startups' },
  { value: 'MIOS',         label: 'Mis equipos' },
];

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden animate-pulse">
      <div className="h-1.5 bg-[var(--bg-elevated)]" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 w-20 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-[120px] rounded-xl bg-[var(--bg-elevated)]" />
        <div className="space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-[var(--bg-elevated)]" />
          <div className="h-3 w-full rounded bg-[var(--bg-elevated)]" />
          <div className="h-3 w-2/3 rounded bg-[var(--bg-elevated)]" />
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-14 rounded-full bg-[var(--bg-elevated)]" />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-[var(--bg-elevated)]" />
            <div className="h-3 w-20 rounded bg-[var(--bg-elevated)]" />
          </div>
          <div className="h-3 w-10 rounded bg-[var(--bg-elevated)]" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ filter }: { filter: FilterTipo }) {
  const router = useRouter();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center text-3xl">
        {filter === 'MIOS' ? '📋' : '🔍'}
      </div>
      <div>
        <p className="text-base font-semibold text-[var(--text-primary)]">
          {filter === 'MIOS' ? 'Aún no tienes equipos' : 'No hay convocatorias'}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {filter === 'MIOS'
            ? 'Crea una convocatoria o únete a un equipo existente.'
            : 'Prueba con otro filtro o crea la primera convocatoria.'}
        </p>
      </div>
      <button
        onClick={() => router.push('/equipos/crear')}
        className="mt-2 px-5 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors"
      >
        Crear convocatoria
      </button>
    </div>
  );
}

/* ── Search icon ── */
function IcSearch() {
  return (
    <svg className="size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Plus icon ── */
function IcPlus() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Page ── */
export default function EquiposPage() {
  const { user } = useAuth();
  const [items, setItems]     = useState<ReclutamientoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterTipo>('TODOS');
  const [search, setSearch]   = useState('');

  const fetchItems = useCallback(async (f: FilterTipo) => {
    setLoading(true);
    try {
      if (f === 'MIOS') {
        setItems(await equipoService.getMios());
      } else {
        setItems(await equipoService.getActivos());
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(filter); }, [filter, fetchItems]);

  const visible = items.filter((it) => {
    const matchesTipo = filter === 'TODOS' || filter === 'MIOS' || it.tipo === filter;
    const q = search.trim().toLowerCase();
    if (!q) return matchesTipo;
    return matchesTipo && (
      it.nombreProyecto.toLowerCase().includes(q) ||
      (it.nombreEquipo ?? '').toLowerCase().includes(q) ||
      (it.descripcion ?? '').toLowerCase().includes(q) ||
      it.habilidades.some((h) => h.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-0 w-full max-w-5xl mx-auto px-4 pb-8">

      {/* Hero */}
      <div className="py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight">
          Equipos & Convocatorias
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-lg">
          Encuentra proyectos, hackathons, torneos e investigaciones donde puedas contribuir.
        </p>

        {/* CTA */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <Link
            href="/equipos/crear"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors"
          >
            <IcPlus />
            Nueva convocatoria
          </Link>
          {user && (
            <button
              onClick={() => setFilter('MIOS')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Mis equipos
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <IcSearch />
          </span>
          <input
            type="search"
            placeholder="Buscar por nombre, habilidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--brand)] transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={[
                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap',
                filter === f.value
                  ? 'bg-[var(--brand)] border-[var(--brand)] text-white'
                  : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
          : visible.length === 0
            ? <EmptyState filter={filter} />
            : visible.map((it) => <EquipoCard key={it.id} item={it} />)
        }
      </div>
    </div>
  );
}
