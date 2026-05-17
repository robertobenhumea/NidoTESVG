import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { AuthGuard } from '@/components/ui/AuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-svh flex flex-col bg-[var(--bg-base)]">
        <Navbar />

        <main
          className="flex-1 w-full mt-[var(--nav-h)] pb-[calc(var(--nav-bottom-h)+var(--safe-bottom))] lg:pb-0"
          style={{ paddingTop: 'var(--safe-top)' }}
        >
          {children}
        </main>

        <MobileNav />
      </div>
    </AuthGuard>
  );
}
