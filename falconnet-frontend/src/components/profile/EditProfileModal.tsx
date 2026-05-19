'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { userService } from '@/services/user.service';
import type { User } from '@/types';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profileUser: User;
  onSaved: (updated: User) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow ${props.className ?? ''}`}
    />
  );
}

export function EditProfileModal({ open, onClose, profileUser, onSaved }: EditProfileModalProps) {
  const { updateUser } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(profileUser.username);
  const [bio, setBio] = useState(profileUser.bio ?? '');
  const [carrera, setCarrera] = useState(profileUser.carrera ?? '');
  const [grupo, setGrupo] = useState(profileUser.grupo ?? '');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  // Sync fields when profileUser changes
  useEffect(() => {
    setUsername(profileUser.username);
    setBio(profileUser.bio ?? '');
    setCarrera(profileUser.carrera ?? '');
    setGrupo(profileUser.grupo ?? '');
    setAvatarPreview(null);
    setAvatarFile(null);
    setBannerPreview(null);
    setBannerFile(null);
    setError('');
    setSaved(false);
  }, [profileUser, open]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function handleImageSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File) => void,
    setPreview: (s: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Tamaño máximo: 10 MB'); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      let updated = await userService.updateProfile({ username: username.trim(), bio: bio.trim(), carrera: carrera.trim(), grupo: grupo.trim() });

      if (avatarFile) {
        updated = await userService.uploadAndSetAvatar(avatarFile);
      }
      if (bannerFile) {
        updated = await userService.uploadAndSetCover(bannerFile);
      }

      updateUser(updated);
      onSaved(updated);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setLoading(false);
    }
  }

  if (!open || !mounted) return null;

  const displayName = profileUser.displayName ?? profileUser.username;
  const bioCharsLeft = 160 - bio.length;

  const panel = (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Editar perfil"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-lg bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Editar perfil</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto flex-1 px-5 py-4 space-y-5"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5" id="edit-profile-form">

            {/* Banner preview + picker */}
            <div>
              <FieldLabel>Foto de portada</FieldLabel>
              <div className="relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-700 to-blue-500 cursor-pointer group"
                   onClick={() => bannerInputRef.current?.click()}>
                {(bannerPreview ?? profileUser.coverUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={bannerPreview ?? profileUser.coverUrl}
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-700 to-blue-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 text-white text-sm font-medium">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Cambiar portada
                  </div>
                </div>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageSelect(e, setBannerFile, setBannerPreview)}
              />
            </div>

            {/* Avatar picker */}
            <div>
              <FieldLabel>Foto de perfil</FieldLabel>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)] group"
                  aria-label="Cambiar foto de perfil"
                >
                  <Avatar src={avatarPreview ?? profileUser.avatarUrl} name={displayName} size="xl" />
                  <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </span>
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-sm text-[var(--brand)] font-medium hover:opacity-80 transition-opacity"
                  >
                    Cambiar foto
                  </button>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">JPG, PNG · Máx 10 MB</p>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageSelect(e, setAvatarFile, setAvatarPreview)}
              />
            </div>

            {/* Username */}
            <div>
              <FieldLabel>Nombre de usuario</FieldLabel>
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario"
                maxLength={50}
                autoComplete="username"
              />
            </div>

            {/* Bio */}
            <div>
              <FieldLabel>Biografía</FieldLabel>
              <div className="relative">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  placeholder="Cuéntanos sobre ti…"
                  rows={3}
                  maxLength={160}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none transition-shadow"
                />
                <span className={`absolute bottom-2.5 right-3 text-xs tabular-nums ${bioCharsLeft <= 20 ? 'text-orange-500' : 'text-[var(--text-muted)]'}`}>
                  {bioCharsLeft}
                </span>
              </div>
            </div>

            {/* Carrera + Grupo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Carrera</FieldLabel>
                <TextInput
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                  placeholder="Ej. ISC"
                  maxLength={80}
                />
              </div>
              <div>
                <FieldLabel>Grupo</FieldLabel>
                <TextInput
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                  placeholder="Ej. 5A"
                  maxLength={20}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
            )}
          </form>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-5 pb-5 pt-3 border-t border-[var(--border)] flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="edit-profile-form"
            variant="primary"
            className="flex-1"
            loading={loading}
            disabled={loading}
          >
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
