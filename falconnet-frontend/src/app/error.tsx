'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/* Route-level error boundary for the root segment (/).
   Renders inside the root layout — must NOT include <html> or <body>. */
export default function RootError({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    logger.error('Root segment error boundary', {
      message: error.message,
      digest:  error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[var(--bg-base)] px-4 text-center gap-4">
      <div className="size-16 rounded-2xl bg-red-500 flex items-center justify-center text-white text-3xl font-bold">
        !
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Algo salió mal</h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed">
          Ocurrió un error inesperado.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={unstable_retry}>Reintentar</Button>
        <Button variant="secondary" onClick={() => { window.location.href = '/'; }}>
          Ir al inicio
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left max-w-md w-full">
          <summary className="text-xs text-[var(--text-muted)] cursor-pointer select-none">
            Detalle del error (dev)
          </summary>
          <pre className="mt-2 text-xs text-red-400 whitespace-pre-wrap break-words bg-[var(--bg-elevated)] p-3 rounded-xl">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}
