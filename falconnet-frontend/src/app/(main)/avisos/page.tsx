'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { PostMedia } from '@/components/feed/PostMedia';
import { timeAgo } from '@/lib/utils';

interface Aviso {
  id: number;
  titulo: string;
  contenido: string;
  carrera?: string;
  imagenUrl?: string;
  fecha: string;
  creadorNombre?: string;
}

/* ── Skeleton ── */
function AvisoSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border)] animate-pulse">
      <div className="h-16 bg-[#1A1A2E]" />
      <div className="p-4 space-y-2 bg-[var(--bg-surface)]">
        <div className="h-4 w-2/3 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-3 w-full rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-3 w-5/6 rounded-full bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}

/* ── Card ── */
function AvisoCard({ aviso }: { aviso: Aviso }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = aviso.contenido.length > 220;

  return (
    <article
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{ border: '1px solid rgba(180, 130, 20, 0.2)' }}
      aria-label={`Aviso: ${aviso.titulo}`}
    >
      {/* Institutional header */}
      <div
        className="px-4 pt-3.5 pb-3.5"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            {/* Badge */}
            <span className="self-start inline-flex items-center gap-1.5 bg-amber-400 text-[#1A1A2E] text-[9px] font-extrabold uppercase tracking-widest rounded-full px-2.5 py-0.5 leading-none">
              <svg className="size-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
              Aviso oficial
            </span>

            {/* Title */}
            <h2 className="text-[15px] font-bold text-white leading-snug">
              {aviso.titulo}
            </h2>
          </div>

          <time
            dateTime={aviso.fecha}
            className="text-[11px] text-white/40 shrink-0 pt-0.5"
          >
            {timeAgo(aviso.fecha)}
          </time>
        </div>

        {/* Target audience */}
        {aviso.carrera && (
          <div className="flex items-center gap-1.5 mt-2">
            <svg className="size-3 text-amber-400/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-[11px] font-medium text-amber-300/70">
              {aviso.carrera}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="bg-[var(--bg-surface)] px-4 py-3.5">
        <p
          className={`text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words ${
            !expanded && isLong ? 'line-clamp-4' : ''
          }`}
        >
          {aviso.contenido}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[var(--brand)] font-medium mt-1.5 hover:underline focus-visible:underline"
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </div>

      {/* Image */}
      {aviso.imagenUrl && (
        <div className="border-t border-[var(--border)]">
          <PostMedia src={aviso.imagenUrl} alt={`Imagen del aviso: ${aviso.titulo}`} />
        </div>
      )}

      {/* Footer — author */}
      {aviso.creadorNombre && (
        <div className="bg-[var(--bg-surface)] border-t border-[var(--border)] px-4 py-2.5 flex items-center gap-2">
          <div className="size-5 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <svg className="size-2.5 text-amber-700 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Publicado por{' '}
            <span className="font-semibold text-[var(--text-secondary)]">
              {aviso.creadorNombre}
            </span>
          </p>
        </div>
      )}
    </article>
  );
}

/* ── Page ── */
export default function AvisosPage() {
  const [avisos,  setAvisos]  = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get<Aviso[]>('/avisos')
      .then(setAvisos)
      .catch(() => setError('No se pudieron cargar los avisos.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="size-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}>
          <svg className="size-4.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
            Avisos institucionales
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Comunicados oficiales del TESVG
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <AvisoSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
          <div className="text-3xl mb-3 select-none">⚠️</div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Error al cargar</p>
          <p className="text-xs text-[var(--text-muted)]">{error}</p>
        </div>
      ) : avisos.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center">
          <div className="size-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}>
            <svg className="size-7 text-amber-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            Sin avisos por el momento
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Los comunicados oficiales aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => <AvisoCard key={a.id} aviso={a} />)}
        </div>
      )}
    </div>
  );
}
