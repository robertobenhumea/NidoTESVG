'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/services/api';
import { STORAGE_KEYS } from '@/lib/utils';
import type { BUser } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const MAX_ATTACHMENTS = 6;
const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ACADEMICO', label: 'Académico' },
  { value: 'EQUIPOS', label: 'Equipos' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'EVENTOS', label: 'Eventos' },
  { value: 'INSTITUCIONAL', label: 'Institucional' },
  { value: 'IMPORTANTE', label: 'Importante' },
];

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

interface ComposeModalProps {
  onClose:        () => void;
  onSent:         () => void;
  initialTo?:     BUser[];
  initialSubject?: string;
}

export function ComposeModal({ onClose, onSent, initialTo, initialSubject }: ComposeModalProps) {
  const [users, setUsers]           = useState<BUser[]>([]);
  const [toSearch, setToSearch]     = useState('');
  const [selectedTo, setSelectedTo] = useState<BUser[]>(initialTo ?? []);
  const [asunto, setAsunto]         = useState(initialSubject ?? '');
  const [cuerpo, setCuerpo]         = useState('');
  const [categoria, setCategoria]   = useState('GENERAL');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [progress, setProgress]     = useState<Record<string, number>>({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [sent, setSent]             = useState(false);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const searchRef                   = useRef<HTMLInputElement>(null);

  function userLabel(user: BUser): string {
    return user.username || user.correo?.split('@')[0] || `Usuario #${user.id}`;
  }

  function formatSize(size: number): string {
    if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList).slice(0, MAX_ATTACHMENTS - attachments.length);
    setAttachments(prev => [...prev, ...next]);
  }

  function uploadAttachment(correoId: number, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('archivo', file);
      xhr.open('POST', `${BASE_URL}/correos/${correoId}/adjunto`);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setProgress(prev => ({ ...prev, [file.name]: Math.round((event.loaded / event.total) * 100) }));
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('upload failed'));
      xhr.onerror = () => reject(new Error('upload failed'));
      xhr.send(form);
    });
  }

  useEffect(() => {
    api.get<BUser[]>('/usuarios').then(data => setUsers(data.filter(u => u.activo !== false))).catch(() => {});
    const focusTarget = initialTo?.length ? textareaRef : searchRef;
    setTimeout(() => focusTarget.current?.focus(), 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 260) + 'px';
  }, [cuerpo]);

  const filteredUsers = toSearch.trim().length > 0
    ? users
        .filter(u =>
          `${u.username ?? ''} ${u.correo ?? ''}`.toLowerCase().includes(toSearch.toLowerCase()) &&
          !selectedTo.find(s => s.id === u.id)
        )
        .slice(0, 5)
    : [];

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedTo.length) { setError('Agrega al menos un destinatario.'); return; }
    if (!asunto.trim())     { setError('El asunto es requerido.'); return; }
    if (!cuerpo.trim())     { setError('Escribe el cuerpo del mensaje.'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await api.post<{ id: number }>('/correos/enviar', {
        asunto:      asunto.trim(),
        cuerpo:      cuerpo.trim(),
        receptorIds: selectedTo.map(u => u.id),
        categoria,
        tipo: categoria === 'ACADEMICO' ? 'ACADEMICO' : categoria === 'INSTITUCIONAL' ? 'INSTITUCIONAL' : 'PERSONAL',
      });
      for (const file of attachments) {
        await uploadAttachment(response.id, file);
      }
      setSent(true);
      setTimeout(onSent, 900);
    } catch {
      setError('Error al enviar. Intenta de nuevo.');
      setLoading(false);
    }
  }

  const canSend = !loading && selectedTo.length > 0 && asunto.trim() && cuerpo.trim();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-xl bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
            {initialTo?.length ? 'Responder mensaje' : 'Nuevo mensaje'}
          </h2>
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Cerrar"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sent success */}
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-14 animate-fade-in">
            <div className="size-14 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
              <svg className="size-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">¡Mensaje enviado!</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Puedes verlo en Enviados</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Para */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)] pt-1 shrink-0 w-9 select-none">Para</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                    {selectedTo.map(u => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand-text)] text-xs font-medium max-w-[180px]"
                      >
                        <Avatar src={resolveUrl(u.fotoPerfil)} name={userLabel(u)} size="xs" />
                        <span className="truncate">{userLabel(u)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTo(p => p.filter(x => x.id !== u.id))}
                          className="ml-0.5 size-3.5 flex items-center justify-center rounded-full hover:bg-[var(--brand)] hover:text-white transition-colors shrink-0"
                          aria-label={`Quitar ${userLabel(u)}`}
                        >
                          <svg className="size-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input
                      ref={searchRef}
                      value={toSearch}
                      onChange={e => setToSearch(e.target.value)}
                      placeholder={selectedTo.length === 0 ? 'Busca un usuario…' : ''}
                      className="flex-1 min-w-[100px] text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none py-0.5"
                    />
                  </div>
                </div>

                {/* Autocomplete dropdown */}
                {filteredUsers.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden shadow-md">
                    {filteredUsers.map((u, i) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedTo(p => [...p, u]); setToSearch(''); searchRef.current?.focus(); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--bg-hover)] text-left transition-colors ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
                      >
                        <Avatar src={resolveUrl(u.fotoPerfil)} name={userLabel(u)} size="xs" />
                        <span className="text-sm text-[var(--text-primary)]">{userLabel(u)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Asunto */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)] shrink-0 w-9 select-none">Asunto</span>
                  <input
                    value={asunto}
                    onChange={e => setAsunto(e.target.value)}
                    placeholder="Asunto del mensaje"
                    maxLength={200}
                    className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)] shrink-0 w-16 select-none">Categoría</span>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="flex-1 text-sm bg-transparent text-[var(--text-primary)] focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="px-4 pt-3 pb-2">
                <textarea
                  ref={textareaRef}
                  value={cuerpo}
                  onChange={e => setCuerpo(e.target.value)}
                  placeholder="Escribe tu mensaje aquí…"
                  maxLength={5000}
                  style={{ minHeight: 140, resize: 'none' }}
                  className="w-full text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none leading-relaxed"
                />
                <p className="text-[10px] text-[var(--text-muted)] text-right mt-1 tabular-nums">
                  {cuerpo.length} / 5000
                </p>
              </div>

              {/* Adjuntos */}
              <div
                className="mx-4 mb-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/70 px-3 py-3"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Archivos</p>
                    <p className="text-[11px] text-[var(--text-muted)]">PDF, Office, imágenes, ZIP y video ligero</p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] inline-flex items-center cursor-pointer">
                    Adjuntar
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip,.mp4,.mov,.webm"
                      onChange={e => { addFiles(e.target.files); e.currentTarget.value = ''; }}
                    />
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map(file => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] px-2 py-2">
                        <span className="size-8 rounded-lg bg-[var(--brand-muted)] text-[var(--brand)] flex items-center justify-center text-xs font-bold shrink-0">
                          {file.name.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'FILE'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{formatSize(file.size)}</p>
                          {progress[file.name] != null && (
                            <div className="mt-1 h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                              <div className="h-full bg-[var(--brand)]" style={{ width: `${progress[file.name]}%` }} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter(f => f !== file))}
                          className="size-7 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                          aria-label="Quitar archivo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-2 shrink-0 bg-[var(--bg-surface)]"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <div className="min-w-0">
                {error && (
                  <p className="text-xs text-[var(--error)] truncate">{error}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSend}
                  className="h-8 px-4 rounded-xl bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {loading ? (
                    <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                  {loading ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
