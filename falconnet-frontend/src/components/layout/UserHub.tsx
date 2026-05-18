'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

/* ─────────────────────────────────────────────
   Icon set — minimal SVGs, all size-[18px]
───────────────────────────────────────────── */
function Ic({ d, d2, fill }: { d: string; d2?: string; fill?: boolean }) {
  return (
    <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={2}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
      {d2 && <path d={d2} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
const IcProfile   = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4"/></svg>;
const IcSettings  = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcTeam      = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcMail      = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" strokeLinecap="round"/></svg>;
const IcRanking   = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcResources = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" strokeLinecap="round"/><line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round"/></svg>;
const IcCalendar  = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/></svg>;
const IcAvisos    = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 11l19-9-9 19-2-8-8-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcAdmin     = () => <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcLogout    = () => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/><polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/></svg>;
const IcChevron   = () => <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/* ─────────────────────────────────────────────
   Role badge
───────────────────────────────────────────── */
function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === 'ADMIN') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
      <svg className="size-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Admin
    </span>
  );
  if (r === 'AUTORIDAD' || r === 'DIRECCION') return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
      Autoridad
    </span>
  );
  if (r === 'DOCENTE') return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
      Docente
    </span>
  );
  return null;
}

/* ─────────────────────────────────────────────
   Section header
───────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────
   Hub item row
───────────────────────────────────────────── */
interface HubItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  onClick: () => void;
}

function HubItem({ href, icon, label, badge, active, onClick }: HubItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 mx-1.5 rounded-xl text-sm font-medium transition-colors duration-100 group',
        active
          ? 'bg-[var(--brand-muted)] text-[var(--brand)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
      )}
    >
      <span className={cn(
        'shrink-0 transition-colors duration-100',
        active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]',
      )}>
        {icon}
      </span>
      <span className="flex-1 leading-none">{label}</span>
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Main UserHub
───────────────────────────────────────────── */
export function UserHub() {
  const { user, clearAuth } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const unread   = useUnreadCounts();

  const [open,    setOpen]    = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* ── Open / close with animation ── */
  const openHub = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const closeHub = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 160);
  }, []);

  const toggle = useCallback(() => {
    if (open) closeHub(); else openHub();
  }, [open, openHub, closeHub]);

  /* ── Click outside + ESC ── */
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeHub();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') closeHub();
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, closeHub]);

  async function handleLogout() {
    closeHub();
    await authService.logout();
    clearAuth();
    router.replace(ROUTES.LOGIN);
  }

  if (!user) return null;

  const displayName = user.displayName ?? user.username;
  const role        = user.role?.toUpperCase() ?? '';
  const isAdmin     = role === 'ADMIN';
  const isAuthority = isAdmin || role === 'AUTORIDAD' || role === 'DIRECCION';

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + '/');

  return (
    <div ref={ref} className="relative">

      {/* ── Trigger button ── */}
      <button
        onClick={toggle}
        aria-label="Menú de usuario"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 transition-transform duration-100 active:scale-95"
      >
        <Avatar
          src={user.avatarUrl}
          name={displayName}
          size="sm"
        />
        {/* Online dot */}
        <span
          aria-hidden
          className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]"
        />
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          role="dialog"
          aria-label="Centro de herramientas"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
            transition: 'opacity 160ms cubic-bezier(0.16,1,0.3,1), transform 160ms cubic-bezier(0.16,1,0.3,1)',
          }}
          className="absolute right-0 top-[calc(100%+8px)] z-[60] w-72 max-h-[calc(100svh-5rem)] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-xl shadow-2xl shadow-black/12 dark:shadow-black/50 overflow-hidden"
        >
          {/* ── User header ── */}
          <div
            className="px-4 pt-5 pb-4 shrink-0"
            style={{
              background: 'linear-gradient(160deg, var(--brand-muted) 0%, transparent 80%)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* Avatar + online */}
            <div className="flex items-start justify-between mb-3">
              <div className="relative">
                <Avatar src={user.avatarUrl} name={displayName} size="lg" />
                <span
                  aria-hidden
                  className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]"
                />
              </div>
              {/* Quick profile link */}
              <Link
                href={ROUTES.PROFILE}
                onClick={closeHub}
                className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors mt-1"
              >
                Ver perfil
                <IcChevron />
              </Link>
            </div>

            {/* Name */}
            <p className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">
              {displayName}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">@{user.username}</p>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              <RoleBadge role={user.role} />
              {user.carrera && (
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 rounded-full truncate max-w-[140px]">
                  {user.carrera}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                En línea
              </span>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 scrollbar-hide pb-1">

            {/* CUENTA */}
            <SectionLabel>Cuenta</SectionLabel>
            <HubItem href={ROUTES.PROFILE}  icon={<IcProfile />}  label="Mi perfil"      active={isActive(ROUTES.PROFILE, true)} onClick={closeHub} />
            <HubItem href={ROUTES.SETTINGS} icon={<IcSettings />} label="Configuración"  active={isActive(ROUTES.SETTINGS)}      onClick={closeHub} />

            {/* HERRAMIENTAS */}
            <SectionLabel>Herramientas</SectionLabel>
            <HubItem href={ROUTES.EQUIPOS}  icon={<IcTeam />}      label="Equipos"   active={isActive(ROUTES.EQUIPOS)}  onClick={closeHub} />
            <HubItem href={ROUTES.CORREOS}  icon={<IcMail />}      label="Correo"    active={isActive(ROUTES.CORREOS)}  onClick={closeHub} badge={unread.messages > 0 ? unread.messages : undefined} />
            <HubItem href={ROUTES.RANKING}  icon={<IcRanking />}   label="Ranking"   active={isActive(ROUTES.RANKING)}  onClick={closeHub} />
            <HubItem href={ROUTES.RECURSOS} icon={<IcResources />} label="Recursos"  active={isActive(ROUTES.RECURSOS)} onClick={closeHub} />
            <HubItem href={ROUTES.EVENTOS}  icon={<IcCalendar />}  label="Eventos"   active={isActive(ROUTES.EVENTOS)}  onClick={closeHub} />

            {/* ADMINISTRACIÓN */}
            {isAuthority && (
              <>
                <SectionLabel>Administración</SectionLabel>
                <HubItem href={ROUTES.AVISOS} icon={<IcAvisos />} label="Avisos" active={isActive(ROUTES.AVISOS)} onClick={closeHub} />
                {isAdmin && (
                  <HubItem href={ROUTES.ADMIN} icon={<IcAdmin />} label="Panel admin" active={isActive(ROUTES.ADMIN)} onClick={closeHub} />
                )}
              </>
            )}

            {/* SESIÓN */}
            <div className="mx-1.5 mt-2 mb-1 pt-2 border-t border-[var(--border)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors duration-100"
              >
                <IcLogout />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
