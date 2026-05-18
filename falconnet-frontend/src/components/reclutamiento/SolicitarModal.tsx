'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/services/api';
import type { EstadoSolicitud } from '@/types';

interface Props {
  reclutamientoId: number;
  proyectoNombre:  string;
  tipoGradient:    string;
  tipoLabel:       string;
  initialCarrera?: string;
  onSuccess:       (estado: EstadoSolicitud) => void;
  onClose:         () => void;
}

/* ─────────────────────────────────────────────────────────────
   Focus trap — cycles focus within `ref` container on Tab
───────────────────────────────────────────────────────────── */
function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;

    const focusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        )
      ).filter((e) => !e.hidden && e.offsetParent !== null);

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    el.addEventListener('keydown', handler);
    // Move focus inside
    const firstFocusable = focusable()[0];
    firstFocusable?.focus();
    return () => el.removeEventListener('keydown', handler);
  }, [active, ref]);
}

/* ─────────────────────────────────────────────────────────────
   Success checkmark (SVG animation via stroke-dashoffset)
───────────────────────────────────────────────────────────── */
function SuccessView({ proyectoNombre }: { proyectoNombre: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
      <div className="relative size-20">
        <div className="size-20 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
          <svg
            className="size-10 text-green-500"
            viewBox="0 0 52 52"
            fill="none"
            style={{ animation: 'checkmark 0.4s ease-out 0.1s both' }}
          >
            <style>{`
              @keyframes checkmark {
                0%   { stroke-dashoffset: 48; opacity: 0; }
                30%  { opacity: 1; }
                100% { stroke-dashoffset: 0; opacity: 1; }
              }
            `}</style>
            <polyline
              points="14 27 22 35 38 19"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="48"
              strokeDashoffset="48"
            />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-base font-bold text-[var(--text-primary)]">¡Solicitud enviada!</p>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs leading-relaxed">
          El creador de <span className="font-semibold text-[var(--text-secondary)]">{proyectoNombre}</span> revisará tu perfil y te notificará.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main modal
───────────────────────────────────────────────────────────── */
export function SolicitarModal({
  reclutamientoId,
  proyectoNombre,
  tipoGradient,
  tipoLabel,
  initialCarrera,
  onSuccess,
  onClose,
}: Props) {
  const [mounted,     setMounted]     = useState(false);
  const [visible,     setVisible]     = useState(false);   // drives CSS animation
  const [phase,       setPhase]       = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMsg,    setErrorMsg]    = useState('');

  const [mensaje,     setMensaje]     = useState('');
  const [carrera,     setCarrera]     = useState(initialCarrera ?? '');
  const [semestre,    setSemestre]    = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [githubUrl,   setGithubUrl]   = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, mounted && phase === 'form');

  /* Mount → next frame → set visible (triggers CSS transition) */
  useEffect(() => {
    setMounted(true);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Body scroll lock */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ESC key */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'loading' && phase !== 'success') animateClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const animateClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  async function handleSubmit() {
    setPhase('loading');
    setErrorMsg('');
    try {
      await api.post(`/reclutamiento/${reclutamientoId}/solicitar`, {
        mensaje:     mensaje.trim() || undefined,
        carrera:     carrera.trim() || undefined,
        semestre:    semestre.trim() || undefined,
        experiencia: experiencia.trim() || undefined,
        githubUrl:   githubUrl.trim() || undefined,
      });
      setPhase('success');
      onSuccess('PENDIENTE');
      setTimeout(animateClose, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.';
      setErrorMsg(msg);
      setPhase('error');
    }
  }

  if (!mounted) return null;

  const panel = (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(6px)' : 'none',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}
      role="presentation"
    >
      {/* Click-outside */}
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={() => phase !== 'loading' && phase !== 'success' && animateClose()}
      />

      {/* ── Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-label={`Solicitar unirme a ${proyectoNombre}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '92dvh',
          /* Mobile: slide from bottom */
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(100%) scale(0.98)',
          opacity: visible ? 1 : 0,
          /* Desktop: scale + fade override */
          ...(typeof window !== 'undefined' && window.innerWidth >= 640
            ? { transform: visible ? 'scale(1)' : 'scale(0.94)', opacity: visible ? 1 : 0 }
            : {}),
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease',
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* ── Gradient header ── */}
        <div
          className="px-5 pt-4 pb-4 shrink-0"
          style={{ background: tipoGradient }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 leading-none mb-1">
                Solicitud · {tipoLabel}
              </p>
              <h2 className="text-base font-black text-white leading-tight drop-shadow-sm line-clamp-2">
                {proyectoNombre}
              </h2>
            </div>
            {phase !== 'success' && (
              <button
                onClick={animateClose}
                disabled={phase === 'loading'}
                aria-label="Cerrar"
                className="size-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/15 transition-colors shrink-0 mt-0.5 disabled:opacity-30"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {phase === 'success' ? (
            <SuccessView proyectoNombre={proyectoNombre} />
          ) : (
            <div className="p-5 space-y-4">

              {/* Mensaje de presentación */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Mensaje de presentación
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="¿Por qué quieres unirte? ¿Qué puedes aportar al equipo?…"
                  rows={3}
                  maxLength={600}
                  disabled={phase === 'loading'}
                  className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors leading-relaxed disabled:opacity-50"
                />
                <p className="text-[10px] text-[var(--text-muted)] text-right mt-0.5">{mensaje.length}/600</p>
              </div>

              {/* Carrera + Semestre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Carrera
                  </label>
                  <input
                    type="text"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    placeholder="Ej. ISC, ME, IG…"
                    maxLength={80}
                    disabled={phase === 'loading'}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Semestre
                  </label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                    disabled={phase === 'loading'}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors disabled:opacity-50 appearance-none"
                  >
                    <option value="">—</option>
                    {[1,2,3,4,5,6,7,8,9].map((s) => (
                      <option key={s} value={String(s)}>{s}°</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Experiencia relevante */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Experiencia relevante <span className="normal-case font-normal">(opcional)</span>
                </label>
                <textarea
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  placeholder="Proyectos anteriores, habilidades técnicas, certificaciones…"
                  rows={2}
                  maxLength={400}
                  disabled={phase === 'loading'}
                  className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors leading-relaxed disabled:opacity-50"
                />
              </div>

              {/* GitHub / Portafolio */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  GitHub o portafolio <span className="normal-case font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/tu-usuario"
                    maxLength={300}
                    disabled={phase === 'loading'}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm pl-8 pr-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Error state */}
              {phase === 'error' && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3.5 py-3">
                  <svg className="size-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{errorMsg}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Fixed footer ── */}
        {phase !== 'success' && (
          <div
            className="border-t border-[var(--border)] bg-[var(--bg-surface)] px-5 py-3 shrink-0 flex gap-2.5"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={animateClose}
              disabled={phase === 'loading'}
              className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={phase === 'loading'}
              className="flex-[2] h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: tipoGradient }}
            >
              {phase === 'loading' ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round"/>
                  </svg>
                  Enviando…
                </>
              ) : (
                <>
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  Enviar solicitud
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
