'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { timeAgo } from '@/lib/utils';

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/* ── Types ── */
interface Stats { totalUsuarios: number; usuariosActivos: number; usuariosInactivos: number; totalPublicaciones: number; reportesPendientes: number; }
interface AdminUser { id: number; username: string; correo: string; rol: string; carrera?: string; grupo?: string; activo: boolean; fotoPerfil?: string; }
interface Report { id: number; publicacionId: number; reportanteId: number; razon: string; fecha: string; pubContenido?: string; pubAutor?: string; pubUsuarioId?: number; }

const ROLES = ['USUARIO', 'AUTORIDAD', 'DIRECCION', 'ADMIN'];

/* ── Stat card ── */
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 tabular-nums ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

/* ── Users tab ── */
function UsersTab() {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<AdminUser[]>('/admin/usuarios').then(setUsers).finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.correo.toLowerCase().includes(search.toLowerCase()))
    : users;

  async function changeRol(id: number, rol: string) {
    await api.put(`/admin/usuarios/${id}/rol`, { rol }).catch(() => {});
    setUsers((p) => p.map((u) => u.id === id ? { ...u, rol } : u));
  }

  async function toggleActivo(id: number, current: boolean) {
    await api.put(`/admin/usuarios/${id}/activo`, { activo: !current }).catch(() => {});
    setUsers((p) => p.map((u) => u.id === id ? { ...u, activo: !current } : u));
  }

  async function deleteUser(id: number, username: string) {
    if (!confirm(`¿Eliminar usuario "${username}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/admin/usuarios/${id}`).catch(() => {});
    setUsers((p) => p.filter((u) => u.id !== id));
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o correo…"
        className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] mb-4"
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className={`bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] px-3 py-2.5 flex items-center gap-3 ${!u.activo ? 'opacity-50' : ''}`}>
              <Avatar src={resolveUrl(u.fotoPerfil)} name={u.username} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.username}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{u.correo}</p>
              </div>
              <select
                value={u.rol}
                onChange={(e) => changeRol(u.id, e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none shrink-0"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={() => toggleActivo(u.id, u.activo)}
                className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors shrink-0 ${u.activo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'}`}
              >
                {u.activo ? 'Activo' : 'Inactivo'}
              </button>
              <button
                onClick={() => deleteUser(u.id, u.username)}
                className="size-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors shrink-0"
                aria-label="Eliminar usuario"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round"/><path d="M10 11v6M14 11v6" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reports tab ── */
function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Report[]>('/admin/reportes').then(setReports).finally(() => setLoading(false));
  }, []);

  async function handleAtender(id: number) {
    await api.put(`/admin/reportes/${id}/atender`).catch(() => {});
    setReports((p) => p.filter((r) => r.id !== id));
  }

  async function handleDeletePost(pubId: number, reportId: number) {
    if (!confirm('¿Eliminar la publicación reportada?')) return;
    await api.delete(`/admin/publicaciones/${pubId}`).catch(() => {});
    await api.put(`/admin/reportes/${reportId}/atender`).catch(() => {});
    setReports((p) => p.filter((r) => r.id !== reportId));
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />)}</div>;

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-2 select-none">✅</div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Sin reportes pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Reporte</span>
              <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{r.razon}</p>
            </div>
            <time className="text-xs text-[var(--text-muted)] shrink-0">{timeAgo(r.fecha)}</time>
          </div>
          {r.pubContenido && (
            <div className="mb-3 p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Publicación de <span className="font-medium">{r.pubAutor ?? `#${r.pubUsuarioId}`}</span>:</p>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{r.pubContenido}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleAtender(r.id)}
              className="flex-1 h-8 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Ignorar
            </button>
            <button
              onClick={() => handleDeletePost(r.publicacionId, r.id)}
              className="flex-1 h-8 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              Eliminar publicación
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function AdminPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [tab, setTab]       = useState<'usuarios' | 'reportes'>('usuarios');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') { router.replace('/'); return; }
    api.get<Stats>('/admin/stats').then(setStats).catch(() => {});
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">Acceso restringido</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-5">Panel de administración</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Usuarios"       value={stats.totalUsuarios}       color="text-[var(--text-primary)]" />
          <StatCard label="Activos"        value={stats.usuariosActivos}     color="text-green-500" />
          <StatCard label="Publicaciones"  value={stats.totalPublicaciones}  color="text-[var(--brand)]" />
          <StatCard label="Reportes"       value={stats.reportesPendientes}  color={stats.reportesPendientes > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-4">
        {(['usuarios', 'reportes'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {t === 'usuarios' ? 'Usuarios' : 'Reportes'}
            {t === 'reportes' && stats && stats.reportesPendientes > 0 && (
              <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {stats.reportesPendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'usuarios' ? <UsersTab /> : <ReportsTab />}
    </div>
  );
}
