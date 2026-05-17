'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { timeAgo } from '@/lib/utils';

interface Evento {
  id: number;
  titulo: string;
  descripcion?: string;
  lugar?: string;
  tipo?: string;
  fechaEvento: string;
  creadorId: number;
  creadorNombre?: string;
  fecha: string;
}

const TIPO_OPTS = ['Académico', 'Cultural', 'Deportivo', 'Social', 'Institucional', 'Otro'];

function daysUntil(dateStr: string): number {
  const now   = new Date();
  const event = new Date(dateStr);
  now.setHours(0, 0, 0, 0);
  event.setHours(0, 0, 0, 0);
  return Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc]     = useState('');
  const [lugar, setLugar]   = useState('');
  const [tipo, setTipo]     = useState('');
  const [fecha, setFecha]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !fecha) { setError('Título y fecha son requeridos.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/eventos', { titulo: titulo.trim(), descripcion: desc.trim() || undefined, lugar: lugar.trim() || undefined, tipo: tipo || undefined, fechaEvento: fecha });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el evento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Nuevo evento</h2>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título del evento *" maxLength={150}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción (opcional)" rows={3} maxLength={500}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] focus:outline-none">
                <option value="">Sin tipo</option>
                {TIPO_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <input value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Lugar (opcional)" maxLength={120}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 h-9 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors">
              {loading ? 'Creando…' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventosPage() {
  const { user } = useAuth();
  const [eventos, setEventos]   = useState<Evento[]>([]);
  const [loading, setLoading]   = useState(true);
  const [createOpen, setCreate] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AUTORIDAD' || user?.role === 'DIRECCION';

  const load = async () => {
    setLoading(true);
    try { setEventos(await api.get<Evento[]>('/eventos')); }
    catch { setEventos([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este evento?')) return;
    await api.delete(`/eventos/${id}`).catch(() => {});
    setEventos((p) => p.filter((e) => e.id !== id));
  }

  const upcoming = eventos.filter((e) => daysUntil(e.fechaEvento) >= 0);
  const past     = eventos.filter((e) => daysUntil(e.fechaEvento) < 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Eventos</h1>
        {isAdmin && (
          <button onClick={() => setCreate(true)}
            className="h-9 px-4 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] transition-colors">
            + Nuevo evento
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : eventos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 select-none">📅</div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Sin eventos próximos</p>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map((ev) => {
                  const days = daysUntil(ev.fechaEvento);
                  return (
                    <div key={ev.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4 flex gap-4">
                      {/* Date badge */}
                      <div className="flex flex-col items-center justify-center size-14 rounded-2xl bg-[var(--brand-muted)] border border-[var(--brand)] shrink-0">
                        <span className="text-[10px] font-bold text-[var(--brand)] uppercase">
                          {new Date(ev.fechaEvento).toLocaleDateString('es-MX', { month: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-[var(--brand)] leading-none">
                          {new Date(ev.fechaEvento).getDate()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{ev.titulo}</p>
                          {isAdmin && (
                            <button onClick={() => handleDelete(ev.id)} className="size-7 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors shrink-0">
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round"/></svg>
                            </button>
                          )}
                        </div>
                        {ev.descripcion && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{ev.descripcion}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {ev.lugar && (
                            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {ev.lugar}
                            </span>
                          )}
                          {ev.tipo && <span className="text-[10px] font-medium text-[var(--brand)] bg-[var(--brand-muted)] rounded-full px-2 py-0.5">{ev.tipo}</span>}
                          <span className="text-xs text-[var(--text-muted)] ml-auto">
                            {days === 0 ? '¡Hoy!' : days === 1 ? 'Mañana' : `En ${days} días`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Pasados</h2>
              <div className="space-y-2">
                {past.map((ev) => (
                  <div key={ev.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-3 flex items-center gap-3 opacity-60">
                    <div className="size-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-lg shrink-0">📅</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{ev.titulo}</p>
                      <time className="text-xs text-[var(--text-muted)]">{formatDate(ev.fechaEvento)}</time>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(ev.id)} className="size-7 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {createOpen && (
        <CreateEventModal onClose={() => setCreate(false)} onCreated={() => { setCreate(false); load(); }} />
      )}
    </div>
  );
}
