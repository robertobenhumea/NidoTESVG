'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';

function IcMail() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" strokeLinecap="round" />
    </svg>
  );
}
function IcLock() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await authService.login({ email, password });
      if (user && token) {
        setAuth(user, token);
        router.replace('/');
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Credenciales incorrectas. Intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Iniciar sesión
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Bienvenido de nuevo a FalconNet
        </p>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <Input
        label="Correo institucional"
        type="email"
        placeholder="usuario@tesvg.edu.mx"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        autoFocus
        leftIcon={<IcMail />}
      />

      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        leftIcon={<IcLock />}
      />

      <Button type="submit" loading={loading} fullWidth className="mt-1">
        Iniciar sesión
      </Button>

      <div className="flex items-center gap-3 my-0.5">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-muted)]">¿Nuevo aquí?</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <p className="text-sm text-center text-[var(--text-secondary)]">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="text-[var(--brand)] hover:text-[var(--brand-hover)] font-semibold transition-colors"
        >
          Regístrate gratis
        </Link>
      </p>
    </form>
  );
}
