'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { storyService } from '@/services/story.service';
import { useAuth } from '@/hooks/useAuth';
import type { StoryGroup } from '@/types';

const GRADIENT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#0ea5e9', '#1A1A2E', '#7c3aed',
];

const BG_PRESETS = [
  { label: 'Noche',     value: '#1A1A2E' },
  { label: 'Violeta',   value: '#6366f1' },
  { label: 'Rosa',      value: '#ec4899' },
  { label: 'Naranja',   value: '#f97316' },
  { label: 'Verde',     value: '#10b981' },
  { label: 'Azul',      value: '#0ea5e9' },
];

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [text, setText]       = useState('');
  const [color, setColor]     = useState(BG_PRESETS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSubmit() {
    if (!text.trim()) { setError('Escribe algo para tu historia'); return; }
    setLoading(true);
    setError('');
    try {
      await storyService.create({ texto: text.trim(), colorFondo: color });
      onCreated();
      onClose();
    } catch {
      setError('Error al crear la historia. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-2xl">

        {/* Preview */}
        <div
          className="h-48 flex items-center justify-center p-6 transition-colors duration-200"
          style={{ backgroundColor: color }}
        >
          <p className="text-white text-xl font-semibold text-center leading-relaxed break-words">
            {text || <span className="opacity-50">Tu historia aparecerá aquí…</span>}
          </p>
        </div>

        {/* Color picker */}
        <div className="flex gap-2 px-4 pt-4">
          {BG_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setColor(p.value)}
              aria-label={p.label}
              className="size-7 rounded-full ring-2 ring-offset-2 transition-all"
              style={{
                backgroundColor: p.value,
                outline: color === p.value ? `2px solid ${p.value}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>

        {/* Text input */}
        <div className="px-4 pt-3 pb-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué quieres compartir?"
            maxLength={200}
            rows={3}
            className="w-full resize-none rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2.5 border border-[var(--border)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className="flex-1 h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryBar() {
  const { user }           = useAuth();
  const [groups, setGroups]             = useState<StoryGroup[]>([]);
  const [viewedIds, setViewedIds]       = useState<Set<number>>(new Set());
  const [viewerGroupIdx, setViewerIdx]  = useState<number | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const scrollRef                       = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await storyService.getActive();
      setGroups(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleGroupViewed(groupIndex: number, storyIndex: number) {
    const story = groups[groupIndex]?.stories[storyIndex];
    if (!story) return;
    setViewedIds((prev) => new Set([...prev, story.id]));
  }

  function handleDelete(storyId: number, groupIndex: number) {
    storyService.delete(storyId).catch(() => {});
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIndex] };
      g.stories = g.stories.filter((s) => s.id !== storyId);
      if (g.stories.length === 0) next.splice(groupIndex, 1);
      else next[groupIndex] = g;
      return next;
    });
    if (viewerGroupIdx !== null) {
      if (groups[groupIndex]?.stories.length <= 1) setViewerIdx(null);
    }
  }

  // Compute allViewed based on local set
  const enrichedGroups: StoryGroup[] = groups.map((g) => ({
    ...g,
    allViewed: g.stories.every((s) => viewedIds.has(s.id)),
  }));

  // Put current user's group first if exists
  const currentUserGroupIdx = enrichedGroups.findIndex((g) => g.user.id === user?.id);
  const orderedGroups: StoryGroup[] = currentUserGroupIdx > 0
    ? [
        enrichedGroups[currentUserGroupIdx],
        ...enrichedGroups.filter((_, i) => i !== currentUserGroupIdx),
      ]
    : enrichedGroups;

  if (loading) {
    return (
      <div className="flex gap-3 px-3 pb-1 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
            <div className="size-14 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-2.5 w-10 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-3 px-3 pb-1 overflow-x-auto scrollbar-hide"
        aria-label="Historias"
      >
        {/* Create story bubble — always first */}
        <button
          onClick={() => setCreateOpen(true)}
          className="flex flex-col items-center gap-1.5 shrink-0 w-16 group"
          aria-label="Crear historia"
        >
          <div className="relative size-14 rounded-full bg-[var(--bg-elevated)] border-2 border-dashed border-[var(--border)] group-hover:border-[var(--brand)] transition-colors flex items-center justify-center overflow-hidden">
            {user?.avatarUrl ? (
              <Avatar src={user.avatarUrl} name={user.displayName ?? user.username} size="lg" />
            ) : (
              <Avatar src={undefined} name={user?.displayName ?? user?.username ?? '?'} size="lg" />
            )}
            <div className="absolute bottom-0 right-0 size-5 rounded-full bg-[var(--brand)] flex items-center justify-center ring-2 ring-[var(--bg-surface)]">
              <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] leading-none truncate w-full text-center">
            Crear
          </span>
        </button>

        {/* Story groups */}
        {orderedGroups.map((group, i) => {
          const name = group.user.displayName ?? group.user.username;
          const isViewed = group.allViewed;
          return (
            <button
              key={group.user.id}
              onClick={() => setViewerIdx(i)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16"
              aria-label={`Historia de ${name}`}
            >
              <div
                className="size-14 rounded-full p-0.5"
                style={{
                  background: isViewed
                    ? 'var(--border)'
                    : `linear-gradient(135deg, ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]}, ${GRADIENT_COLORS[(i + 2) % GRADIENT_COLORS.length]})`,
                }}
              >
                <div className="size-full rounded-full ring-2 ring-[var(--bg-surface)] overflow-hidden">
                  <Avatar src={group.user.avatarUrl} name={name} size="lg" />
                </div>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] leading-none truncate w-full text-center">
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story Viewer */}
      {viewerGroupIdx !== null && (
        <StoryViewer
          groups={orderedGroups}
          initialGroupIndex={viewerGroupIdx}
          currentUserId={user?.id}
          onClose={() => setViewerIdx(null)}
          onGroupViewed={handleGroupViewed}
          onDelete={handleDelete}
        />
      )}

      {/* Create Modal */}
      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); load(); }}
        />
      )}
    </>
  );
}
