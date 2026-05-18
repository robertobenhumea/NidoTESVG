'use client';

import { useState, useRef, useEffect } from 'react';
import { storyService } from '@/services/story.service';

const BG_PRESETS = [
  { label: 'Noche',   value: '#1A1A2E' },
  { label: 'Violeta', value: '#6366f1' },
  { label: 'Rosa',    value: '#ec4899' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Verde',   value: '#10b981' },
  { label: 'Azul',    value: '#0ea5e9' },
];

interface StoryCreatorProps {
  onClose:   () => void;
  onCreated: () => void;
}

export function StoryCreator({ onClose, onCreated }: StoryCreatorProps) {
  const [mode, setMode]               = useState<'text' | 'image'>('text');
  const [text, setText]               = useState('');
  const [color, setColor]             = useState(BG_PRESETS[0].value);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const fileRef                       = useRef<HTMLInputElement>(null);

  // Keyboard + scroll lock
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 10 * 1024 * 1024)   { setError('La imagen no puede superar 10 MB'); return; }
    setError('');
    setImageFile(file);
    setMode('image');
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setMode('text');
  }

  async function handlePublish() {
    if (mode === 'text' && !text.trim()) { setError('Escribe algo para tu historia'); return; }
    if (mode === 'image' && !imageFile)  { setError('Selecciona una imagen'); return; }
    setLoading(true);
    setError('');
    try {
      if (mode === 'text') {
        await storyService.create({ texto: text.trim(), colorFondo: color });
      } else {
        const imagenUrl = await storyService.uploadImage(imageFile!);
        await storyService.create({
          imagenUrl,
          texto:      text.trim() || undefined,
          colorFondo: color,
        });
      }
      onCreated();
    } catch {
      setError('Error al publicar. Intenta de nuevo.');
      setLoading(false);
    }
  }

  const canPublish = !loading && (mode === 'text' ? text.trim().length > 0 : !!imageFile);

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div
        className="relative w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '94dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
            Crear historia
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Mode picker */}
          <div className="flex gap-2 px-4 pt-4 pb-3">
            <button
              onClick={() => setMode('text')}
              className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-colors ${
                mode === 'text'
                  ? 'bg-[var(--brand)] text-white shadow-sm'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="mr-1.5">✏️</span> Texto
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-colors ${
                mode === 'image'
                  ? 'bg-[var(--brand)] text-white shadow-sm'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="mr-1.5">🖼️</span> Imagen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview card */}
          <div className="px-4 pb-3">
            <div
              className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ height: 248, backgroundColor: imagePreview ? '#000' : color }}
            >
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Gradient overlay when image is present */}
              {imagePreview && (
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
                />
              )}

              {/* Text overlay */}
              {text ? (
                <p
                  className="relative text-white text-xl font-bold text-center leading-relaxed break-words px-5 max-w-full"
                  style={{
                    textShadow: imagePreview
                      ? '0 2px 12px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)'
                      : '0 1px 4px rgba(0,0,0,0.3)',
                    zIndex: 2,
                  }}
                >
                  {text}
                </p>
              ) : (
                <p className="text-white/40 text-sm select-none" style={{ zIndex: 2 }}>
                  {mode === 'image' ? 'Selecciona una imagen' : 'Tu historia aparecerá aquí…'}
                </p>
              )}

              {/* Remove image button */}
              {imagePreview && (
                <button
                  onClick={removeImage}
                  aria-label="Quitar imagen"
                  className="absolute top-2.5 right-2.5 size-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  style={{ zIndex: 3 }}
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              {/* Tap to change image hint */}
              {mode === 'image' && !imagePreview && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ zIndex: 3 }}
                  aria-label="Seleccionar imagen"
                >
                  <div className="flex flex-col items-center gap-2 text-white/60">
                    <div className="size-12 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Toca para elegir</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Background color */}
          <div className="px-4 pb-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
              {mode === 'image' ? 'Color de respaldo' : 'Color de fondo'}
            </p>
            <div className="flex gap-2 flex-wrap">
              {BG_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setColor(p.value)}
                  aria-label={p.label}
                  className="size-9 rounded-full transition-all shrink-0"
                  style={{
                    backgroundColor: p.value,
                    outline:        color === p.value ? `3px solid ${p.value}` : 'none',
                    outlineOffset:  '3px',
                    boxShadow:      color === p.value ? '0 0 0 1px rgba(0,0,0,0.1)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Text input */}
          <div className="px-4 pb-5">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
              {mode === 'image' ? 'Texto encima (opcional)' : 'Texto de la historia'}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={mode === 'image' ? 'Agrega texto sobre la imagen…' : '¿Qué quieres compartir?'}
              maxLength={200}
              rows={3}
              className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 border border-[var(--border)] focus:outline-none focus:border-[var(--border-focus)] transition-colors leading-relaxed"
            />
            <p className="text-[10px] text-[var(--text-muted)] text-right mt-1 tabular-nums">
              {text.length}/200
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-4 py-3 shrink-0 bg-[var(--bg-surface)]">
          {error && (
            <p className="text-xs text-red-500 mb-2.5">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                  </svg>
                  Publicando…
                </>
              ) : (
                'Publicar historia'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
