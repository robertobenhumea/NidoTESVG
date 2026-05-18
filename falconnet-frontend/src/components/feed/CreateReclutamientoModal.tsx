'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { STORAGE_KEYS, resolveUrl } from '@/lib/utils';
import { ImageCropModal } from '@/components/feed/ImageCropModal';
import type { ReclutamientoFeedItem, TipoReclutamiento } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const TIPOS: { value: TipoReclutamiento; label: string; icon: string }[] = [
  { value: 'PROYECTO',      label: 'Proyecto',      icon: '🛠️' },
  { value: 'HACKATHON',     label: 'Hackathon',     icon: '⚡' },
  { value: 'INNOVATEC',     label: 'Innovatec',     icon: '🏆' },
  { value: 'TORNEO',        label: 'Torneo',        icon: '🎯' },
  { value: 'INVESTIGACION', label: 'Investigación', icon: '🔬' },
  { value: 'STARTUP',       label: 'Startup',       icon: '🚀' },
  { value: 'OTRO',          label: 'Otro',          icon: '📋' },
];

const HABILIDADES_PRESET = [
  'Programador', 'Diseñador UX', 'Frontend', 'Backend', 'Mobile',
  'Electrónica', 'Mecatrónica', 'Sistemas', 'IA / ML', 'Data Science',
  'Redes', 'Marketing', 'Administración', 'Contabilidad', 'Comunicación',
];

async function uploadImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const form = new FormData();
  form.append('archivo', file);
  const res = await fetch(`${API_BASE}/imagenes/subir`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('No se pudo subir la imagen');
  const data = await res.json() as { url: string };
  const base = API_BASE.replace(/\/$/, '');
  return data.url.startsWith('http') ? data.url : `${base}${data.url.startsWith('/') ? data.url : `/${data.url}`}`;
}

interface Props {
  onClose:      () => void;
  onPublished?: (item: ReclutamientoFeedItem) => void;
}

export function CreateReclutamientoModal({ onClose, onPublished }: Props) {
  const [nombreProyecto,      setNombreProyecto]      = useState('');
  const [nombreEquipo,        setNombreEquipo]        = useState('');
  const [tipo,                setTipo]                = useState<TipoReclutamiento>('PROYECTO');
  const [descripcion,         setDescripcion]         = useState('');
  const [objetivo,            setObjetivo]            = useState('');
  const [habilidades,         setHabilidades]         = useState<string[]>([]);
  const [habInput,            setHabInput]            = useState('');
  const [integrantesFaltantes, setIntegrantesFaltantes] = useState(1);
  const [fechaLimite,         setFechaLimite]         = useState('');
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState('');
  const [success,             setSuccess]             = useState(false);

  // Image
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropSrc,      setCropSrc]      = useState<string | null>(null);
  const [cropFile,     setCropFile]     = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !cropSrc) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose, cropSrc]);

  /* ── Habilidades tag input ── */
  function addHab(val: string) {
    const trimmed = val.trim();
    if (!trimmed || habilidades.includes(trimmed) || habilidades.length >= 12) return;
    setHabilidades((prev) => [...prev, trimmed]);
  }

  function removeHab(hab: string) {
    setHabilidades((prev) => prev.filter((h) => h !== hab));
  }

  function onHabKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && habInput.trim()) {
      e.preventDefault();
      addHab(habInput);
      setHabInput('');
    }
    if (e.key === 'Backspace' && !habInput && habilidades.length > 0) {
      setHabilidades((prev) => prev.slice(0, -1));
    }
  }

  /* ── Image ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (f.size > 10 * 1024 * 1024)   { setError('La imagen no puede pesar más de 10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => { setCropSrc(ev.target?.result as string); setCropFile(f); };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  function handleCropConfirm(cropped: File) {
    setImageFile(cropped);
    setImagePreview(URL.createObjectURL(cropped));
    setCropSrc(null); setCropFile(null);
  }

  /* ── Submit ── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombreProyecto.trim()) { setError('El nombre del proyecto es requerido'); return; }
    setError(''); setLoading(true);
    try {
      let uploadedUrl: string | undefined;
      if (imageFile) uploadedUrl = await uploadImage(imageFile);

      type BReclutamiento = {
        id: number; usuarioId: number; nombreEquipo?: string; nombreProyecto: string;
        descripcion?: string; objetivo?: string; tipo: TipoReclutamiento;
        habilidades: string[]; integrantesFaltantes: number; fechaLimite?: string;
        imagenUrl?: string; estado: 'ABIERTO' | 'COMPLETO' | 'CERRADO';
        fecha: string; creadorNombre?: string; creadorAvatarUrl?: string;
      };

      const created = await api.post<BReclutamiento>('/reclutamiento', {
        nombreProyecto:       nombreProyecto.trim(),
        nombreEquipo:         nombreEquipo.trim() || undefined,
        tipo,
        descripcion:          descripcion.trim() || undefined,
        objetivo:             objetivo.trim() || undefined,
        habilidades:          habilidades.join(','),
        integrantesFaltantes,
        fechaLimite:          fechaLimite || undefined,
        imagenUrl:            uploadedUrl,
      });

      const feedItem: ReclutamientoFeedItem = {
        id:                   created.id,
        usuarioId:            created.usuarioId,
        nombreEquipo:         created.nombreEquipo,
        nombreProyecto:       created.nombreProyecto,
        descripcion:          created.descripcion,
        objetivo:             created.objetivo,
        tipo:                 created.tipo,
        habilidades:          Array.isArray(created.habilidades) ? created.habilidades : habilidades,
        integrantesFaltantes: created.integrantesFaltantes,
        fechaLimite:          created.fechaLimite,
        imagenUrl:            uploadedUrl ?? resolveUrl(created.imagenUrl),
        estado:               created.estado ?? 'ABIERTO',
        fecha:                created.fecha ?? new Date().toISOString(),
        creadorNombre:        created.creadorNombre,
        creadorAvatarUrl:     created.creadorAvatarUrl,
      };

      setSuccess(true);
      onPublished?.(feedItem);
      setTimeout(onClose, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al publicar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && nombreProyecto.trim().length > 0;
  const selectedTipo = TIPOS.find((t) => t.value === tipo)!;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div
          className="relative w-full sm:max-w-lg bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '96dvh' }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal
          aria-label="Reclutar equipo"
        >
          {/* Mobile handle */}
          <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
          </div>

          {/* ── Header ── */}
          <div className="px-4 pt-3.5 pb-4 shrink-0"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[var(--brand)]/20 border border-[var(--brand)]/30 flex items-center justify-center shrink-0">
                  <svg className="size-5 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)]/70 leading-none mb-0.5">
                    Convocatoria
                  </p>
                  <h2 className="text-sm font-bold text-white leading-tight">
                    Reclutar equipo
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="size-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tipo selector — horizontal pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                    tipo === t.value
                      ? 'bg-[var(--brand)] text-white shadow-sm'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="size-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                    <svg className="size-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">¡Convocatoria publicada!</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Tu equipo está visible en el feed de FalconNet.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Nombre del proyecto */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Nombre del proyecto / evento <span className="text-red-400 normal-case font-normal">requerido</span>
                    </label>
                    <input
                      type="text"
                      value={nombreProyecto}
                      onChange={(e) => setNombreProyecto(e.target.value)}
                      placeholder={`Ej. ${selectedTipo.icon} App de transporte TESVG`}
                      maxLength={220}
                      autoFocus
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors"
                    />
                  </div>

                  {/* Nombre del equipo */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Nombre del equipo <span className="normal-case font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={nombreEquipo}
                      onChange={(e) => setNombreEquipo(e.target.value)}
                      placeholder="Ej. Team Falcon"
                      maxLength={120}
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Descripción <span className="normal-case font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Describe brevemente tu proyecto o evento…"
                      rows={3}
                      maxLength={1200}
                      className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Habilidades buscadas */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Perfiles / habilidades buscadas
                    </label>

                    {/* Tag cloud input */}
                    <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-2 flex flex-wrap gap-1.5 focus-within:border-[var(--brand)] transition-colors min-h-[44px]">
                      {habilidades.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1 bg-[var(--brand)]/15 text-[var(--brand)] text-[11px] font-semibold rounded-full px-2.5 py-0.5"
                        >
                          {h}
                          <button
                            type="button"
                            onClick={() => removeHab(h)}
                            aria-label={`Quitar ${h}`}
                            className="text-[var(--brand)]/70 hover:text-[var(--brand)] ml-0.5"
                          >
                            <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </span>
                      ))}
                      {habilidades.length < 12 && (
                        <input
                          type="text"
                          value={habInput}
                          onChange={(e) => setHabInput(e.target.value)}
                          onKeyDown={onHabKeyDown}
                          onBlur={() => { if (habInput.trim()) { addHab(habInput); setHabInput(''); } }}
                          placeholder={habilidades.length === 0 ? 'Escribe y presiona Enter o coma…' : ''}
                          className="flex-1 min-w-[120px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none"
                        />
                      )}
                    </div>

                    {/* Preset shortcuts */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {HABILIDADES_PRESET
                        .filter((h) => !habilidades.includes(h))
                        .slice(0, 10)
                        .map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => addHab(h)}
                          disabled={habilidades.length >= 12}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)] disabled:opacity-30 transition-colors"
                        >
                          + {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Integrantes faltantes + fecha límite */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                        Integrantes buscados
                      </label>
                      <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setIntegrantesFaltantes((v) => Math.max(1, v - 1))}
                          className="size-6 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                        >
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <span className="flex-1 text-center text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {integrantesFaltantes}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIntegrantesFaltantes((v) => Math.min(20, v + 1))}
                          className="size-6 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                        >
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                        Fecha límite <span className="normal-case font-normal">(opcional)</span>
                      </label>
                      <input
                        type="date"
                        value={fechaLimite}
                        onChange={(e) => setFechaLimite(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-sm px-3 py-2.5 focus:outline-none focus:border-[var(--brand)] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Banner image */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Banner / imagen <span className="normal-case font-normal">(opcional)</span>
                    </label>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Vista previa" className="w-full max-h-44 object-cover block" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          aria-label="Quitar imagen"
                          className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--brand)]/40 bg-[var(--bg-elevated)] hover:bg-[var(--brand)]/5 px-4 py-3 transition-colors group disabled:opacity-40"
                      >
                        <div className="size-9 rounded-lg bg-[var(--bg-surface)] group-hover:bg-[var(--brand)]/10 flex items-center justify-center shrink-0 transition-colors">
                          <svg className="size-4.5 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                            Adjuntar banner
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">JPG, PNG, WebP · máx. 10 MB</p>
                        </div>
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3 py-2.5">
                      <svg className="size-3.5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!success && (
              <div
                className="border-t border-[var(--border)] px-4 py-3 shrink-0 flex gap-2 bg-[var(--bg-surface)]"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
              >
                <Button type="button" variant="ghost" onClick={onClose} disabled={loading} fullWidth>
                  Cancelar
                </Button>
                <Button type="submit" loading={loading} disabled={!canSubmit} fullWidth>
                  {loading ? 'Publicando…' : 'Publicar convocatoria'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>

      {cropSrc && cropFile && (
        <ImageCropModal
          src={cropSrc}
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); setCropFile(null); }}
        />
      )}
    </>
  );
}
