'use client';

/**
 * MediaGallery — slide-in panel for shared media / files / links
 *
 * Desktop: fixed 380px right panel
 * Mobile:  full-screen overlay (bottom sheet feel)
 *
 * Props:
 *   items         — all media messages (must NOT be eliminado)
 *   onOpen        — called with the item the user clicked
 *   onClose       — close the panel
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { SecureImage, getFileIcon, isImageFile, isAudioFile } from './SecureAttachment';

export type GalleryItem = {
  id: number;
  url: string;
  fileName: string;
  tipo?: string | null;          // 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'TEXT' | etc.
  fileType?: string | null;
  fileSize?: number | null;
  content?: string | null;       // text content (for link extraction)
  createdAt?: string | null;
  date?: Date | null;
};

type Tab = 'ALL' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'LINK';

const TAB_LABELS: Record<Tab, string> = {
  ALL: 'Todo',
  IMAGE: 'Imágenes',
  DOCUMENT: 'Docs',
  AUDIO: 'Audios',
  LINK: 'Links',
};

const URL_RE = /https?:\/\/[^\s"'<>)]+/gi;

function extractLinks(text?: string | null): string[] {
  if (!text) return [];
  return Array.from(text.matchAll(URL_RE), m => m[0]);
}

function fileSizeLabel(size?: number | null): string {
  if (!size) return '';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function dayLabel(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return date.toLocaleDateString('es-MX', { weekday: 'long' });
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: diff > 365 ? 'numeric' : undefined });
}

function groupByDay(items: GalleryItem[]): { label: string; items: GalleryItem[] }[] {
  const map = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const d = item.date ?? (item.createdAt ? new Date(item.createdAt) : null);
    const key = d ? d.toDateString() : 'Sin fecha';
    const label = d ? dayLabel(d) : 'Sin fecha';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
    // store label alongside
    (map as unknown as Map<string, GalleryItem[] & { _label: string }>).get(key)!;
    const arr = map.get(key)!;
    // @ts-expect-error custom prop
    arr._label = label;
  }
  // @ts-expect-error custom prop
  return [...map.values()].map(arr => ({ label: arr._label as string, items: arr }));
}

/* ── Component ───────────────────────────────────────────── */

export function MediaGallery({
  items,
  onOpen,
  onClose,
  title = 'Multimedia',
}: {
  items: GalleryItem[];
  onOpen: (item: GalleryItem) => void;
  onClose: () => void;
  title?: string;
}) {
  const [tab, setTab] = useState<Tab>('ALL');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  /* Escape to close */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* counts per tab */
  const counts = useMemo<Record<Tab, number>>(() => {
    const images = items.filter(i => i.tipo === 'IMAGE' || isImageFile(i.fileName) || isImageFile(i.url)).length;
    const docs = items.filter(i => i.tipo === 'DOCUMENT' || (!isImageFile(i.fileName) && !isAudioFile(i.fileName) && i.url)).length;
    const audios = items.filter(i => i.tipo === 'AUDIO' || isAudioFile(i.fileName)).length;
    const links = items.filter(i => extractLinks(i.content).length > 0).length;
    return { ALL: items.length, IMAGE: images, DOCUMENT: docs, AUDIO: audios, LINK: links };
  }, [items]);

  /* filter */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = items;

    if (tab === 'IMAGE') result = result.filter(i => i.tipo === 'IMAGE' || isImageFile(i.fileName) || isImageFile(i.url));
    else if (tab === 'DOCUMENT') result = result.filter(i => i.tipo === 'DOCUMENT' || (!isImageFile(i.fileName) && !isAudioFile(i.fileName) && i.url));
    else if (tab === 'AUDIO') result = result.filter(i => i.tipo === 'AUDIO' || isAudioFile(i.fileName));
    else if (tab === 'LINK') result = result.filter(i => extractLinks(i.content).length > 0);

    if (q) {
      result = result.filter(i =>
        i.fileName?.toLowerCase().includes(q) ||
        i.content?.toLowerCase().includes(q) ||
        i.fileType?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [items, tab, query]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  /* is image tab → grid; else → list */
  const useGrid = tab === 'IMAGE' || (tab === 'ALL' && filtered.every(i => i.tipo === 'IMAGE' || isImageFile(i.fileName)));

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/30 sm:hidden"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className={[
        'fixed z-[75] flex flex-col bg-[var(--bg-surface)] shadow-2xl',
        /* mobile: full screen */
        'inset-0 sm:inset-auto',
        /* desktop: right panel */
        'sm:top-0 sm:right-0 sm:bottom-0 sm:w-[360px]',
        'border-l border-[var(--border)]',
      ].join(' ')}>

        {/* Header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4">
          <button type="button" onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors shrink-0"
            aria-label="Cerrar">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className="flex-1 text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          <span className="text-xs text-[var(--text-muted)]">{filtered.length} archivo{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-muted)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar archivos, nombres, links…"
              className="w-full rounded-xl bg-[var(--bg-elevated)] pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--brand)]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid size-5 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                tab === t
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {TAB_LABELS[t]}
              {counts[t] > 0 && (
                <span className={`rounded-full px-1 text-[10px] ${tab === t ? 'bg-white/20' : 'bg-[var(--bg-base)]'}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 text-4xl opacity-30">
                {tab === 'IMAGE' ? '🖼️' : tab === 'DOCUMENT' ? '📄' : tab === 'AUDIO' ? '🎵' : tab === 'LINK' ? '🔗' : '📂'}
              </span>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {query ? 'Sin resultados' : `Sin ${TAB_LABELS[tab].toLowerCase()} compartidos`}
              </p>
            </div>
          ) : (
            <>
              {tab === 'LINK' ? (
                /* Link list */
                <LinkList items={filtered} />
              ) : grouped.map(group => (
                <div key={group.label} className="mb-4">
                  <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {group.label}
                  </p>

                  {useGrid ? (
                    /* Image grid */
                    <div className="grid grid-cols-3 gap-1">
                      {group.items.map(item => (
                        <ImageThumb key={item.id} item={item} onClick={() => onOpen(item)} />
                      ))}
                    </div>
                  ) : (
                    /* File / audio list */
                    <div className="space-y-1">
                      {group.items.map(item => (
                        (item.tipo === 'IMAGE' || isImageFile(item.fileName) || isImageFile(item.url))
                          ? <ImageThumb key={item.id} item={item} onClick={() => onOpen(item)} listMode />
                          : <FileRow key={item.id} item={item} onClick={() => onOpen(item)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function ImageThumb({ item, onClick, listMode }: { item: GalleryItem; onClick: () => void; listMode?: boolean }) {
  if (listMode) {
    return (
      <button type="button" onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl bg-[var(--bg-elevated)] p-2.5 text-left hover:bg-[var(--bg-elevated)]/80 transition-colors">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg">
          <SecureImage src={item.url} alt={item.fileName} className="size-12 object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--text-primary)]">{item.fileName}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{fileSizeLabel(item.fileSize)}</p>
        </div>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--bg-elevated)] hover:ring-2 hover:ring-[var(--brand)] transition-all">
      <SecureImage
        src={item.url}
        alt={item.fileName}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
    </button>
  );
}

function FileRow({ item, onClick }: { item: GalleryItem; onClick: () => void }) {
  const isAudio = item.tipo === 'AUDIO' || isAudioFile(item.fileName);
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-[var(--bg-elevated)] p-3 text-left hover:bg-[var(--bg-elevated)]/80 transition-colors">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-muted)] text-xl">
        {isAudio ? '🎵' : getFileIcon(item.fileName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">{item.fileName}</p>
        <p className="text-[10px] text-[var(--text-muted)]">
          {isAudio ? 'Audio' : (item.fileType ?? 'Archivo')}{item.fileSize ? ` · ${fileSizeLabel(item.fileSize)}` : ''}
        </p>
      </div>
      <svg className="size-3.5 shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

function LinkList({ items }: { items: GalleryItem[] }) {
  const links = useMemo(() => {
    const out: { url: string; label: string; date: Date | null }[] = [];
    for (const item of items) {
      for (const link of extractLinks(item.content)) {
        const d = item.date ?? (item.createdAt ? new Date(item.createdAt) : null);
        out.push({ url: link, label: link, date: d });
      }
    }
    return out;
  }, [items]);

  if (links.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin enlaces compartidos.</p>;
  }

  return (
    <div className="space-y-2 pt-2">
      {links.map((link, idx) => (
        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl bg-[var(--bg-elevated)] p-3 hover:bg-[var(--bg-elevated)]/80 transition-colors">
          <span className="mt-0.5 text-base shrink-0">🔗</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--brand)]">{link.url}</p>
            {link.date && (
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{dayLabel(link.date)}</p>
            )}
          </div>
          <svg className="size-3 shrink-0 text-[var(--text-muted)] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ))}
    </div>
  );
}
