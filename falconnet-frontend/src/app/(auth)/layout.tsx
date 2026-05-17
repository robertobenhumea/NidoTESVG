import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-12">
      {/* Brand header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="size-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
          F
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            FalconNet
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            La red social del TESVG
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
        {children}
      </div>

      <p className="mt-6 text-xs text-[var(--text-muted)] text-center">
        © {new Date().getFullYear()} FalconNet · TESVG
      </p>
    </div>
  );
}
