'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { BStory } from '@/types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function StorySelector({ selectedIds, onChange }: Props) {
  const [stories, setStories] = useState<BStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get<BStory[]>('/stories/mis-stories')
      .then((data) => { if (mounted) setStories(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">No tienes historias guardadas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-0.5">
      {stories.map((story) => {
        const checked = selectedIds.includes(story.id);
        const thumb   = resolveUrl(story.imagenUrl);
        return (
          <button
            key={story.id}
            type="button"
            onClick={() => toggle(story.id)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              checked
                ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/30'
                : 'border-transparent'
            }`}
          >
            {thumb ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-1"
                style={{ backgroundColor: story.colorFondo ?? '#1A1A2E' }}
              >
                {story.texto && (
                  <p className="text-white text-[10px] font-medium text-center leading-tight line-clamp-3 break-words">
                    {story.texto}
                  </p>
                )}
              </div>
            )}

            {/* Date overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5">
              <p className="text-white text-[9px] text-center leading-tight truncate">
                {formatDate(story.fecha)}
              </p>
            </div>

            {/* Checkmark */}
            {checked && (
              <div className="absolute top-1 right-1 size-5 rounded-full bg-[var(--brand)] flex items-center justify-center shadow">
                <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
