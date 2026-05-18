'use client';

import { useState } from 'react';
import { PostMedia } from '@/components/feed/PostMedia';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { timeAgo, resolveUrl, truncate } from '@/lib/utils';
import type { ReclutamientoFeedItem, TipoReclutamiento, EstadoSolicitud } from '@/types';

/* ─────────────────────────────────────────────
   Config per tipo
───────────────────────────────────────────── */
const TIPO_CONFIG: Record<TipoReclutamiento, { label: string; gradient: string; accent: string }> = {
  PROYECTO:      { label: 'Proyecto',      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', accent: '#3b82f6' },
  HACKATHON:     { label: 'Hackathon',     gradient: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)', accent: '#8b5cf6' },
  INNOVATEC:     { label: 'Innovatec',     gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', accent: '#f59e0b' },
  TORNEO:        { label: 'Torneo',        gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', accent: '#ef4444' },
  INVESTIGACION: { label: 'Investigación', gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)', accent: '#10b981' },
  STARTUP:       { label: 'Startup',       gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', accent: '#22c55e' },
  OTRO:          { label: 'Convocatoria',  gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)', accent: '#94a3b8' },
};

/* ─────────────────────────────────────────────
   Solicitar modal (inline, lightweight)
───────────────────────────────────────────── */
function SolicitarModal({
  proyectoNombre,
  onConfirm,
  onClose,
  loading,
}: {
  proyectoNombre: string;
  onConfirm: (mensaje: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [mensaje, setMensaje] = useState('');

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        className="relative w-full sm:max-w-sm bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto" />
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Solicitar unirme a "{proyectoNombre}"
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            El creador verá tu perfil y este mensaje (opcional).
          </p>
        </div>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="¿Por qué quieres unirte? ¿Qué puedes aportar?…"
          rows={3}
          maxLength={400}
          className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors leading-relaxed"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(mensaje)}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round"/></svg>
              : null}
            {loading ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main card
───────────────────────────────────────────── */
interface Props {
  item:          ReclutamientoFeedItem;
  currentUserId?: number;
}

export function ReclutamientoFeedCard({ item, currentUserId }: Props) {
  const [expanded,        setExpanded]        = useState(false);
  const [solicitudState,  setSolicitudState]   = useState<EstadoSolicitud | undefined>(item.miSolicitud);
  const [showModal,       setShowModal]        = useState(false);
  const [soliciting,      setSoliciting]       = useState(false);
  const [solError,        setSolError]         = useState('');

  const config     = TIPO_CONFIG[item.tipo] ?? TIPO_CONFIG.OTRO;
  const isOwn      = item.usuarioId === currentUserId;
  const isClosed   = item.estado !== 'ABIERTO';
  const isLong     = (item.descripcion?.length ?? 0) > 220;
  const avatarSrc  = resolveUrl(item.creadorAvatarUrl);

  async function handleSolicitar(mensaje: string) {
    setSoliciting(true);
    setSolError('');
    try {
      await api.post(`/reclutamiento/${item.id}/solicitar`, { mensaje: mensaje.trim() || undefined });
      setSolicitudState('PENDIENTE');
      setShowModal(false);
    } catch {
      setSolError('No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSoliciting(false);
    }
  }

  function renderCTA() {
    if (isOwn) {
      return (
        <span className="text-xs font-medium text-[var(--text-muted)] px-2">
          Tu publicación
        </span>
      );
    }
    if (isClosed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-muted)]">
          Cerrado
        </span>
      );
    }
    if (solicitudState === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-secondary)]">
          <svg className="size-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Solicitud enviada
        </span>
      );
    }
    if (solicitudState === 'ACEPTADA') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 dark:bg-green-950/40 text-xs font-semibold text-green-700 dark:text-green-400">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Aceptado
        </span>
      );
    }
    if (solicitudState === 'RECHAZADA') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/40 text-xs font-semibold text-red-600 dark:text-red-400">
          Rechazado
        </span>
      );
    }
    return (
      <button
        onClick={() => { setSolError(''); setShowModal(true); }}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 hover:opacity-90"
        style={{ background: config.gradient }}
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        Solicitar unirme
      </button>
    );
  }

  return (
    <>
      <article
        className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
        style={{ border: `1px solid ${config.accent}28` }}
        aria-label={`Reclutamiento: ${item.nombreProyecto}`}
      >
        {/* ── Gradient header ── */}
        <div className="px-4 pt-3.5 pb-3.5 relative" style={{ background: config.gradient }}>
          {/* Top row: badge + estado */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-white/90 text-[10px] font-extrabold uppercase tracking-widest rounded-full px-2.5 py-0.5 leading-none"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }}
            >
              <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {config.label}
            </span>

            {item.estado === 'ABIERTO' ? (
              <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-0.5 leading-none animate-pulse">
                <span className="size-1.5 rounded-full bg-green-400 inline-block" />
                Reclutando
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-white/15 text-white/70 text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-0.5 leading-none">
                {item.estado === 'COMPLETO' ? 'Completo' : 'Cerrado'}
              </span>
            )}
          </div>

          {/* Project name */}
          <h2 className="text-[17px] font-black text-white leading-tight mb-0.5 drop-shadow-sm">
            {item.nombreProyecto}
          </h2>

          {/* Team name if different */}
          {item.nombreEquipo && (
            <p className="text-[12px] text-white/70 font-medium">
              Equipo: {item.nombreEquipo}
            </p>
          )}

          {/* Integrantes faltantes */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="flex -space-x-1.5">
              {Array.from({ length: Math.min(item.integrantesFaltantes, 4) }).map((_, i) => (
                <div
                  key={i}
                  className="size-6 rounded-full border-2 border-white/30 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <svg className="size-3 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12z"/>
                  </svg>
                </div>
              ))}
            </div>
            <span className="text-[12px] text-white/80 font-semibold">
              {item.integrantesFaltantes === 1
                ? 'Buscando 1 integrante'
                : `Buscando ${item.integrantesFaltantes} integrantes`}
            </span>
          </div>
        </div>

        {/* ── Banner image ── */}
        {item.imagenUrl && (
          <PostMedia src={item.imagenUrl} alt={`Imagen de ${item.nombreProyecto}`} />
        )}

        {/* ── Body ── */}
        <div className="bg-[var(--bg-surface)] px-4 py-3.5 space-y-3">
          {/* Description */}
          {item.descripcion && (
            <div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">
                {!expanded && isLong ? truncate(item.descripcion, 220) : item.descripcion}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-[var(--brand)] font-medium mt-1 hover:underline"
                >
                  {expanded ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          )}

          {/* Habilidades tags */}
          {item.habilidades.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.habilidades.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
                  style={{
                    background: `${config.accent}12`,
                    borderColor: `${config.accent}30`,
                    color: config.accent,
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
            {item.fechaLimite && (
              <span className="flex items-center gap-1">
                <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Hasta {new Date(item.fechaLimite + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeAgo(item.fecha)}
            </span>
          </div>

          {solError && (
            <p className="text-xs text-red-500">{solError}</p>
          )}
        </div>

        {/* ── Footer: creator + CTA ── */}
        <div className="bg-[var(--bg-surface)] border-t border-[var(--border)] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              src={avatarSrc}
              name={item.creadorNombre ?? '?'}
              size="xs"
            />
            <p className="text-xs text-[var(--text-muted)] truncate">
              <span className="font-semibold text-[var(--text-secondary)]">
                {item.creadorNombre}
              </span>
            </p>
          </div>

          {renderCTA()}
        </div>
      </article>

      {showModal && (
        <SolicitarModal
          proyectoNombre={item.nombreProyecto}
          onConfirm={handleSolicitar}
          onClose={() => setShowModal(false)}
          loading={soliciting}
        />
      )}
    </>
  );
}
