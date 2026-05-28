'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

function isChatDetailRoute(pathname: string): boolean {
  return /^\/messages\/(?:groups\/[^/]+|[^/]+)$/.test(pathname);
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chatDetail = isChatDetailRoute(pathname);

  return (
    <AuthGuard>
      <div className="min-h-svh bg-[var(--bg-base)]">
        <Navbar hideOnMobile={chatDetail} />

        <div
          className={cn(
            'flex',
            chatDetail
              ? 'pt-0 md:pt-[calc(var(--nav-h)+var(--safe-top))]'
              : 'pt-[calc(var(--nav-h)+var(--safe-top))]',
          )}
        >
          <DesktopSidebar />

          <main
            id="main-content"
            className={cn(
              'min-w-0 flex-1',
              chatDetail
                ? 'pb-0 lg:pb-4'
                : 'pb-[calc(var(--nav-bottom-h)+var(--safe-bottom))] lg:pb-4',
            )}
          >
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </AuthGuard>
  );
}
