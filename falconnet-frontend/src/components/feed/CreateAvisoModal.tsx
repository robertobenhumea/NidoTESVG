'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { ImageCropModal } from '@/components/feed/ImageCropModal';
import { STORAGE_KEYS } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface Props {
  onClose:      () => void;
  onPublished?: () => void;
}

async function uploadImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const form = new FormData();
  form.append('archivo', file);
  const res = await fetch(`${API_BASE}/imagenes/subir`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });
  if (!res.ok) throw new Error('No se pudo subir la imagen');
  const data = await res.json() as { url: string };
  const base = API_BASE.replace(/\/$/, '');
  return data.url.startsWith('http') ? data.url : `${base}${data.url.startsWith('/') ? data.url : `/${data.url}`}`;
}

export function CreateAvisoModal({ onClose, onPublished }: Props) {
  const [titulo,    setTitulo]    = useState('');
  const [contenido, setContenido] = useState('');
  const [carrera,   setCarrera]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  // Image state — same crop flow as CreatePostCard
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropSrc,      setCropSrc]      = useState<string | null>(null);
  const [cropFile,     setCropFile]     = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ESC + scroll lock (skip when crop modal is open)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !cropSrc) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose, cropSrc]);

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
    setCropSrc(null);
    setCropFile(null);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim())    { setError('El título es requerido');    return; }
    if (!contenido.trim()) { setError('El contenido es requerido'); return; }
    setError('');
    setLoading(true);
    try {
      let imagenUrl: string | undefined;
      if (imageFile) imagenUrl = await uploadImage(imageFile);
      await api.post('/avisos', {
        titulo:    titulo.trim(),
        contenido: contenido.trim(),
        carrera:   carrera.trim() || undefined,
        imagenUrl,
      });
      setSuccess(true);
      onPublished?.();
      setTimeout(onClose, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al publicar el aviso');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && titulo.trim().length > 0 && contenido.trim().length > 0;

  return (
    <>
      {/* ── Backdrop + sheet ── */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div
          className="relative w-full sm:max-w-lg bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '95dvh' }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal
          aria-label="Publicar aviso oficial"
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
          </div>

          {/* ── Institutional header ── */}
          <div
            className="px-4 pt-3.5 pb-4 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="size-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
                  <svg className="size-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 leading-none mb-0.5">
                    Comunicación oficial
                  </p>
                  <h2 className="text-sm font-bold text-white leading-tight">
                    Nuevo aviso institucional
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

            {/* Badge row */}
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 bg-amber-400 text-[#1A1A2E] text-[10px] font-extrabold uppercase tracking-widest rounded-full px-2.5 py-1 leading-none">
                <svg className="size-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                Aviso oficial
              </span>
              <span className="text-[11px] text-white/35">
                Visible para toda la comunidad
              </span>
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {success ? (
                /* Success state */
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="size-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                    <svg className="size-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Aviso publicado</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Ya es visible para la comunidad de FalconNet
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Título */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Título <span className="text-red-400 normal-case font-normal">requerido</span>
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej. Suspensión de clases el viernes"
                      maxLength={150}
                      autoFocus
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] text-right mt-0.5 tabular-nums">{titulo.length}/150</p>
                  </div>

                  {/* Contenido */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Contenido <span className="text-red-400 normal-case font-normal">requerido</span>
                    </label>
                    <textarea
                      value={contenido}
                      onChange={(e) => setContenido(e.target.value)}
                      placeholder="Detalla el aviso para la comunidad…"
                      rows={4}
                      maxLength={2000}
                      className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-amber-400/50 transition-colors leading-relaxed"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] text-right mt-0.5 tabular-nums">{contenido.length}/2000</p>
                  </div>

                  {/* Image attachment */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Vista previa"
                        className="w-full max-h-56 object-cover block"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                      <button
                        type="button"
                        onClick={removeImage}
                        aria-label="Quitar imagen"
                        className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                      <span className="absolute bottom-2 left-3 text-[10px] font-semibold text-white/70 uppercase tracking-widest">
                        Imagen adjunta
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] hover:border-amber-400/40 bg-[var(--bg-elevated)] hover:bg-amber-400/5 px-4 py-3.5 transition-colors group disabled:opacity-40"
                    >
                      <div className="size-9 rounded-lg bg-[var(--bg-surface)] group-hover:bg-amber-400/10 flex items-center justify-center shrink-0 transition-colors">
                        <svg className="size-4.5 text-[var(--text-muted)] group-hover:text-amber-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                          Adjuntar imagen
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          JPG, PNG, WebP · máx. 10 MB
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Dirigido a (carrera) */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Dirigido a{' '}
                      <span className="normal-case font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={carrera}
                      onChange={(e) => setCarrera(e.target.value)}
                      placeholder="Ej. ISC, IMA — vacío = toda la comunidad"
                      maxLength={50}
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
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

            {/* Footer actions */}
            {!success && (
              <div
                className="border-t border-[var(--border)] px-4 py-3 shrink-0 flex gap-2 bg-[var(--bg-surface)]"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
              >
                <Button type="button" variant="ghost" onClick={onClose} disabled={loading} fullWidth>
                  Cancelar
                </Button>
                <Button type="submit" loading={loading} disabled={!canSubmit} fullWidth>
                  {loading ? 'Publicando…' : 'Publicar aviso'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Image crop modal — rendered outside the sheet so z-index is correct */}
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
