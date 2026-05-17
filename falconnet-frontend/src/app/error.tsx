'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Root error boundary caught', {
      message: error.message,
      digest:  error.digest,
    });
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-svh flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#0a0a0b] px-4 text-center font-sans">
        <div className="size-16 rounded-2xl bg-red-500 flex items-center justify-center text-white text-3xl font-bold mb-6">
          !
        </div>
        <h1 className="text-2xl font-bold text-[#09090b] dark:text-[#f5f5f7] mb-2">
          Algo salió mal
        </h1>
        <p className="text-[#52525b] dark:text-[#a1a1aa] mb-8 max-w-xs leading-relaxed">
          Ocurrió un error inesperado. El equipo fue notificado.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="secondary" onClick={() => (window.location.href = '/')}>
            Ir al inicio
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left max-w-md">
            <summary className="text-xs text-[#a1a1aa] cursor-pointer">
              Detalle del error (dev)
            </summary>
            <pre className="mt-2 text-xs text-red-400 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}
      </body>
    </html>
  );
}
