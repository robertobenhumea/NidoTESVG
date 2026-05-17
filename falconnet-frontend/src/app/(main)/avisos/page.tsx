'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { timeAgo } from '@/lib/utils';

interface Aviso {
  id: number;
  titulo: string;
  contenido: string;
  carrera?: string;
  fecha: string;
  creadorNombre?: string;
}

function AvisoCard({ aviso }: { aviso: Aviso }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = aviso.contenido.length > 180;

  return (
    <article className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-2.5 py-0.5">
              <svg className="size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
              Aviso
            </span>
            {aviso.carrera && (
              <span className="text-xs font-medium text-[var(--brand)] bg-[var(--brand-muted)] rounded-full px-2.5 py-0.5">
                {aviso.carrera}
              </span>
            )}
          </div>
          <time className="text-xs text-[var(--text-muted)] shrink-0">{timeAgo(aviso.fecha)}</time>
        </div>

        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1.5 leading-snug">{aviso.titulo}</h2>

        <p className={`text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {aviso.contenido}
        </p>

        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[var(--brand)] font-medium mt-1 hover:underline"
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        {aviso.creadorNombre && (
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Publicado por <span className="font-medium">{aviso.creadorNombre}</span>
          </p>
        )}
      </div>
    </article>
  );
}

export default function AvisosPage() {
  const [avisos, setAvisos]   = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get<Aviso[]>('/avisos')
      .then(setAvisos)
      .catch(() => setError('No se pudieron cargar los avisos.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-5">Avisos institucionales</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 animate-pulse">
              <div className="h-3 w-24 rounded-full bg-[var(--bg-elevated)] mb-3" />
              <div className="h-4 w-3/4 rounded-full bg-[var(--bg-elevated)] mb-2" />
              <div className="h-3 w-full rounded-full bg-[var(--bg-elevated)] mb-1" />
              <div className="h-3 w-5/6 rounded-full bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      ) : avisos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 select-none">📋</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Sin avisos por el momento</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Los avisos institucionales aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => <AvisoCard key={a.id} aviso={a} />)}
        </div>
      )}
    </div>
  );
}
