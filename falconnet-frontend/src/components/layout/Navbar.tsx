'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { UserHub } from '@/components/layout/UserHub';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
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
  const pathname = usePathname();
  const router   = useRouter();
  const unread   = useUnreadCounts();
  const [search, setSearch] = useState('');

  return (
    <header
      role="banner"
      className="fixed top-0 inset-x-0 z-50 h-[var(--nav-h)]"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="h-full flex items-center px-4 gap-3 bg-[var(--bg-surface)]/85 backdrop-blur-md border-b border-[var(--border)]">

        {/* Logo */}
        <Link href={ROUTES.HOME} aria-label="FalconNet — Inicio" className="flex items-center gap-2 shrink-0 mr-2">
          <div
            className="size-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
            aria-hidden
          >
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
          <NavBtn href={ROUTES.HOME}          icon={<IcHome />}   label="Inicio"         active={pathname === '/'} />
          <NavBtn href={ROUTES.MARKETPLACE}   icon={<IcStore />}  label="Marketplace"    active={pathname.startsWith('/marketplace')} />
          <NavBtn href={ROUTES.GROUPS}        icon={<IcGroups />} label="Comunidades"    active={pathname.startsWith('/groups')} />
          <NavBtn href={ROUTES.MESSAGES}      icon={<IcChat />}   label="Mensajes"       active={pathname.startsWith('/messages')}      badge={unread.messages} />
          <NavBtn href={ROUTES.NOTIFICATIONS} icon={<IcBell />}   label="Notificaciones" active={pathname.startsWith('/notifications')} badge={unread.notifications} />
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

        {/* User hub — replaces old profile dropdown */}
        <UserHub />
      </div>
    </header>
  );
}
