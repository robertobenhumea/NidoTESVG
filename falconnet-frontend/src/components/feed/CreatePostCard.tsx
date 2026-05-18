'use client';

import { useState, useRef, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';
import { STORAGE_KEYS } from '@/lib/utils';
import { CreateAvisoModal } from '@/components/feed/CreateAvisoModal';
import { CreateReclutamientoModal } from '@/components/feed/CreateReclutamientoModal';
import { ImageCropModal } from '@/components/feed/ImageCropModal';
import type { User, Post, ReclutamientoFeedItem } from '@/types';
import type { AvisoFeedItem } from '@/components/feed/AvisoFeedCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// Roles that can publish avisos (matches backend puedeCrearAvisos check)
const AVISO_ROLES = new Set(['AUTORIDAD', 'ADMIN', 'DOCENTE']);

interface CreatePostCardProps {
  author:                   User;
  onPostCreated:            (post: Post) => void;
  onSubmit:                 (content: string, imageUrl?: string) => Promise<Post>;
  onPollCreated?:           () => void;
  onAvisoCreated?:          (aviso: AvisoFeedItem) => void;
  onReclutamientoCreated?:  (item: ReclutamientoFeedItem) => void;
}

async function uploadImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  const formData = new FormData();
  formData.append('archivo', file);
  const res = await fetch(`${API_BASE}/imagenes/subir`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    formData,
  });
  if (!res.ok) throw new Error('No se pudo subir la imagen');
  const data = await res.json() as { url: string };
  const base  = API_BASE.replace(/\/$/, '');
  const path  = data.url;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function CreatePostCard({ author, onPostCreated, onSubmit, onPollCreated, onAvisoCreated, onReclutamientoCreated }: CreatePostCardProps) {
  const [expanded,      setExpanded]      = useState(false);
  const [content,       setContent]       = useState('');
  const [imageFile,     setImageFile]     = useState<File | null>(null);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  // Crop modal — pending file waiting for user to confirm/cancel crop
  const [cropSrc,       setCropSrc]       = useState<string | null>(null);
  const [cropFile,      setCropFile]      = useState<File | null>(null);
  // Poll
  const [pollOpen,      setPollOpen]      = useState(false);
  const [pollQ,         setPollQ]         = useState('');
  const [pollOpts,      setPollOpts]      = useState(['', '']);
  // Aviso modal
  const [avisoOpen,           setAvisoOpen]           = useState(false);
  const [avisoBlocked,        setAvisoBlocked]        = useState(false);
  // Reclutamiento modal
  const [reclutamientoOpen,   setReclutamientoOpen]   = useState(false);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName    = author.displayName ?? author.username;
  const canCreateAviso = AVISO_ROLES.has((author.role ?? '').toUpperCase());

  const validPollOpts = pollOpts.filter((o) => o.trim().length > 0);
  const hasPoll       = pollOpen && pollQ.trim().length > 0 && validPollOpts.length >= 2;
  const canSubmit     = !loading && (!!content.trim() || !!imageFile || hasPoll);

  function expand() {
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancel() {
    setContent('');
    setImageFile(null);
    setImagePreview(null);
    setCropSrc(null);
    setCropFile(null);
    setError('');
    setExpanded(false);
    setPollOpen(false);
    setPollQ('');
    setPollOpts(['', '']);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 10 * 1024 * 1024)   { setError('La imagen no puede pesar más de 10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setCropFile(file);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleCropConfirm(cropped: File) {
    const url = URL.createObjectURL(cropped);
    setImageFile(cropped);
    setImagePreview(url);
    setCropSrc(null);
    setCropFile(null);
  }

  function handleCropCancel() {
    setCropSrc(null);
    setCropFile(null);
  }

  function togglePoll() {
    if (!pollOpen) { expand(); setPollOpen(true); }
    else           { setPollOpen(false); setPollQ(''); setPollOpts(['', '']); }
  }

  function addPollOpt() {
    if (pollOpts.length < 4) setPollOpts([...pollOpts, '']);
  }

  function removePollOpt(i: number) {
    if (pollOpts.length > 2) setPollOpts(pollOpts.filter((_, idx) => idx !== i));
  }

  function updatePollOpt(i: number, v: string) {
    setPollOpts(pollOpts.map((o, idx) => (idx === i ? v : o)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
      if (hasPoll) {
        await api.post('/encuestas', {
          publicacionId: post.id,
          pregunta:      pollQ.trim(),
          opciones:      validPollOpts,
        });
        onPollCreated?.();
      }
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
    <>
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Always-rendered file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {!expanded ? (
          /* ── Collapsed ── */
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Avatar src={author.avatarUrl} name={displayName} size="md" />
              <button
                onClick={expand}
                className="flex-1 h-10 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-left px-4 text-sm text-[var(--text-muted)] transition-colors"
                aria-label="Crear publicación"
              >
                ¿Qué estás pensando, {displayName}?
              </button>
            </div>

            {/* Quick actions */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-0.5">

              {/* Foto */}
              <button
                onClick={() => { expand(); setTimeout(() => fileInputRef.current?.click(), 60); }}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <svg className="size-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-xs sm:text-sm">Foto</span>
              </button>

              {/* Video — no hay endpoint de upload, badge "Pronto" */}
              <div className="relative flex-1">
                <button
                  disabled
                  aria-label="Video — próximamente"
                  className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-medium text-[var(--text-muted)] opacity-40 cursor-not-allowed"
                >
                  <svg className="size-4 text-[var(--brand)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  <span className="text-xs sm:text-sm">Video</span>
                </button>
                <span className="absolute top-0 right-0.5 text-[8px] font-bold bg-[var(--brand)] text-white px-1 py-px rounded-full leading-none pointer-events-none select-none">
                  Pronto
                </span>
              </div>

              {/* Encuesta — backend completo */}
              <button
                onClick={togglePoll}
                aria-label="Crear encuesta"
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-medium transition-colors ${
                  pollOpen
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-amber-500'
                }`}
              >
                <svg className="size-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span className="text-xs sm:text-sm">Encuesta</span>
              </button>

              {/* Reclutar equipo */}
              <button
                onClick={() => setReclutamientoOpen(true)}
                aria-label="Reclutar equipo"
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand)] transition-colors"
              >
                <svg className="size-4 text-[var(--brand)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                <span className="text-xs sm:text-sm hidden sm:inline">Equipo</span>
                <span className="text-xs sm:hidden">Equipo</span>
              </button>

              {/* Aviso — role-gated, shows friendly message when blocked */}
              <div className="flex-1 relative">
                <button
                  onClick={() => {
                    if (canCreateAviso) {
                      setAvisoOpen(true);
                    } else {
                      setAvisoBlocked(true);
                      setTimeout(() => setAvisoBlocked(false), 2800);
                    }
                  }}
                  aria-label={canCreateAviso ? 'Publicar aviso institucional' : 'Sin permisos para crear avisos'}
                  title={canCreateAviso ? 'Publicar aviso institucional' : undefined}
                  className={`w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-medium transition-colors ${
                    canCreateAviso
                      ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-red-500'
                      : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                  }`}
                >
                  <svg className="size-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                  <span className="text-xs sm:text-sm hidden sm:inline">Aviso</span>
                  <span className="text-xs sm:hidden">Avisar</span>
                </button>

                {/* Blocked tooltip — works on mobile too */}
                {avisoBlocked && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl px-3 py-2.5 z-20 pointer-events-none">
                    <p className="text-[11px] text-center text-[var(--text-secondary)] leading-snug">
                      Solo el personal autorizado puede publicar avisos oficiales.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          /* ── Expanded ── */
          <form onSubmit={handleSubmit} className="p-3 sm:p-4">
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
              placeholder={pollOpen ? 'Agrega un comentario opcional…' : '¿Qué estás pensando?'}
              rows={4}
              maxLength={2000}
              className="w-full resize-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[15px] leading-relaxed focus:outline-none mb-2"
            />

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mb-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Vista previa" className="w-full max-h-64 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  aria-label="Quitar imagen"
                  className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Poll builder */}
            {pollOpen && (
              <div className="border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 mb-3 bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Encuesta
                  </p>
                  <button
                    type="button"
                    onClick={() => { setPollOpen(false); setPollQ(''); setPollOpts(['', '']); }}
                    aria-label="Quitar encuesta"
                    className="size-5 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <input
                  type="text"
                  value={pollQ}
                  onChange={(e) => setPollQ(e.target.value)}
                  placeholder="¿Cuál es tu pregunta?"
                  maxLength={200}
                  className="w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-2 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors"
                />

                <div className="space-y-1.5">
                  {pollOpts.map((opt, i) => (
                    <div key={i} className="flex gap-1.5">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updatePollOpt(i, e.target.value)}
                        placeholder={`Opción ${i + 1}`}
                        maxLength={100}
                        className="flex-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm px-3 py-1.5 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors"
                      />
                      {pollOpts.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOpt(i)}
                          aria-label={`Eliminar opción ${i + 1}`}
                          className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors shrink-0"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {pollOpts.length < 4 && (
                  <button
                    type="button"
                    onClick={addPollOpt}
                    className="w-full h-8 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/60 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    + Agregar opción
                  </button>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <div className="flex items-center gap-1">
                {/* Attach image */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label="Adjuntar imagen"
                  className="size-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand)] transition-colors disabled:opacity-40"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
                {/* Poll toggle */}
                <button
                  type="button"
                  onClick={togglePoll}
                  disabled={loading}
                  aria-label={pollOpen ? 'Quitar encuesta' : 'Agregar encuesta'}
                  className={`size-9 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${
                    pollOpen
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-amber-500'
                  }`}
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </button>
                <span className="text-xs text-[var(--text-muted)] tabular-nums ml-1">
                  {content.length}/2000
                </span>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" loading={loading} disabled={!canSubmit}>
                  {uploading ? 'Subiendo…' : 'Publicar'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Aviso modal — fuera del card para z-index correcto */}
      {avisoOpen && (
        <CreateAvisoModal
          onClose={() => setAvisoOpen(false)}
          onPublished={onAvisoCreated}
        />
      )}

      {/* Reclutamiento modal */}
      {reclutamientoOpen && (
        <CreateReclutamientoModal
          onClose={() => setReclutamientoOpen(false)}
          onPublished={onReclutamientoCreated}
        />
      )}

      {/* Image crop modal */}
      {cropSrc && cropFile && (
        <ImageCropModal
          src={cropSrc}
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
