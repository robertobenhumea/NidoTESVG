'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MainError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Main layout error boundary', { message: error.message });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-5xl mb-5 select-none">⚠️</div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        Error al cargar esta sección
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs leading-relaxed">
        Algo salió mal. Puedes reintentar o volver al inicio.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} size="sm">Reintentar</Button>
        <Link
          href="/"
          className="inline-flex h-8 items-center px-4 text-sm rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          Inicio
        </Link>
      </div>
    </div>
  );
}
