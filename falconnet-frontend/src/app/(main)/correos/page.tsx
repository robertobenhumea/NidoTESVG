'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { timeAgo, resolveUrl } from '@/lib/utils';

/* ── Types ── */
interface CorreoItem {
  id: number;
  emisorId: number;
  emisorNombre?: string;
  emisorFoto?: string;
  destinatarioNombres?: string[];
  asunto: string;
  cuerpo?: string;
  fecha: string;
  leido?: boolean;
  esFavorito?: boolean;
  enPapelera?: boolean;
}

interface BUser { id: number; username: string; fotoPerfil?: string; }

/* ── Icons ── */
function IcCompose() {
  return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IcStar({ filled }: { filled?: boolean }) {
  return <svg className="size-4" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : 'currentColor'} strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IcTrash() {
  return <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round"/><path d="M10 11v6M14 11v6" strokeLinecap="round"/></svg>;
}
function IcInbox() {
  return <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IcSend() {
  return <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}

type Tab = 'entrada' | 'enviados' | 'favoritos';

/* ── Compose modal ── */
function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [users, setUsers]         = useState<BUser[]>([]);
  const [toSearch, setToSearch]   = useState('');
  const [selectedTo, setSelectedTo] = useState<BUser[]>([]);
  const [asunto, setAsunto]       = useState('');
  const [cuerpo, setCuerpo]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get<BUser[]>('/usuarios').then(setUsers).catch(() => {});
  }, []);

  const filteredUsers = toSearch.trim().length > 0
    ? users.filter((u) =>
        u.username.toLowerCase().includes(toSearch.toLowerCase()) &&
        !selectedTo.find((s) => s.id === u.id)
      ).slice(0, 6)
    : [];

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!asunto.trim() || !cuerpo.trim()) { setError('Asunto y cuerpo son requeridos.'); return; }
    if (selectedTo.length === 0) { setError('Selecciona al menos un destinatario.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/correos/enviar', { asunto: asunto.trim(), cuerpo: cuerpo.trim(), receptorIds: selectedTo.map((u) => u.id) });
      onSent();
    } catch {
      setError('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Nuevo mensaje</h2>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSend} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* To field */}
          <div className="border border-[var(--border)] rounded-xl px-3 py-2">
            <div className="flex flex-wrap gap-1.5 mb-1">
              {selectedTo.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand)] text-xs font-medium">
                  {u.username}
                  <button type="button" onClick={() => setSelectedTo((p) => p.filter((x) => x.id !== u.id))} className="hover:opacity-70">×</button>
                </span>
              ))}
              <input
                value={toSearch}
                onChange={(e) => setToSearch(e.target.value)}
                placeholder={selectedTo.length === 0 ? 'Para: busca un usuario…' : ''}
                className="flex-1 min-w-[120px] text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
            {filteredUsers.length > 0 && (
              <div className="border-t border-[var(--border)] pt-1 space-y-0.5 max-h-36 overflow-y-auto">
                {filteredUsers.map((u) => (
                  <button key={u.id} type="button" onClick={() => { setSelectedTo((p) => [...p, u]); setToSearch(''); }}
                    className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-left transition-colors">
                    <Avatar src={resolveUrl(u.fotoPerfil)} name={u.username} size="xs" />
                    <span className="text-sm text-[var(--text-primary)]">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Asunto"
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <textarea
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            placeholder="Escribe tu mensaje…"
            rows={6}
            maxLength={5000}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-9 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors">
              {loading ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Message detail ── */
function MessageDetail({ msg, tab, onClose, onFavorite, onTrash }: {
  msg: CorreoItem; tab: Tab; onClose: () => void;
  onFavorite: (id: number) => void; onTrash: (id: number) => void;
}) {
  const isInbox = tab === 'entrada';
  const name = isInbox ? (msg.emisorNombre ?? `#${msg.emisorId}`) : (msg.destinatarioNombres?.join(', ') ?? '…');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] shrink-0">
        <button onClick={onClose} className="size-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2 className="flex-1 text-sm font-semibold text-[var(--text-primary)] truncate">{msg.asunto}</h2>
        <button onClick={() => onFavorite(msg.id)} aria-label="Favorito" className="size-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-elevated)] transition-colors">
          <IcStar filled={msg.esFavorito} />
        </button>
        {isInbox && (
          <button onClick={() => onTrash(msg.id)} aria-label="Papelera" className="size-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors">
            <IcTrash />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-3 mb-4">
          <Avatar src={isInbox ? resolveUrl(msg.emisorFoto) : undefined} name={name} size="md" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{name}</p>
            <time className="text-xs text-[var(--text-muted)]">{timeAgo(msg.fecha)}</time>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">
          {msg.cuerpo ?? '(Sin contenido)'}
        </p>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function CorreosPage() {
  const [tab, setTab]           = useState<Tab>('entrada');
  const [items, setItems]       = useState<CorreoItem[]>([]);
  const [selected, setSelected] = useState<CorreoItem | null>(null);
  const [loading, setLoading]   = useState(true);
  const [compose, setCompose]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    try {
      const path = tab === 'entrada' ? '/correos/entrada' : tab === 'enviados' ? '/correos/enviados' : '/correos/favoritos';
      const data = await api.get<CorreoItem[]>(path);
      setItems(data);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function openMessage(msg: CorreoItem) {
    setSelected(msg);
    if (tab === 'entrada' && !msg.leido) {
      api.put(`/correos/${msg.id}/leer`).catch(() => {});
      setItems((p) => p.map((m) => m.id === msg.id ? { ...m, leido: true } : m));
    }
  }

  async function handleFavorite(id: number) {
    await api.put(`/correos/${id}/favorito`).catch(() => {});
    setItems((p) => p.map((m) => m.id === id ? { ...m, esFavorito: !m.esFavorito } : m));
    if (selected?.id === id) setSelected((s) => s ? { ...s, esFavorito: !s.esFavorito } : s);
    if (tab === 'favoritos') setItems((p) => p.filter((m) => m.id !== id));
  }

  async function handleTrash(id: number) {
    await api.put(`/correos/${id}/papelera`).catch(() => {});
    setItems((p) => p.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'entrada',   label: 'Entrada',   icon: <IcInbox /> },
    { key: 'enviados',  label: 'Enviados',  icon: <IcSend /> },
    { key: 'favoritos', label: 'Favoritos', icon: <IcStar filled /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Correo institucional</h1>
        <button
          onClick={() => setCompose(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors"
        >
          <IcCompose />
          <span className="hidden sm:inline">Redactar</span>
        </button>
      </div>

      <div className="flex gap-3 h-[calc(100dvh-160px)]">
        {/* Sidebar — message list */}
        <div className={`flex flex-col ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 shrink-0`}>
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] mb-2 shrink-0">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.key ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded-full bg-[var(--bg-elevated)]" />
                  <div className="h-3 w-1/2 rounded-full bg-[var(--bg-elevated)]" />
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-[var(--text-muted)]">Sin mensajes</p>
              </div>
            ) : items.map((msg) => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selected?.id === msg.id
                    ? 'bg-[var(--brand-muted)] border-[var(--brand)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm truncate ${!msg.leido && tab === 'entrada' ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
                    {tab === 'enviados'
                      ? (msg.destinatarioNombres?.join(', ') ?? '…')
                      : (msg.emisorNombre ?? `#${msg.emisorId}`)
                    }
                  </p>
                  {!msg.leido && tab === 'entrada' && (
                    <span className="size-2 rounded-full bg-[var(--brand)] shrink-0 mt-1.5" />
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${!msg.leido && tab === 'entrada' ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                  {msg.asunto}
                </p>
                <time className="text-[10px] text-[var(--text-muted)] mt-0.5 block">{timeAgo(msg.fecha)}</time>
              </button>
            ))}
          </div>
        </div>

        {/* Detail pane */}
        <div className={`flex-1 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden ${!selected ? 'hidden md:flex md:items-center md:justify-center' : 'flex flex-col'}`}>
          {selected ? (
            <MessageDetail
              msg={selected}
              tab={tab}
              onClose={() => setSelected(null)}
              onFavorite={handleFavorite}
              onTrash={handleTrash}
            />
          ) : (
            <div className="text-center py-12 px-6">
              <div className="text-4xl mb-3 select-none">✉️</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Selecciona un mensaje</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Toca un correo para leerlo</p>
            </div>
          )}
        </div>
      </div>

      {compose && (
        <ComposeModal
          onClose={() => setCompose(false)}
          onSent={() => { setCompose(false); if (tab === 'enviados') load(); }}
        />
      )}
    </div>
  );
}
