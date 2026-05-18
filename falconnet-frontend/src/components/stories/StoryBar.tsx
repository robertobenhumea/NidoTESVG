'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { storyService } from '@/services/story.service';
import { useAuth } from '@/hooks/useAuth';
import type { StoryGroup } from '@/types';

const BG_PRESETS = [
  { label: 'Noche',   value: '#1A1A2E' },
  { label: 'Violeta', value: '#6366f1' },
  { label: 'Rosa',    value: '#ec4899' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Verde',   value: '#10b981' },
  { label: 'Azul',    value: '#0ea5e9' },
];

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
        <div
          className="h-48 flex items-center justify-center p-6 transition-colors duration-200"
          style={{ backgroundColor: color }}
        >
          <p className="text-white text-xl font-semibold text-center leading-relaxed break-words">
            {text || <span className="opacity-50">Tu historia aparecerá aquí…</span>}
          </p>
        </div>
        <div className="flex gap-2 px-4 pt-4">
          {BG_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setColor(p.value)}
              aria-label={p.label}
              className="size-7 rounded-full transition-all"
              style={{
                backgroundColor: p.value,
                outline: color === p.value ? `2px solid ${p.value}` : 'none',
                outlineOffset: '3px',
              }}
            />
          ))}
        </div>
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
  const { user }                        = useAuth();
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

  const enrichedGroups: StoryGroup[] = groups.map((g) => ({
    ...g,
    allViewed: g.stories.every((s) => viewedIds.has(s.id)),
  }));

  const currentUserGroupIdx = enrichedGroups.findIndex((g) => g.user.id === user?.id);
  const orderedGroups: StoryGroup[] = currentUserGroupIdx > 0
    ? [enrichedGroups[currentUserGroupIdx], ...enrichedGroups.filter((_, i) => i !== currentUserGroupIdx)]
    : enrichedGroups;

  if (loading) {
    return (
      <div className="flex gap-2.5 px-3 py-1.5 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 rounded-2xl bg-[var(--bg-elevated)] animate-pulse"
            style={{ width: 100, height: 168 }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-2.5 px-3 py-1.5 overflow-x-auto scrollbar-hide"
        aria-label="Historias"
      >
        {/* Create story card */}
        <button
          onClick={() => setCreateOpen(true)}
          className="relative shrink-0 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] group border border-[var(--border)] hover:border-[var(--brand)] transition-all select-none"
          style={{ width: 100, height: 168 }}
          aria-label="Crear historia"
        >
          {/* User avatar fills upper 64% */}
          <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: 108 }}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--brand)] to-purple-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white select-none">
                  {(user?.displayName ?? user?.username ?? '?')[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Bottom label area */}
          <div
            className="absolute inset-x-0 bottom-0 bg-[var(--bg-surface)] flex items-end justify-center pb-4"
            style={{ top: 108 }}
          >
            <span className="text-[11px] font-semibold text-[var(--text-primary)] text-center leading-tight px-1.5">
              Crear historia
            </span>
          </div>

          {/* "+" badge at the boundary */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: 92 }}
          >
            <div className="size-8 rounded-full bg-[var(--brand)] flex items-center justify-center ring-[3px] ring-[var(--bg-surface)] group-hover:scale-110 transition-transform">
              <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
        </button>

        {/* Story group cards */}
        {orderedGroups.map((group, i) => {
          const name       = group.user.displayName ?? group.user.username;
          const isViewed   = group.allViewed;
          const firstStory = group.stories[0];
          const bgImage    = firstStory?.imageUrl;
          const bgColor    = firstStory?.backgroundColor ?? '#1A1A2E';
          const totalViews = group.stories.reduce((sum, s) => sum + s.viewCount, 0);

          return (
            <button
              key={group.user.id}
              onClick={() => setViewerIdx(i)}
              className="relative shrink-0 rounded-2xl overflow-hidden select-none active:scale-95 transition-transform"
              style={{ width: 100, height: 168, backgroundColor: bgColor }}
              aria-label={`Historia de ${name}`}
            >
              {/* Background image */}
              {bgImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bgImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 38%, rgba(0,0,0,0.65) 100%)' }}
              />

              {/* Avatar ring at top */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2">
                <div
                  className="p-[3px] rounded-full"
                  style={{
                    background: isViewed
                      ? 'rgba(255,255,255,0.35)'
                      : 'linear-gradient(135deg, #6366f1, #ec4899)',
                  }}
                >
                  {group.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.user.avatarUrl}
                      alt={name}
                      className="w-9 h-9 rounded-full object-cover block"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-white select-none">
                        {name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name + view count */}
              <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-3">
                <p className="text-white text-[11px] font-semibold leading-tight truncate drop-shadow-sm">
                  {name}
                </p>
                {totalViews > 0 && (
                  <p className="text-white/65 text-[10px] tabular-nums mt-0.5 drop-shadow-sm">
                    {totalViews.toLocaleString()} {totalViews === 1 ? 'vista' : 'vistas'}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

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

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); load(); }}
        />
      )}
    </>
  );
}
