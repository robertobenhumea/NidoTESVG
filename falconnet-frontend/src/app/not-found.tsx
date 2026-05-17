import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '404 — Página no encontrada' };

export default function NotFound() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[var(--bg-base)] px-4 text-center">
      <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] border-2 border-dashed border-[var(--border)] flex items-center justify-center text-4xl mb-6 select-none">
        🔍
      </div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">404</h1>
      <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-3">
        Página no encontrada
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs leading-relaxed">
        El contenido que buscas no existe o fue eliminado.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center px-6 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
