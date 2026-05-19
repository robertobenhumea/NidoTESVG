'use client';

import { useEffect, useState, useCallback } from 'react';
import { destacadoService } from '@/services/destacado.service';
import { HighlightCard } from './HighlightCard';
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
  const [highlights, setHighlights] = useState<Destacado[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [viewerIdx,  setViewerIdx]  = useState<number | null>(null);
  const [editorHL,   setEditorHL]   = useState<Destacado | null | undefined>(undefined); // undefined = closed, null = create new
  const [deleteTarget, setDeleteTarget] = useState<Destacado | null>(null);

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
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 py-3 snap-x snap-mandatory">

            {/* "New highlight" button — only for owner */}
            {isOwner && (
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
              <HighlightCard
                key={hl.id}
                highlight={hl}
                onOpen={() => {
                  if (hl.historias.length === 0) {
                    // If no stories but owner, open editor
                    if (isOwner) setEditorHL(hl);
                  } else {
                    setViewerIdx(idx);
                  }
                }}
                onEdit={isOwner ? () => setEditorHL(hl) : undefined}
                onDelete={isOwner ? () => setDeleteTarget(hl) : undefined}
                isOwner={isOwner}
              />
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
