import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { AuthGuard } from '@/components/ui/AuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-svh bg-[var(--bg-base)]">
        <Navbar />

        <div
          className="flex"
          style={{ paddingTop: `calc(var(--nav-h) + var(--safe-top))` }}
        >
          <DesktopSidebar />

          <main
            id="main-content"
            className="flex-1 min-w-0 pb-[calc(var(--nav-bottom-h)+var(--safe-bottom))] lg:pb-4"
          >
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </AuthGuard>
  );
}
