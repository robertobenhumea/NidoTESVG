'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

/* ── Icons ── */
function IcSearch() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>;
}
function IcBell() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round"/></svg>;
}
function IcChat() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IcHome() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IcStore() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
function IcUser() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IcSettings() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IcLogout() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/></svg>;
}
function IcGroups() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

interface NavBtnProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}

function NavBtn({ href, icon, label, active, badge }: NavBtnProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative size-10 flex items-center justify-center rounded-xl transition-colors duration-150',
        active
          ? 'bg-[var(--brand-muted)] text-[var(--brand)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
      )}
    >
      {icon}
      {badge != null && badge > 0 && (
        <span
          aria-label={`${badge} sin leer`}
          className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, clearAuth } = useAuth();
  const unread    = useUnreadCounts();
  const [search, setSearch] = useState('');

  async function handleLogout() {
    await authService.logout();
    clearAuth();
    router.replace(ROUTES.LOGIN);
  }

  const profileItems: DropdownItem[] = [
    {
      label: 'Mi perfil',
      icon:  <IcUser />,
      onClick: () => router.push(ROUTES.PROFILE),
    },
    {
      label: 'Avisos',
      icon:  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 11l19-9-9 19-2-8-8-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      onClick: () => router.push(ROUTES.AVISOS),
    },
    {
      label: 'Ranking',
      icon:  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
      onClick: () => router.push(ROUTES.RANKING),
    },
    {
      label: 'Configuración',
      icon:  <IcSettings />,
      onClick: () => router.push(ROUTES.SETTINGS),
    },
    {
      label:   'Cerrar sesión',
      icon:    <IcLogout />,
      onClick: handleLogout,
      danger:  true,
      divider: true,
    },
  ];

  return (
    <header
      role="banner"
      className="fixed top-0 inset-x-0 z-50 h-[var(--nav-h)]"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="h-full flex items-center px-4 gap-3 bg-[var(--bg-surface)] border-b border-[var(--border)]">

        {/* Logo */}
        <Link href={ROUTES.HOME} aria-label="FalconNet — Inicio" className="flex items-center gap-2 shrink-0 mr-2">
          <div className="size-8 rounded-xl bg-[var(--brand)] flex items-center justify-center text-white font-bold text-sm" aria-hidden>
            F
          </div>
          <span className="hidden sm:block font-semibold text-[var(--text-primary)] text-base tracking-tight">
            FalconNet
          </span>
        </Link>

        {/* Search — desktop */}
        <form
          role="search"
          className="hidden md:flex flex-1 max-w-xs relative"
          onSubmit={(e) => { e.preventDefault(); if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`); }}
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden>
            <IcSearch />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en FalconNet…"
            aria-label="Buscar en FalconNet"
            className="w-full h-9 pl-9 pr-4 rounded-xl text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-transparent focus:border-[var(--border-focus)] focus:outline-none transition-colors"
          />
        </form>

        <div className="flex-1" aria-hidden />

        {/* Nav links — desktop only */}
        <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-1">
          <NavBtn href={ROUTES.HOME}          icon={<IcHome />}  label="Inicio"         active={pathname === '/'} />
          <NavBtn href={ROUTES.MARKETPLACE}   icon={<IcStore />} label="Marketplace"    active={pathname.startsWith('/marketplace')} />
          <NavBtn href={ROUTES.GROUPS}        icon={<IcGroups />} label="Comunidades"   active={pathname.startsWith('/groups')} />
          <NavBtn href={ROUTES.MESSAGES}      icon={<IcChat />}  label="Mensajes"       active={pathname.startsWith('/messages')} badge={unread.messages} />
          <NavBtn href={ROUTES.NOTIFICATIONS} icon={<IcBell />}  label="Notificaciones" active={pathname.startsWith('/notifications')} badge={unread.notifications} />
        </nav>

        {/* Search icon — mobile only */}
        <Link
          href={ROUTES.SEARCH}
          className="md:hidden size-10 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Buscar"
        >
          <IcSearch />
          <VisuallyHidden>Buscar</VisuallyHidden>
        </Link>

        {/* Profile dropdown */}
        <Dropdown
          trigger={
            <button
              className="rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              aria-label="Menú de perfil"
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.displayName ?? user?.username ?? 'Usuario'}
                size="sm"
              />
            </button>
          }
          items={profileItems}
          align="right"
        />
      </div>
    </header>
  );
}
