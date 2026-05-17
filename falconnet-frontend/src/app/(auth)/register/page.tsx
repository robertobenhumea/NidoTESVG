'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';

const INSTITUTIONAL_DOMAIN = '@tesvg.edu.mx';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [form, setForm] = useState({
    username:    '',
    email:       '',
    password:    '',
    confirm:     '',
    codigoAcceso: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.email.toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)) {
      setError(`Solo se permiten correos institucionales ${INSTITUTIONAL_DOMAIN}`);
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!form.username.trim()) {
      setError('El nombre de usuario es requerido.');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authService.register({
        username: form.username.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (user && token) {
        setAuth(user, token);
        router.replace('/');
      } else {
        setError('No se pudo completar el registro. Intenta de nuevo.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Crear cuenta
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Únete a la comunidad FalconNet · TESVG
        </p>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <Input
        label="Usuario"
        type="text"
        placeholder="juanperez"
        value={form.username}
        onChange={set('username')}
        required
        autoFocus
        autoComplete="username"
        hint="Solo letras, números y guiones bajos"
      />

      <Input
        label="Correo institucional"
        type="email"
        placeholder={`usuario${INSTITUTIONAL_DOMAIN}`}
        value={form.email}
        onChange={set('email')}
        required
        autoComplete="email"
        hint={`Debe ser un correo ${INSTITUTIONAL_DOMAIN}`}
      />

      <Input
        label="Contraseña"
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={form.password}
        onChange={set('password')}
        required
        autoComplete="new-password"
        minLength={6}
      />

      <Input
        label="Confirmar contraseña"
        type="password"
        placeholder="Repite tu contraseña"
        value={form.confirm}
        onChange={set('confirm')}
        required
        autoComplete="new-password"
      />

      <Button type="submit" loading={loading} fullWidth className="mt-1">
        Crear cuenta
      </Button>

      <p className="text-sm text-center text-[var(--text-secondary)]">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="text-[var(--brand)] hover:text-[var(--brand-hover)] font-semibold transition-colors"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
