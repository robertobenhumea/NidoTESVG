import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex">

      {/* ── Left brand panel (desktop only) ── */}
      <div
        className="hidden lg:flex flex-col flex-1 items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f2460 0%, #1d4ed8 55%, #3b82f6 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute size-[480px] rounded-full bg-white/5 -top-24 -left-24 blur-3xl" />
        <div className="absolute size-80 rounded-full bg-blue-300/10 bottom-0 right-0 blur-3xl" />
        <div className="absolute size-56 rounded-full bg-white/10 top-1/3 right-1/4" />

        {/* Brand content */}
        <div className="relative z-10 text-center text-white px-14 max-w-md">
          <div className="size-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-4xl font-bold mx-auto mb-7 shadow-2xl">
            F
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">FalconNet</h1>
          <p className="text-lg text-blue-200 mb-10">La red social del TESVG</p>

          <ul className="space-y-4 text-left">
            {[
              'Conecta con tu comunidad universitaria',
              'Comparte apuntes y recursos educativos',
              'Mantente al día de eventos e avisos',
            ].map((text) => (
              <li key={text} className="flex items-center gap-3 text-sm text-blue-100/85">
                <span className="size-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom watermark */}
        <p className="absolute bottom-5 text-xs text-white/30">© {new Date().getFullYear()} TESVG</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[420px] lg:shrink-0 px-5 py-12 bg-[var(--bg-base)]">

        {/* Mobile-only brand header */}
        <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
          <div className="size-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/25">
            F
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">FalconNet</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">La red social del TESVG</p>
          </div>
        </div>

        {/* Desktop brand label */}
        <div className="hidden lg:block w-full max-w-sm mb-5">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">FalconNet · TESVG</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          {children}
        </div>

        <p className="mt-5 text-xs text-[var(--text-muted)] text-center">
          © {new Date().getFullYear()} FalconNet — TESVG
        </p>
      </div>
    </div>
  );
}
