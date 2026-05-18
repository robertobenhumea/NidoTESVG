'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
}

export function CreateAvisoModal({ onClose }: Props) {
  const [titulo,    setTitulo]    = useState('');
  const [contenido, setContenido] = useState('');
  const [carrera,   setCarrera]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim())    { setError('El título es requerido');    return; }
    if (!contenido.trim()) { setError('El contenido es requerido'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/avisos', {
        titulo:    titulo.trim(),
        contenido: contenido.trim(),
        carrera:   carrera.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(onClose, 1600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al publicar el aviso');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && titulo.trim().length > 0 && contenido.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div
        className="relative w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Publicar aviso"
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
              <svg className="size-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Publicar aviso</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {success ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="size-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                  <svg className="size-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Aviso publicado</p>
                <p className="text-xs text-[var(--text-muted)]">Ya es visible para la comunidad</p>
              </div>
            ) : (
              <>
                {/* Título */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                    Título
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Suspensión de clases el viernes"
                    maxLength={150}
                    autoFocus
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] text-right mt-0.5 tabular-nums">{titulo.length}/150</p>
                </div>

                {/* Contenido */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                    Contenido
                  </label>
                  <textarea
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="Detalla el aviso para la comunidad…"
                    rows={4}
                    maxLength={2000}
                    className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--border-focus)] transition-colors leading-relaxed"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] text-right mt-0.5 tabular-nums">{contenido.length}/2000</p>
                </div>

                {/* Carrera destino */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                    Dirigido a <span className="normal-case font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    placeholder="Ej. ISC, IMA — vacío = toda la comunidad"
                    maxLength={50}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
              </>
            )}
          </div>

          {!success && (
            <div
              className="border-t border-[var(--border)] px-4 py-3 shrink-0 flex gap-2 bg-[var(--bg-surface)]"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading} fullWidth>
                Cancelar
              </Button>
              <Button type="submit" loading={loading} disabled={!canSubmit} fullWidth>
                Publicar aviso
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
