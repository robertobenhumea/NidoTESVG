'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/* Route-level error boundary for the (main) segment.
   Renders inside the root layout — must NOT include <html> or <body>. */
export default function MainError({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    logger.error('Main segment error boundary', { message: error.message });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
      <div className="text-5xl select-none">⚠️</div>
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Error al cargar esta sección
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
          Algo salió mal. Puedes reintentar o volver al inicio.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={unstable_retry} size="sm">Reintentar</Button>
        <Link
          href="/"
          className="inline-flex h-8 items-center px-4 text-sm rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          Inicio
        </Link>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-2 text-left max-w-md w-full">
          <summary className="text-xs text-[var(--text-muted)] cursor-pointer select-none">
            Detalle (dev)
          </summary>
          <pre className="mt-2 text-xs text-red-400 whitespace-pre-wrap break-words bg-[var(--bg-elevated)] p-3 rounded-xl">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}
