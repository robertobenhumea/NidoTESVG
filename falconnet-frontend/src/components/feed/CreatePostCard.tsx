'use client';

import { useState, useRef, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { STORAGE_KEYS } from '@/lib/utils';
import type { User, Post } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface CreatePostCardProps {
  author: User;
  onPostCreated: (post: Post) => void;
  onSubmit: (content: string, imageUrl?: string) => Promise<Post>;
}

function IcImage() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function IcX() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
    </svg>
  );
}

async function uploadImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const formData = new FormData();
  formData.append('archivo', file);
  const res = await fetch(`${API_BASE}/imagenes/subir`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error('No se pudo subir la imagen');
  const data = await res.json() as { url: string };
  const base = API_BASE.replace(/\/$/, '');
  const path = data.url;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function CreatePostCard({ author, onPostCreated, onSubmit }: CreatePostCardProps) {
  const [expanded, setExpanded]       = useState(false);
  const [content, setContent]         = useState('');
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const displayName = author.displayName ?? author.username;

  function expand() {
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancel() {
    setContent('');
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setExpanded(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede pesar más de 5MB'); return; }
    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;
    setError('');
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
        setUploading(false);
      }
      const post = await onSubmit(content.trim(), imageUrl);
      onPostCreated(post);
      cancel();
    } catch (err: unknown) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Error al publicar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm">
      {!expanded ? (
        <div className="flex items-center gap-3">
          <Avatar src={author.avatarUrl} name={displayName} size="md" />
          <button
            onClick={expand}
            className="flex-1 h-10 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-left px-4 text-sm text-[var(--text-muted)] transition-colors"
            aria-label="Crear publicación"
          >
            ¿Qué estás pensando?
          </button>
          <button
            onClick={() => { expand(); setTimeout(() => fileInputRef.current?.click(), 60); }}
            aria-label="Agregar foto"
            className="size-10 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand)] transition-colors shrink-0"
          >
            <IcImage />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={author.avatarUrl} name={displayName} size="md" />
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight pt-1">
              {displayName}
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué estás pensando?"
            rows={4}
            maxLength={2000}
            className="w-full resize-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[15px] leading-relaxed focus:outline-none mb-2"
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mb-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Vista previa"
                className="w-full max-h-64 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Quitar imagen"
                className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <IcX />
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Adjuntar imagen"
                className="size-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand)] transition-colors disabled:opacity-40"
              >
                <IcImage />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-xs text-[var(--text-muted)] tabular-nums ml-1">
                {content.length}/2000
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={loading}
                disabled={!content.trim() && !imageFile}
              >
                {uploading ? 'Subiendo…' : 'Publicar'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
