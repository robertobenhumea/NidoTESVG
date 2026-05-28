'use client';

import { ConvList } from './components/ConvList';

/* Desktop: two-pane — conv list (left) + placeholder (right)
   Mobile:  full-screen conv list only */
export default function MessagesPage() {
  return (
    <div
      className="flex min-h-0 overflow-hidden"
      style={{ height: 'calc(100dvh - var(--nav-h) - var(--safe-top))' }}
    >
      {/* Left panel — always visible */}
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] md:w-80 lg:w-[340px] xl:w-[360px]">
        <ConvList />
      </aside>

      {/* Right panel — desktop only placeholder */}
      <section className="hidden md:flex flex-1 flex-col items-center justify-center bg-[var(--bg-base)] gap-4 text-center px-8">
        <div className="size-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center shadow-sm">
          <svg className="size-9 text-[var(--text-muted)] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Selecciona un chat</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed max-w-[200px]">
            Elige una conversación de la lista para empezar a chatear
          </p>
        </div>
      </section>
    </div>
  );
}
