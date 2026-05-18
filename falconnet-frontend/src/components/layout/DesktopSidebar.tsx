'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';

/* ── Minimal icon set ── */
function Ic({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
      {d2 && <path d={d2} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
const IcHome      = () => <Ic d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" d2="M9 22V12h6v10" />;
const IcUser      = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4"/></svg></>;
const IcBell      = () => <Ic d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" d2="M13.73 21a2 2 0 0 1-3.46 0" />;
const IcTrend     = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round"/></svg></>;
const IcMail      = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" strokeLinecap="round"/></svg></>;
const IcFile      = () => <Ic d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" d2="M14 2v6h6M16 13H8M16 17H8M10 9H8" />;
const IcCalendar  = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/></svg></>;
const IcStore     = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></>;
const IcGroups    = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/></svg></>;
const IcTeam      = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg></>;
const IcSettings  = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></>;
const IcAdmin     = () => <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcLogout    = () => <><svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/><polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/></svg></>;
const IcCompose   = () => <Ic d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" d2="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />;

interface NavItem {
  href: string;
  label: string;
  icon: () => React.ReactNode;
  exact?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { href: ROUTES.HOME,        label: 'Inicio',       icon: IcHome,     exact: true },
  { href: ROUTES.MARKETPLACE, label: 'Marketplace',  icon: IcStore },
  { href: ROUTES.EQUIPOS,     label: 'Equipos',      icon: IcTeam },
  { href: ROUTES.GROUPS,      label: 'Comunidades',  icon: IcGroups },
];

const NAV_PERSONAL: NavItem[] = [
  { href: ROUTES.PROFILE,     label: 'Mi perfil',    icon: IcUser },
  { href: ROUTES.AVISOS,      label: 'Avisos',       icon: IcBell },
  { href: ROUTES.RANKING,     label: 'Ranking',      icon: IcTrend },
  { href: ROUTES.CORREOS,     label: 'Correo',       icon: IcMail },
  { href: ROUTES.RECURSOS,    label: 'Recursos',     icon: IcFile },
  { href: ROUTES.EVENTOS,     label: 'Eventos',      icon: IcCalendar },
  { href: ROUTES.SETTINGS,    label: 'Configuración',icon: IcSettings },
];

function SidebarLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-100',
        isActive
          ? 'bg-[var(--brand-muted)] text-[var(--brand)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
      )}
    >
      <item.icon />
      {item.label}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
      {label}
    </p>
  );
}

export function DesktopSidebar() {
  const { user, clearAuth } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  async function handleLogout() {
    await authService.logout();
    clearAuth();
    router.replace(ROUTES.LOGIN);
  }

  if (!user) return null;

  return (
    <aside className="hidden xl:flex flex-col w-60 shrink-0 sticky top-[var(--nav-h)] h-[calc(100vh-var(--nav-h))] overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-surface)] scrollbar-hide">
      <div className="flex flex-col gap-0.5 px-2 py-3 flex-1">

        {/* User card */}
        <Link
          href={ROUTES.PROFILE}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--bg-elevated)] transition-colors mb-2 group"
        >
          <Avatar src={user.avatarUrl} name={user.displayName ?? user.username} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
              {user.displayName ?? user.username}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">@{user.username}</p>
          </div>
        </Link>

        {/* Create post shortcut */}
        <Link
          href={ROUTES.CREATE}
          className="flex items-center justify-center gap-2 h-9 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors mb-3"
        >
          <IcCompose />
          Publicar
        </Link>

        {/* Main nav */}
        <SectionLabel label="Descubrir" />
        {NAV_MAIN.map((item) => (
          <SidebarLink key={item.href} item={item} isActive={isActive(item)} />
        ))}

        {/* Personal nav */}
        <SectionLabel label="Mi cuenta" />
        {NAV_PERSONAL.map((item) => (
          <SidebarLink key={item.href} item={item} isActive={isActive(item)} />
        ))}

        {user.role === 'ADMIN' && (
          <SidebarLink
            item={{ href: ROUTES.ADMIN, label: 'Admin', icon: IcAdmin }}
            isActive={pathname.startsWith(ROUTES.ADMIN)}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors mt-2"
        >
          <IcLogout />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
