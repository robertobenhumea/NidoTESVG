'use client';

import { useEffect, useState } from 'react';
import { Search, Send, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { groupChatService } from '@/services/groupChat.service';
import { searchService } from '@/services/search.service';
import type { ChatGroup, SearchUser } from '@/types';

export function ForwardMessageModal({
  onClose,
  onForwardUser,
  onForwardGroup,
}: {
  onClose: () => void;
  onForwardUser: (userId: number) => Promise<void>;
  onForwardGroup: (groupId: number) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [sendingKey, setSendingKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    groupChatService.getGroups()
      .then(items => { if (!cancelled) setGroups(items); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setUsers([]);
        return;
      }
      try {
        const found = await searchService.search(q);
        setUsers(found.users.slice(0, 8));
      } catch {
        setUsers([]);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [query]);

  async function run(key: string, action: () => Promise<void>) {
    setSendingKey(key);
    setError('');
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el mensaje.');
    } finally {
      setSendingKey('');
    }
  }

  const q = query.trim().toLowerCase();
  const visibleGroups = q
    ? groups.filter(group => group.nombre.toLowerCase().includes(q)).slice(0, 8)
    : groups.slice(0, 8);

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[82dvh] w-full overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Reenviar mensaje</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--bg-elevated)]" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-[var(--border)] p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar usuario o grupo"
              className="h-10 w-full rounded-xl border border-transparent bg-[var(--bg-elevated)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
              autoFocus
            />
          </div>
          {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-2">
          {users.length > 0 && (
            <section className="mb-2">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Usuarios</p>
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => void run(`u-${user.id}`, () => onForwardUser(user.id))}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[var(--bg-elevated)]"
                >
                  <Avatar src={user.avatarUrl} name={user.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.username}</p>
                    {user.career && <p className="truncate text-xs text-[var(--text-muted)]">{user.career}</p>}
                  </div>
                  {sendingKey === `u-${user.id}` ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="size-4 text-[var(--brand)]" />}
                </button>
              ))}
            </section>
          )}

          <section>
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Grupos</p>
            {visibleGroups.length === 0 ? (
              <p className="px-2 py-5 text-center text-xs text-[var(--text-muted)]">Sin grupos disponibles.</p>
            ) : visibleGroups.map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => void run(`g-${group.id}`, () => onForwardGroup(group.id))}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[var(--bg-elevated)]"
              >
                <span className="relative shrink-0">
                  <Avatar src={group.foto} name={group.nombre} size="sm" />
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-[var(--bg-surface)] bg-[var(--brand)] text-white">
                    <Users className="size-3" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{group.nombre}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{group.tipo}</p>
                </div>
                {sendingKey === `g-${group.id}` ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="size-4 text-[var(--brand)]" />}
              </button>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
