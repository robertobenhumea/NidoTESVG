'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { SolicitarModal } from '@/components/reclutamiento/SolicitarModal';
import { equipoService } from '@/services/equipo.service';
import { useAuth } from '@/hooks/useAuth';
import { resolveUrl, timeAgo } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import type { TipoReclutamiento, EstadoSolicitud } from '@/types';
import type { EquipoDetalle, SolicitudDetalle } from '@/services/equipo.service';

/* ── Config ── */
const TIPO_CONFIG: Record<TipoReclutamiento, { label: string; color: string; bg: string }> = {
  PROYECTO:      { label: 'Proyecto',      color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  HACKATHON:     { label: 'Hackathon',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  INNOVATEC:     { label: 'Innovatec',     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  TORNEO:        { label: 'Torneo',        color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  },
  INVESTIGACION: { label: 'Investigación', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  STARTUP:       { label: 'Startup',       color: '#22c55e', bg: 'rgba(34,197,94,0.10)'  },
  OTRO:          { label: 'Otro',          color: '#94a3b8', bg: 'rgba(148,163,184,0.10)'},
};

const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA:  'Aceptada',
  RECHAZADA: 'Rechazada',
};
const ESTADO_SOLICITUD_STYLE: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
  ACEPTADA:  'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  RECHAZADA: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
};

/* ── Back icon ── */
function IcBack() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── GitHub icon ── */
function IcGitHub() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

/* ── Solicitud row (creator view) ── */
function SolicitudRow({
  s,
  onResponder,
}: {
  s: SolicitudDetalle;
  onResponder: (id: number, estado: 'ACEPTADA' | 'RECHAZADA') => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handle(estado: 'ACEPTADA' | 'RECHAZADA') {
    setLoading(true);
    await onResponder(s.id, estado);
    setLoading(false);
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
      <Avatar src={s.avatarUrl} name={s.nombre} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{s.nombre}</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ESTADO_SOLICITUD_STYLE[s.estado]}`}>
            {ESTADO_SOLICITUD_LABEL[s.estado]}
          </span>
        </div>
        {s.carrera && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {s.carrera}{s.semestre ? ` · Sem. ${s.semestre}` : ''}
          </p>
        )}
        {s.mensaje && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-3">{s.mensaje}</p>
        )}
        {s.githubUrl && (
          <a
            href={s.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline mt-1"
          >
            <IcGitHub /> GitHub
          </a>
        )}
        {s.estado === 'PENDIENTE' && (
          <div className="flex gap-2 mt-2">
            <button
              disabled={loading}
              onClick={() => handle('ACEPTADA')}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
            >
              Aceptar
            </button>
            <button
              disabled={loading}
              onClick={() => handle('RECHAZADA')}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-60 transition-colors"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function Skeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6 max-w-2xl mx-auto w-full px-4 py-8">
      <div className="h-5 w-16 rounded bg-[var(--bg-elevated)]" />
      <div className="h-[200px] rounded-2xl bg-[var(--bg-elevated)]" />
      <div className="space-y-3">
        <div className="h-5 w-16 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-7 w-2/3 rounded bg-[var(--bg-elevated)]" />
        <div className="h-4 w-full rounded bg-[var(--bg-elevated)]" />
        <div className="h-4 w-3/4 rounded bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}

/* ── Page ── */
export default function EquipoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router   = useRouter();

  const [equipo, setEquipo]         = useState<EquipoDetalle | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [solicitudState, setSolicitudState] = useState<EstadoSolicitud | null>(null);
  const [closing, setClosing]       = useState(false);

  const numericId = parseInt(id, 10);
  const isOwner   = equipo && user && equipo.usuarioId === user.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await equipoService.getById(numericId);
      setEquipo(data);
      setSolicitudState(data.miSolicitud ?? null);
      if (data.usuarioId === user?.id) {
        const solis = await equipoService.getSolicitudes(numericId);
        setSolicitudes(solis);
      }
    } catch {
      router.replace(ROUTES.EQUIPOS);
    } finally {
      setLoading(false);
    }
  }, [numericId, user, router]);

  useEffect(() => { load(); }, [load]);

  async function handleResponder(solicitudId: number, estado: 'ACEPTADA' | 'RECHAZADA') {
    await equipoService.responder(numericId, solicitudId, estado);
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === solicitudId ? { ...s, estado } : s))
    );
  }

  async function handleCancelar() {
    if (!confirm('¿Cancelar tu solicitud?')) return;
    await equipoService.cancelar(numericId);
    setSolicitudState(null);
  }

  async function handleCerrar(estado: 'COMPLETO' | 'CERRADO') {
    if (!confirm(`¿Marcar como ${estado === 'COMPLETO' ? 'Completo' : 'Cerrado'}?`)) return;
    setClosing(true);
    await equipoService.cerrar(numericId, estado);
    await load();
    setClosing(false);
  }

  if (loading) return <Skeleton />;
  if (!equipo)  return null;

  const cfg      = TIPO_CONFIG[equipo.tipo] ?? TIPO_CONFIG.OTRO;
  const isClosed = equipo.estado !== 'ABIERTO';
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');

  return (
    <>
      <div className="flex flex-col min-h-0 w-full max-w-2xl mx-auto px-4 pb-12 pt-4">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 -ml-1 self-start"
        >
          <IcBack /> Volver
        </button>

        {/* Cover */}
        {equipo.imagenUrl ? (
          <div className="rounded-2xl overflow-hidden aspect-video bg-[var(--bg-elevated)] mb-6 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveUrl(equipo.imagenUrl)}
              alt={equipo.nombreProyecto}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="rounded-2xl h-28 mb-6 flex items-end p-4"
            style={{ background: `linear-gradient(135deg, ${cfg.color}33 0%, ${cfg.color}11 100%)`, border: `1px solid ${cfg.color}33` }}
          />
        )}

        {/* Type + status */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {cfg.label}
          </span>
          {isClosed ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              {equipo.estado === 'COMPLETO' ? 'Completo' : 'Cerrado'}
            </span>
          ) : (
            equipo.integrantesFaltantes > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                {equipo.integrantesFaltantes} lugar{equipo.integrantesFaltantes !== 1 ? 'es disponibles' : ' disponible'}
              </span>
            )
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-snug">
          {equipo.nombreEquipo ? (
            <>{equipo.nombreEquipo} <span className="text-[var(--text-muted)] font-medium text-lg">— {equipo.nombreProyecto}</span></>
          ) : equipo.nombreProyecto}
        </h1>

        {/* Creator */}
        <div className="flex items-center gap-2 mt-3">
          <Avatar src={equipo.creadorAvatarUrl} name={equipo.creadorNombre ?? '?'} size="sm" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{equipo.creadorNombre ?? 'Anónimo'}</p>
            <p className="text-xs text-[var(--text-muted)]">Publicado {timeAgo(equipo.fecha)}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)] my-5" />

        {/* Description */}
        {equipo.descripcion && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Descripción</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{equipo.descripcion}</p>
          </section>
        )}

        {/* Objective */}
        {equipo.objetivo && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Objetivo</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{equipo.objetivo}</p>
          </section>
        )}

        {/* Skills */}
        {equipo.habilidades?.length > 0 && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Habilidades buscadas</h2>
            <div className="flex flex-wrap gap-2">
              {equipo.habilidades.map((h) => (
                <span
                  key={h}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                >
                  {h}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Deadline */}
        {equipo.fechaLimite && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Fecha límite</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {new Date(equipo.fechaLimite).toLocaleDateString('es-MX', { dateStyle: 'long' })}
            </p>
          </section>
        )}

        {/* ── CTA (non-owner) ── */}
        {!isOwner && !isClosed && (
          <div className="mt-2 mb-6">
            {solicitudState === 'PENDIENTE' ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <span className="text-sm text-amber-700 dark:text-amber-300 font-medium flex-1">
                  Tu solicitud está pendiente de revisión.
                </span>
                <button
                  onClick={handleCancelar}
                  className="text-xs text-amber-600 dark:text-amber-400 underline hover:no-underline"
                >
                  Cancelar
                </button>
              </div>
            ) : solicitudState === 'ACEPTADA' ? (
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Tu solicitud fue aceptada. ¡Bienvenido al equipo!
              </div>
            ) : solicitudState === 'RECHAZADA' ? (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-muted)]">
                Tu solicitud fue rechazada.
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-hover)] active:scale-[0.98] transition-all"
              >
                Solicitar unirme
              </button>
            )}
          </div>
        )}

        {/* ── Owner panel ── */}
        {isOwner && (
          <div className="mt-4 border-t border-[var(--border)] pt-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Solicitudes
                {pendientes.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center size-5 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold">
                    {pendientes.length}
                  </span>
                )}
              </h2>
              {!isClosed && (
                <div className="flex gap-2">
                  <button
                    disabled={closing}
                    onClick={() => handleCerrar('COMPLETO')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-60 transition-colors"
                  >
                    Marcar completo
                  </button>
                  <button
                    disabled={closing}
                    onClick={() => handleCerrar('CERRADO')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-60 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {solicitudes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                Aún no hay solicitudes.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {solicitudes.map((s) => (
                  <SolicitudRow key={s.id} s={s} onResponder={handleResponder} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Solicitar modal */}
      {showModal && user && (
        <SolicitarModal
          reclutamientoId={numericId}
          proyectoNombre={equipo.nombreProyecto}
          tipoGradient={`linear-gradient(135deg, ${cfg.color}55 0%, ${cfg.color}22 100%)`}
          tipoLabel={cfg.label}
          initialCarrera={user.carrera}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setSolicitudState('PENDIENTE');
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
