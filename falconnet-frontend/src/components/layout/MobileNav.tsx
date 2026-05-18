'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

/* ── Icons ── */
function IconHome({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 19 11h-1v9a1 1 0 0 1-1 1h-4v-6H11v6H7a1 1 0 0 1-1-1v-9H5a1 1 0 0 1-.707-1.707l7-7z" />
    </svg>
  ) : (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}
function IconChat({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ) : (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconUser({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-7 8a7 7 0 0 1 14 0H5z" />
    </svg>
  ) : (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

interface TabItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  exact?: boolean;
  create?: boolean;
  badge?: number;
}

export function MobileNav() {
  const pathname = usePathname();
  const unread   = useUnreadCounts();

  const tabs: TabItem[] = [
    {
      href: '/',
      label: 'Inicio',
      icon: (a) => <IconHome filled={a} />,
      exact: true,
    },
    {
      href: '/search',
      label: 'Buscar',
      icon: () => <IconSearch />,
    },
    {
      href: '/create',
      label: 'Crear',
      icon: () => <IconPlus />,
      create: true,
    },
    {
      href: '/messages',
      label: 'Mensajes',
      icon: (a) => <IconChat filled={a} />,
      badge: unread.messages,
    },
    {
      href: '/profile',
      label: 'Perfil',
      icon: (a) => <IconUser filled={a} />,
    },
  ];

  function isActive(tab: TabItem): boolean {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--bg-surface)]/90 backdrop-blur-md border-t border-[var(--border)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="flex items-center justify-around h-[var(--nav-bottom-h)] px-2">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
              aria-label={tab.label}
            >
              {tab.create ? (
                /* Create button — elevated style */
                <span className="size-11 flex items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-lg shadow-blue-500/20">
                  <IconPlus />
                </span>
              ) : (
                <>
                  <span
                    className={cn(
                      'relative transition-colors duration-150',
                      active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]',
                    )}
                  >
                    {tab.icon(active)}
                    {tab.badge != null && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors duration-150',
                      active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]',
                    )}
                  >
                    {tab.label}
                  </span>
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--brand)]" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
