'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { destacadoService } from '@/services/destacado.service';
import { HighlightCard, getCoverImage } from './HighlightCard';
import { HighlightViewer } from './HighlightViewer';
import { HighlightEditor } from './HighlightEditor';
import type { Destacado } from '@/types';

/* ── Skeleton ── */
function HighlightSkeleton() {
  return (
    <div className="flex gap-3 px-4 pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 w-[72px] shrink-0">
          <div className="size-[68px] rounded-full bg-[var(--bg-elevated)] animate-pulse" />
          <div className="h-2.5 w-12 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  usuarioId: number;
  isOwner: boolean;
}

export function HighlightCarousel({ usuarioId, isOwner }: Props) {
  const [highlights,    setHighlights]    = useState<Destacado[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [viewerIdx,     setViewerIdx]     = useState<number | null>(null);
  const [editorHL,      setEditorHL]      = useState<Destacado | null | undefined>(undefined);
  const [deleteTarget,  setDeleteTarget]  = useState<Destacado | null>(null);
  const [reorderMode,   setReorderMode]   = useState(false);
  const [savingReorder, setSavingReorder] = useState(false);
  const reorderRef = useRef<Destacado[]>([]);

  const loadHighlights = useCallback(async () => {
    setLoading(true);
    try {
      const data = isOwner
        ? await destacadoService.getMios()
        : await destacadoService.getByUsuario(usuarioId);
      setHighlights(Array.isArray(data) ? data : []);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, [usuarioId, isOwner]);

  useEffect(() => { loadHighlights(); }, [loadHighlights]);

  async function handleDelete(hl: Destacado) {
    try {
      await destacadoService.delete(hl.id);
      setHighlights((prev) => prev.filter((h) => h.id !== hl.id));
    } catch { /* ignore */ } finally {
      setDeleteTarget(null);
    }
  }

  function handleSaved(saved: Destacado) {
    setEditorHL(undefined);
    setHighlights((prev) => {
      const idx = prev.findIndex((h) => h.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });
  }

  function enterReorder() {
    reorderRef.current = [...highlights];
    setReorderMode(true);
  }

  function moveHighlight(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= highlights.length) return;
    setHighlights((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function saveReorder() {
    setSavingReorder(true);
    try {
      await destacadoService.reorder(highlights.map((h) => h.id));
      setReorderMode(false);
    } catch {
      // restore original order on failure
      setHighlights(reorderRef.current);
      setReorderMode(false);
    } finally {
      setSavingReorder(false);
    }
  }

  function cancelReorder() {
    setHighlights(reorderRef.current);
    setReorderMode(false);
  }

  if (loading) {
    return (
      <div className="overflow-x-auto scrollbar-hide py-3 border-b border-[var(--border)]">
        <HighlightSkeleton />
      </div>
    );
  }

  // Nothing to show and not owner → hide section entirely
  if (highlights.length === 0 && !isOwner) return null;

  return (
    <>
      <div className="border-b border-[var(--border)]">
        {/* Reorder toolbar */}
        {reorderMode && (
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--brand)]/8 border-b border-[var(--brand)]/20">
            <span className="text-xs font-semibold text-[var(--brand)]">Reorganizando</span>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelReorder}
                disabled={savingReorder}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveReorder}
                disabled={savingReorder}
                className="text-xs font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] px-3 py-1 rounded-full disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {savingReorder && <span className="size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                Listo
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 py-3 snap-x snap-mandatory">

            {/* "New highlight" button — only for owner, hidden in reorder mode */}
            {isOwner && !reorderMode && (
              <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 snap-start">
                <button
                  onClick={() => setEditorHL(null)}
                  aria-label="Crear nuevo destacado"
                  className="size-[68px] rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-colors"
                >
                  <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <p className="text-[11px] font-medium text-[var(--text-muted)] text-center truncate w-full">
                  Nuevo
                </p>
              </div>
            )}

            {/* Highlight cards */}
            {highlights.map((hl, idx) => (
              reorderMode ? (
                /* Reorder item: arrows + label, no open/edit/delete */
                <div key={hl.id} className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 snap-start select-none">
                  <div className="relative size-[68px]">
                    {/* Dimmed card visual — uses same cover priority as HighlightCard */}
                    {(() => {
                      const img = getCoverImage(hl);
                      return img ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={img}
                          alt={hl.nombre}
                          draggable={false}
                          loading="lazy"
                          className="size-full rounded-full object-cover border-2 border-[var(--brand)]/50 opacity-70"
                        />
                      ) : (
                        <div
                          className="size-full rounded-full overflow-hidden border-2 border-[var(--brand)]/40 flex items-center justify-center text-2xl opacity-70"
                          style={{ background: hl.coverColor ?? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                        >
                          {hl.emoji ?? (
                            <svg className="size-7 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      );
                    })()}

                    {/* Left arrow */}
                    {idx > 0 && (
                      <button
                        onClick={() => moveHighlight(idx, -1)}
                        aria-label="Mover a la izquierda"
                        className="absolute -left-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white hover:border-[var(--brand)] transition-colors z-10"
                      >
                        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                    )}

                    {/* Right arrow */}
                    {idx < highlights.length - 1 && (
                      <button
                        onClick={() => moveHighlight(idx, 1)}
                        aria-label="Mover a la derecha"
                        className="absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white hover:border-[var(--brand)] transition-colors z-10"
                      >
                        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-[var(--text-primary)] text-center truncate w-full leading-tight">
                    {hl.nombre}
                  </p>
                </div>
              ) : (
                <HighlightCard
                  key={hl.id}
                  highlight={hl}
                  onOpen={() => {
                    if (hl.historias.length === 0) {
                      if (isOwner) setEditorHL(hl);
                    } else {
                      setViewerIdx(idx);
                    }
                  }}
                  onEdit={isOwner ? () => setEditorHL(hl) : undefined}
                  onDelete={isOwner ? () => setDeleteTarget(hl) : undefined}
                  isOwner={isOwner}
                />
              )
            ))}

            {/* Empty state for owner with 0 highlights */}
            {isOwner && highlights.length === 0 && (
              <div className="flex items-center px-2">
                <p className="text-sm text-[var(--text-muted)]">
                  Crea tu primer destacado para guardar historias importantes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reorder trigger — only for owner with 2+ highlights */}
        {isOwner && highlights.length >= 2 && !reorderMode && (
          <div className="flex justify-end px-4 pb-2">
            <button
              onClick={enterReorder}
              className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors flex items-center gap-1"
            >
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
              </svg>
              Reorganizar
            </button>
          </div>
        )}
      </div>

      {/* Viewer */}
      {viewerIdx !== null && highlights[viewerIdx] && (
        <HighlightViewer
          highlights={highlights}
          startIndex={viewerIdx}
          onClose={() => setViewerIdx(null)}
        />
      )}

      {/* Editor (create or edit) */}
      {editorHL !== undefined && (
        <HighlightEditor
          highlight={editorHL ?? undefined}
          onSave={handleSaved}
          onClose={() => setEditorHL(undefined)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.nombre}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

/* ── Delete confirm modal ── */
function DeleteConfirmModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-xs bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-6 pb-4 text-center">
          <div className="size-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-3">
            <svg className="size-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </div>
          <p className="text-base font-bold text-[var(--text-primary)] mb-1">¿Eliminar &ldquo;{name}&rdquo;?</p>
          <p className="text-sm text-[var(--text-muted)]">Las historias no se eliminarán. Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex border-t border-[var(--border)]">
          <button
            onClick={onCancel}
            className="flex-1 h-12 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors border-r border-[var(--border)]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
