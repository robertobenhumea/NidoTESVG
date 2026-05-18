'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { resolveUrl, timeAgo } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import type { ReclutamientoFeedItem, TipoReclutamiento } from '@/types';

const TIPO_CONFIG: Record<TipoReclutamiento, { label: string; color: string; bg: string }> = {
  PROYECTO:      { label: 'Proyecto',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  HACKATHON:     { label: 'Hackathon',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  INNOVATEC:     { label: 'Innovatec',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  TORNEO:        { label: 'Torneo',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  INVESTIGACION: { label: 'Investigación', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  STARTUP:       { label: 'Startup',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  OTRO:          { label: 'Otro',          color: '#94a3b8', bg: 'rgba(148,163,184,0.12)'},
};

const SKILL_MAX = 4;

interface Props {
  item: ReclutamientoFeedItem;
}

export function EquipoCard({ item }: Props) {
  const cfg     = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.OTRO;
  const isClosed = item.estado !== 'ABIERTO';
  const skills  = item.habilidades ?? [];
  const extra   = skills.length - SKILL_MAX;

  return (
    <Link
      href={`${ROUTES.EQUIPOS}/${item.id}`}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--brand)]/40 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      {/* Header band */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ background: cfg.color, opacity: isClosed ? 0.35 : 1 }}
      />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Type badge + status */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {cfg.label}
          </span>
          {isClosed && (
            <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
              {item.estado === 'COMPLETO' ? 'Completo' : 'Cerrado'}
            </span>
          )}
          {!isClosed && item.integrantesFaltantes > 0 && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {item.integrantesFaltantes} lugar{item.integrantesFaltantes !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Cover image */}
        {item.imagenUrl && (
          <div className="rounded-xl overflow-hidden aspect-video bg-[var(--bg-elevated)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(item.imagenUrl)}
              alt={item.nombreProyecto}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--brand)] transition-colors">
            {item.nombreEquipo ? `${item.nombreEquipo} — ` : ''}{item.nombreProyecto}
          </h3>
          {item.descripcion && (
            <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {item.descripcion}
            </p>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, SKILL_MAX).map((s) => (
              <span
                key={s}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              >
                {s}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                +{extra}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              src={item.creadorAvatarUrl}
              name={item.creadorNombre ?? '?'}
              size="xs"
            />
            <span className="text-[11px] text-[var(--text-muted)] truncate">
              {item.creadorNombre ?? 'Anónimo'}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] shrink-0 ml-2">
            {timeAgo(item.fecha)}
          </span>
        </div>
      </div>
    </Link>
  );
}
