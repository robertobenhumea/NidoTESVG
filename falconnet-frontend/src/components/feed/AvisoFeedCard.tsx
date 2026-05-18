'use client';

import { useState } from 'react';
import { PostMedia } from '@/components/feed/PostMedia';
import { timeAgo } from '@/lib/utils';

export interface AvisoFeedItem {
  id:               number;
  titulo:           string;
  contenido:        string;
  carrera?:         string;
  imagenUrl?:       string;
  fecha:            string;
  creadorNombre?:   string;
}

interface Props {
  aviso: AvisoFeedItem;
}

export function AvisoFeedCard({ aviso }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = aviso.contenido.length > 220;

  return (
    <article
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{ border: '1.5px solid rgba(180, 130, 20, 0.22)' }}
      aria-label={`Aviso oficial: ${aviso.titulo}`}
    >
      {/* ── Institutional header ── */}
      <div
        className="px-4 pt-3.5 pb-3"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badge row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-[#1A1A2E] text-[9px] font-extrabold uppercase tracking-widest rounded-full px-2.5 py-0.5 leading-none shrink-0">
                <svg className="size-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
                Aviso oficial
              </span>
              {aviso.carrera && (
                <span className="text-[10px] font-medium text-amber-300/70 bg-amber-400/10 border border-amber-400/15 rounded-full px-2 py-0.5 shrink-0">
                  {aviso.carrera}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-[15px] font-bold text-white leading-snug break-words">
              {aviso.titulo}
            </h2>
          </div>

          <time
            dateTime={aviso.fecha}
            className="text-[11px] text-white/35 shrink-0 pt-0.5 tabular-nums"
          >
            {timeAgo(aviso.fecha)}
          </time>
        </div>
      </div>

      {/* ── Content ── */}
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

      {/* ── Image ── */}
      {aviso.imagenUrl && (
        <div className="border-t border-[var(--border)]">
          <PostMedia src={aviso.imagenUrl} alt={`Imagen del aviso: ${aviso.titulo}`} />
        </div>
      )}

      {/* ── Author footer ── */}
      {aviso.creadorNombre && (
        <div className="bg-[var(--bg-surface)] border-t border-[var(--border)] px-4 py-2.5 flex items-center gap-2">
          <div className="size-5 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
            <svg className="size-2.5 text-amber-700 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
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
