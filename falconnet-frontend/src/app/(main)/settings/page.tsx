'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { STORAGE_KEYS } from '@/lib/utils';

/* ── Shared primitives ────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 pt-5 pb-1.5">
      {children}
    </h2>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] px-4 divide-y divide-[var(--border)]">
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${
        checked ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elevated)]'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent ${props.className ?? ''}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none ${props.className ?? ''}`}
    />
  );
}

/* ── Sheet modal wrapper ──────────────────────────────────────── */

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        className="bg-[var(--bg-surface)] rounded-t-3xl shadow-xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Edit Profile Sheet ───────────────────────────────────────── */

function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername]   = useState(user?.username ?? '');
  const [bio, setBio]             = useState(user?.bio ?? '');
  const [carrera, setCarrera]     = useState(user?.carrera ?? '');
  const [grupo, setGrupo]         = useState(user?.grupo ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5MB'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let updatedUser = await userService.updateProfile({ username, bio, carrera, grupo });
      if (avatarFile) {
        updatedUser = await userService.uploadAndSetAvatar(avatarFile);
      }
      updateUser(updatedUser);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  const displayName = user?.displayName ?? user?.username ?? '';

  return (
    <Sheet open={open} onClose={onClose} title="Editar perfil">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            aria-label="Cambiar foto de perfil"
          >
            <Avatar
              src={avatarPreview ?? user?.avatarUrl}
              name={displayName}
              size="xl"
            />
            <span className="absolute bottom-0 right-0 size-8 flex items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-md">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
          </button>
          <span className="text-xs text-[var(--text-muted)]">Toca para cambiar la foto</span>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div>
          <FieldLabel>Nombre de usuario</FieldLabel>
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" maxLength={50} />
        </div>

        <div>
          <FieldLabel>Biografía</FieldLabel>
          <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Cuéntanos sobre ti…" rows={3} maxLength={200} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Carrera</FieldLabel>
            <TextInput value={carrera} onChange={(e) => setCarrera(e.target.value)} placeholder="Ej. ISC" maxLength={80} />
          </div>
          <div>
            <FieldLabel>Grupo</FieldLabel>
            <TextInput value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Ej. 5A" maxLength={20} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth loading={loading} disabled={loading}>
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      </form>
    </Sheet>
  );
}

/* ── Change Password Sheet ────────────────────────────────────── */

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setAuth, user } = useAuth();
  const [actual, setActual]     = useState('');
  const [nueva, setNueva]       = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (nueva.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (nueva !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const newToken = await userService.changePassword(actual, nueva);
      // Backend invalidates old sessions — update stored token
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      if (user) setAuth(user, newToken);
      setSaved(true);
      setActual(''); setNueva(''); setConfirm('');
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Cambiar contraseña">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Contraseña actual</FieldLabel>
          <TextInput type="password" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <div>
          <FieldLabel>Nueva contraseña</FieldLabel>
          <TextInput type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
        </div>
        <div>
          <FieldLabel>Confirmar nueva contraseña</FieldLabel>
          <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth loading={loading} disabled={loading || !actual || !nueva || !confirm}>
          {saved ? '¡Contraseña actualizada!' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Sheet>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const { clearAuth, user } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [editOpen, setEditOpen]   = useState(false);
  const [pwOpen, setPwOpen]       = useState(false);

  async function handleLogout() {
    await authService.logout();
    clearAuth();
    router.replace('/login');
  }

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-5">Configuración</h1>

        <SectionTitle>Apariencia</SectionTitle>
        <Section>
          <SettingRow label="Modo oscuro" description="Cambia el tema de la aplicación">
            <Toggle checked={isDark} onChange={toggleTheme} />
          </SettingRow>
        </Section>

        <SectionTitle>Cuenta</SectionTitle>
        <Section>
          <SettingRow label="Editar perfil" description="Foto, nombre, bio">
            <button
              onClick={() => setEditOpen(true)}
              className="text-sm text-[var(--brand)] font-medium hover:opacity-80 transition-opacity"
            >
              Editar
            </button>
          </SettingRow>
          <SettingRow label="Cambiar contraseña">
            <button
              onClick={() => setPwOpen(true)}
              className="text-sm text-[var(--brand)] font-medium hover:opacity-80 transition-opacity"
            >
              Cambiar
            </button>
          </SettingRow>
          <SettingRow label="Correo institucional">
            <span className="text-sm text-[var(--text-muted)]">{user?.email ?? '···@tesvg.edu.mx'}</span>
          </SettingRow>
        </Section>

        <SectionTitle>Privacidad</SectionTitle>
        <Section>
          <SettingRow label="Perfil privado" description="Solo seguidores pueden ver tu contenido">
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>
          <SettingRow label="Notificaciones push">
            <Toggle checked={true} onChange={() => {}} />
          </SettingRow>
        </Section>

        <SectionTitle>Sesión</SectionTitle>
        <div className="pt-2">
          <Button variant="danger" fullWidth onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] pt-6 pb-2">
          FalconNet v0.2.0 · TESVG
        </p>
      </div>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
      <ChangePasswordSheet open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}
