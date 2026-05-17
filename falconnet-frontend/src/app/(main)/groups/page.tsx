'use client';

import type { Metadata } from 'next';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { groupService } from '@/services/group.service';
import { Avatar } from '@/components/ui/Avatar';
import type { Group } from '@/types';

const TYPE_LABEL: Record<string, string> = {
  carrera:  'Carrera',
  materia:  'Materia',
  general:  'General',
};

const TYPE_COLOR: Record<string, string> = {
  carrera: 'bg-blue-500/10 text-blue-500',
  materia: 'bg-purple-500/10 text-purple-500',
  general: 'bg-[var(--brand-muted)] text-[var(--brand)]',
};

function GroupCard({ group, onJoinToggle }: { group: Group; onJoinToggle: (g: Group) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await groupService.toggleJoin(group.id);
      onJoinToggle(group);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 hover:border-[var(--border-focus)] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className="size-12 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
          style={{ background: `hsl(${(group.id * 47) % 360}, 60%, 45%)` }}
        >
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{group.name}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLOR[group.type] ?? ''}`}>
              {TYPE_LABEL[group.type] ?? group.type}
            </span>
          </div>
          {group.description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{group.description}</p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
            group.isMember
              ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500'
              : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
          } disabled:opacity-50`}
        >
          {loading ? '…' : group.isMember ? 'Salir' : 'Unirse'}
        </button>
      </div>
    </Link>
  );
}

function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: Group) => void }) {
  const [nombre, setNombre]       = useState('');
  const [desc, setDesc]           = useState('');
  const [tipo, setTipo]           = useState<'general' | 'carrera' | 'materia'>('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const group = await groupService.create({ nombre: nombre.trim(), descripcion: desc.trim(), tipo });
      onCreate(group);
    } catch {
      setError('No se pudo crear el grupo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[var(--bg-surface)] rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[var(--text-primary)]">Nueva comunidad</h2>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del grupo"
            maxLength={80}
            className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)]"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] resize-none"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
          >
            <option value="general">General</option>
            <option value="carrera">Carrera</option>
            <option value="materia">Materia</option>
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !nombre.trim()}
            className="w-full h-10 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[var(--brand-hover)] transition-colors"
          >
            {submitting ? 'Creando…' : 'Crear comunidad'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const [groups, setGroups]     = useState<Group[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | 'mine'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGroups(await groupService.getGroups());
    } catch {
      setError('No se pudieron cargar las comunidades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleJoinToggle(toggled: Group) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === toggled.id
          ? {
              ...g,
              isMember: !g.isMember,
              memberCount: g.isMember ? g.memberCount - 1 : g.memberCount + 1,
              myRole: g.isMember ? null : 'member',
            }
          : g,
      ),
    );
  }

  function handleCreate(group: Group) {
    setGroups((prev) => [group, ...prev]);
    setShowCreate(false);
  }

  const displayed = filter === 'mine' ? groups.filter((g) => g.isMember) : groups;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Comunidades</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Grupos de la comunidad TESVG</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
          Nueva
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--bg-elevated)] p-1 rounded-xl w-fit">
        {(['all', 'mine'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {f === 'all' ? 'Todas' : 'Mis comunidades'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--bg-elevated)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-[var(--brand)] hover:underline">Reintentar</button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {filter === 'mine' ? 'No te has unido a ninguna comunidad' : 'No hay comunidades aún'}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {filter === 'mine' ? 'Explora y únete a grupos de tu campus.' : 'Sé el primero en crear una.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((g) => (
            <GroupCard key={g.id} group={g} onJoinToggle={handleJoinToggle} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
