'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { chatService } from '@/services/chat.service';
import { groupChatService } from '@/services/groupChat.service';
import { searchService } from '@/services/search.service';
import type { ChatGroup, Conversation, SearchUser } from '@/types';

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="size-12 rounded-full bg-[var(--bg-elevated)] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-28 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-2.5 w-8 rounded-full bg-[var(--bg-elevated)]" />
        </div>
        <div className="h-2.5 w-40 rounded-full bg-[var(--bg-elevated)]" />
      </div>
    </div>
  );
}

interface ConvRowProps {
  conv: Conversation;
  active: boolean;
  onlineIds: Set<number>;
}

function ConvRow({ conv, active, onlineIds }: ConvRowProps) {
  const isOnline = onlineIds.has(conv.partnerId);
  const hasUnread = conv.unreadCount > 0;

  const lastPreview = conv.isMine
    ? `Tú: ${conv.lastMessage ?? ''}`
    : conv.lastMessage ?? '';

  return (
    <Link
      href={`/messages/${conv.partnerId}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors duration-100 ${
        active
          ? 'bg-[var(--brand-muted)]'
          : 'hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]'
      }`}
    >
      {/* Avatar + online dot */}
      <div className="relative shrink-0">
        <Avatar src={conv.partnerAvatar} name={conv.partnerName} size="md" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-surface)]" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate ${hasUnread ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
            {conv.partnerName}
          </p>
          {conv.updatedAt && (
            <span className={`text-[11px] shrink-0 tabular-nums ${hasUnread ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-muted)]'}`}>
              {timeAgo(conv.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${hasUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {lastPreview}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

interface ConvListProps {
  activePartnerId?: number;
  activeGroupId?: number;
  className?: string;
  onlineIds?: Set<number>;
}

function GroupRow({ group, active }: { group: ChatGroup; active: boolean }) {
  const hasUnread = group.noLeidos > 0;
  const lastDateLabel = group.lastDate ? timeAgo(group.lastDate) : '';
  const lastMessage = group.lastMessage?.trim()
    ? `${group.lastSender ? `${group.lastSender}: ` : ''}${group.lastMessage}`
    : 'Sin mensajes todavía';
  return (
    <Link
      href={`/messages/groups/${group.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors duration-100 ${
        active ? 'bg-[var(--brand-muted)]' : 'hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar src={group.foto} name={group.nombre} size="md" />
        <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-[var(--bg-surface)] bg-[var(--brand)] text-white">
          <Users className="size-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${hasUnread ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
            {group.nombre}
          </p>
          {lastDateLabel && <span className={`shrink-0 text-[11px] tabular-nums ${hasUnread ? 'font-semibold text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>{lastDateLabel}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${hasUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {lastMessage}
          </p>
          {hasUnread && <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">{group.noLeidos > 99 ? '99+' : group.noLeidos}</span>}
        </div>
      </div>
    </Link>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PUBLICO' | 'PRIVADO' | 'INVITE'>('PRIVADO');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (query.trim().length < 2) return setResults([]);
      const found = await searchService.search(query.trim());
      const selectedIds = new Set(selected.map(u => u.id));
      setResults(found.users.filter(u => !selectedIds.has(u.id)).slice(0, 8));
    }, 250);
    return () => clearTimeout(id);
  }, [query, selected]);

  async function create() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const created = await groupChatService.createGroup({
        nombre: name.trim(),
        descripcion: description.trim(),
        foto: photo,
        tipo: type,
        miembros: selected.map(u => u.id),
      });
      onCreated();
      onClose();
      router.push(`/messages/groups/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Nuevo grupo</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--bg-elevated)]"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <Avatar src={photo} name={name || 'Grupo'} size="lg" />
            <label className="h-9 cursor-pointer rounded-xl bg-[var(--bg-surface)] px-3 text-xs font-bold leading-9 text-[var(--text-primary)]">
              Foto del grupo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await groupChatService.uploadGroupPhoto(file);
                  setPhoto(url);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del grupo" maxLength={100} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--border-focus)]" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción" maxLength={600} className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]" />
          <div className="grid grid-cols-3 gap-2">
            {(['PRIVADO', 'PUBLICO', 'INVITE'] as const).map(option => (
              <button key={option} onClick={() => setType(option)} className={`h-10 rounded-xl border text-xs font-bold ${type === option ? 'border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                {option === 'PUBLICO' ? 'Público' : option === 'INVITE' ? 'Invitación' : 'Privado'}
              </button>
            ))}
          </div>
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar miembros" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-3 text-sm outline-none focus:border-[var(--border-focus)]" />
            </div>
            {results.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)]">
                {results.map(u => (
                  <button key={u.id} onClick={() => { setSelected(prev => [...prev, u]); setQuery(''); setResults([]); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-elevated)]">
                    <Avatar src={u.avatarUrl} name={u.username} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{u.username}</span>
                    <Plus className="size-4 text-[var(--brand)]" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <button key={u.id} onClick={() => setSelected(prev => prev.filter(x => x.id !== u.id))} className="flex items-center gap-1 rounded-full bg-[var(--brand-muted)] py-1 pl-1 pr-2 text-xs font-semibold text-[var(--brand)]">
                  <Avatar src={u.avatarUrl} name={u.username} size="xs" />
                  {u.username}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}
          <button onClick={create} disabled={!name.trim() || saving} className="h-11 w-full rounded-xl bg-[var(--brand)] text-sm font-bold text-white disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)]">
            {saving ? 'Creando...' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConvList({ activePartnerId, activeGroupId, className = '', onlineIds = new Set() }: ConvListProps) {
  const [convs, setConvs]     = useState<Conversation[]>([]);
  const [groups, setGroups]   = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [tab, setTab]         = useState<'chats' | 'groups'>(activeGroupId ? 'groups' : 'chats');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, groupData] = await Promise.all([
        chatService.getConversations(),
        groupChatService.getGroups(),
      ]);
      setConvs(data);
      setGroups(groupData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void load(); }, 0);
    const id = setInterval(load, 15_000);
    return () => {
      window.clearTimeout(firstLoad);
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    if (!activeGroupId) return;
    const id = window.setTimeout(() => setTab('groups'), 0);
    return () => window.clearTimeout(id);
  }, [activeGroupId]);

  const filtered = query.trim()
    ? convs.filter(c => c.partnerName.toLowerCase().includes(query.toLowerCase()))
    : convs;
  const filteredGroups = query.trim()
    ? groups.filter(g => g.nombre.toLowerCase().includes(query.toLowerCase()) || (g.descripcion ?? '').toLowerCase().includes(query.toLowerCase()))
    : groups;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Mensajes</h1>
          <button onClick={() => setCreating(true)} className="grid size-8 place-items-center rounded-full bg-[var(--brand)] text-white shadow-sm" aria-label="Crear grupo">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mb-3 grid grid-cols-2 rounded-xl bg-[var(--bg-elevated)] p-1">
          <button onClick={() => setTab('chats')} className={`h-8 rounded-lg text-xs font-bold transition ${tab === 'chats' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>Chats</button>
          <button onClick={() => setTab('groups')} className={`h-8 rounded-lg text-xs font-bold transition ${tab === 'groups' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>Grupos</button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'groups' ? 'Buscar grupos...' : 'Buscar conversaciones...'}
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-transparent focus:border-[var(--border-focus)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="h-px bg-[var(--border)] shrink-0" />

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <ConvSkeleton key={i} />)
        ) : tab === 'groups' ? (
          filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Users className="mb-3 size-12 text-[var(--text-muted)] opacity-40" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">{query.trim() ? 'Sin resultados' : 'Sin grupos'}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Crea un grupo para clases, equipos o proyectos.</p>
            </div>
          ) : filteredGroups.map(g => <GroupRow key={g.id} group={g} active={g.id === activeGroupId} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <svg className="size-12 text-[var(--text-muted)] mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {query.trim() ? 'Sin resultados' : 'Sin conversaciones'}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              {query.trim() ? 'Intenta con otro nombre' : 'Visita el perfil de alguien para iniciar un chat'}
            </p>
          </div>
        ) : (
          filtered.map(c => (
            <ConvRow
              key={c.partnerId}
              conv={c}
              active={c.partnerId === activePartnerId}
              onlineIds={onlineIds}
            />
          ))
        )}
      </div>
      {creating && <CreateGroupModal onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  );
}
