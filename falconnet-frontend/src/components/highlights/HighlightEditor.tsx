'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { destacadoService } from '@/services/destacado.service';
import { StorySelector } from './StorySelector';
import type { Destacado, CreateDestacadoPayload } from '@/types';

const EMOJIS = ['🏋️', '🎮', '📚', '💼', '🎭', '🏆', '❤️', '🌟', '🎵', '🏅', '📸', '🌍', '✈️', '🎨', '⚽', '🍕', '🎓', '💻', '🐾', '🌸'];

const COLORS: { value: string; label: string }[] = [
  { value: '#2563eb', label: 'Azul' },
  { value: '#7c3aed', label: 'Violeta' },
  { value: '#059669', label: 'Verde' },
  { value: '#ea580c', label: 'Naranja' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#ca8a04', label: 'Amarillo' },
  { value: '#475569', label: 'Gris' },
];

interface Props {
  highlight?: Destacado;
  onSave: (h: Destacado) => void;
  onClose: () => void;
}

export function HighlightEditor({ highlight, onSave, onClose }: Props) {
  const [nombre,      setNombre]      = useState(highlight?.nombre ?? '');
  const [emoji,       setEmoji]       = useState(highlight?.emoji ?? '');
  const [color,       setColor]       = useState(highlight?.coverColor ?? '');
  const [publico,     setPublico]     = useState(highlight?.publico ?? true);
  const [storyIds,    setStoryIds]    = useState<number[]>(highlight?.historias.map((h) => h.id) ?? []);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [showEmojis,  setShowEmojis]  = useState(false);
  const [mounted,     setMounted]     = useState(false);
  const overlayRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');
    const payload: CreateDestacadoPayload = {
      nombre: nombre.trim(),
      emoji:  emoji || undefined,
      coverColor: color || undefined,
      publico,
      historiaIds: storyIds,
    };
    try {
      let saved: Destacado;
      if (highlight) {
        saved = await destacadoService.update(highlight.id, payload);
      } else {
        saved = await destacadoService.create(payload);
      }
      onSave(saved);
    } catch (err) {
      console.error('[HighlightEditor] save failed:', err);
      const msg = err instanceof Error ? err.message : 'Error al guardar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {highlight ? 'Editar Destacado' : 'Nuevo Destacado'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Preview */}
          <div className="flex items-center gap-3">
            <div
              className="size-16 rounded-full border-2 border-[var(--brand)] flex items-center justify-center text-2xl shrink-0 overflow-hidden"
              style={{ background: color || 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
            >
              {emoji || <svg className="size-7 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{nombre || 'Sin nombre'}</p>
              <p className="text-xs text-[var(--text-muted)]">{storyIds.length} historia{storyIds.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.slice(0, 50))}
              placeholder="Ej: Deportes, Trabajo..."
              maxLength={50}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] transition-colors"
            />
            <p className="text-right text-[11px] text-[var(--text-muted)] mt-1">{nombre.length}/50</p>
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Emoji (opcional)
            </label>
            <button
              type="button"
              onClick={() => setShowEmojis((v) => !v)}
              className={`h-11 px-4 rounded-xl border text-sm flex items-center gap-2 transition-colors ${
                showEmojis
                  ? 'border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="text-xl">{emoji || '😊'}</span>
              <span>{emoji ? 'Cambiar emoji' : 'Elegir emoji'}</span>
            </button>

            {showEmojis && (
              <div className="mt-2 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                <div className="grid grid-cols-10 gap-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setEmoji(e); setShowEmojis(false); }}
                      className={`text-xl h-9 w-full flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-surface)] ${
                        emoji === e ? 'bg-[var(--brand)]/15 ring-1 ring-[var(--brand)]' : ''
                      }`}
                      title={e}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                {emoji && (
                  <button
                    type="button"
                    onClick={() => { setEmoji(''); setShowEmojis(false); }}
                    className="mt-2 w-full text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors text-center"
                  >
                    Quitar emoji
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Color de portada */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Color de portada
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setColor(color === value ? '' : value)}
                  className={`size-8 rounded-full transition-all ${
                    color === value ? 'ring-2 ring-offset-2 ring-[var(--brand)] ring-offset-[var(--bg-surface)]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: value }}
                />
              ))}
              {color && (
                <button
                  type="button"
                  onClick={() => setColor('')}
                  className="size-8 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-red-400 hover:text-red-400 transition-colors text-xs"
                  title="Sin color"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Privacidad */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Privacidad
            </label>
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setPublico(true)}
                className={`flex-1 h-10 text-sm font-medium transition-colors ${
                  publico
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                Público
              </button>
              <button
                type="button"
                onClick={() => setPublico(false)}
                className={`flex-1 h-10 text-sm font-medium transition-colors border-l border-[var(--border)] ${
                  !publico
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                Solo yo
              </button>
            </div>
          </div>

          {/* Historias */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Historias incluidas
            </label>
            <StorySelector selectedIds={storyIds} onChange={setStoryIds} />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 font-medium text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] flex gap-3 shrink-0"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            className="flex-1 h-11 rounded-xl bg-[var(--brand)] text-sm font-semibold text-white hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && (
              <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {highlight ? 'Guardar cambios' : 'Crear destacado'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
