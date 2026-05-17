'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';

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

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
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

export default function SettingsPage() {
  const router = useRouter();
  const { clearAuth } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();

  async function handleLogout() {
    await authService.logout();
    clearAuth();
    router.replace('/login');
  }

  return (
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
          <button className="text-sm text-[var(--brand)] font-medium">Editar</button>
        </SettingRow>
        <SettingRow label="Cambiar contraseña">
          <button className="text-sm text-[var(--brand)] font-medium">Cambiar</button>
        </SettingRow>
        <SettingRow label="Correo institucional">
          <span className="text-sm text-[var(--text-muted)]">···@tesvg.edu.mx</span>
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
  );
}
