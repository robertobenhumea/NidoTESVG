'use client';

import { useState, useMemo } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn, getStoredAuthToken } from '@/lib/utils';
import { mailFullDate, mailTimeAgo, mailThreadTime } from './mailDate';
import { api } from '@/services/api';
import {
  MailAttachmentViewer,
  SecureMailThumbnail,
  isMailImage,
  isMailPdf,
  type MailViewerItem,
} from './MailAttachmentViewer';
import type { CorreoAdjuntoItem, CorreoItem, Tab, ThreadMessage, UsuarioInstitucional } from './types';

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/* ─── Helpers ─── */
function rolLabel(rol?: string): string {
  const map: Record<string, string> = {
    ESTUDIANTE: 'Estudiante', DOCENTE: 'Docente', AUTORIDAD: 'Coordinación',
    ADMINISTRATIVO: 'Administrativo', PERSONAL: 'Personal', ADMIN: 'Administrador', DIRECCION: 'Dirección',
  };
  return (rol ? map[rol.toUpperCase()] : null) ?? rol ?? 'Estudiante';
}

function isPrivilegedRole(rol?: string): boolean {
  return ['AUTORIDAD', 'ADMIN', 'DIRECCION'].includes(rol?.toUpperCase() ?? '');
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function adjuntoToViewerItem(a: CorreoAdjuntoItem): MailViewerItem {
  return { downloadUrl: a.downloadUrl, nombreArchivo: a.nombreArchivo, tipoArchivo: a.tipoArchivo, tamanio: a.tamanio };
}

/* ─── Secure download XHR ─── */
function downloadSecure(downloadUrl: string, fileName: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
    const url = downloadUrl.startsWith('http') ? downloadUrl : `${base}${downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`}`;
    xhr.open('GET', url);
    const token = getStoredAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'blob';
    xhr.onprogress = ev => { if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        const objectUrl = URL.createObjectURL(xhr.response as Blob);
        const a = document.createElement('a');
        a.href = objectUrl; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
        resolve();
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send();
  });
}

/* ─── One labeled info row ─── */
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-0.5">{label}</p>
      <p className={cn('text-xs text-[var(--text-primary)] truncate', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

/* ─── Institutional identity card ─── */
function IdentityCard({ user, fallbackName, isInbox, avatarSrc }: { user?: UsuarioInstitucional; fallbackName: string; isInbox: boolean; avatarSrc?: string }) {
  const name     = user?.nombre ?? fallbackName;
  const role     = rolLabel(user?.rolLabel ?? user?.rol);
  const elevated = isPrivilegedRole(user?.rol);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 overflow-hidden mb-6">
      <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em]">{isInbox ? 'Remitente' : 'Destinatario'}</p>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar src={avatarSrc} name={name} size="md" />
            {user?.verificadoInstitucional && (
              <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-elevated)] flex items-center justify-center" title="Verificado">
                <svg className="size-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
              {user?.verificadoInstitucional && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide whitespace-nowrap">Verificado</span>
              )}
            </div>
            {user?.correo && <p className="text-[11px] font-mono text-[var(--brand)] truncate">{user.correo}</p>}
            <span className={cn('mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full', elevated ? 'bg-[var(--brand-muted)] text-[var(--brand)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]')}>
              {role}
            </span>
          </div>
        </div>
        {(user?.carrera || user?.grupo || user?.semestre || user?.matricula || user?.numeroControl) && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            {user?.carrera    && <InfoRow label="Carrera" value={user.carrera} />}
            {user?.grupo      && <InfoRow label="Grupo / Semestre" value={user.grupo} />}
            {(user?.matricula ?? user?.numeroControl) && <InfoRow label="No. Control / Matrícula" value={(user?.matricula ?? user?.numeroControl)!} mono />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Attachment card ─── */
function AttachmentCard({
  adjunto,
  onOpenViewer,
}: {
  adjunto: CorreoAdjuntoItem;
  onOpenViewer: (adjunto: CorreoAdjuntoItem) => void;
}) {
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const [dlError, setDlError]       = useState('');

  const ext      = adjunto.nombreArchivo.split('.').pop()?.toUpperCase() ?? 'FILE';
  const isImage  = isMailImage(adjunto.nombreArchivo, adjunto.tipoArchivo);
  const isPdf    = isMailPdf(adjunto.nombreArchivo, adjunto.tipoArchivo);
  const canView  = isImage || isPdf;

  const extColorMap: Record<string, string> = {
    PDF: 'bg-red-500/10 text-red-600 dark:text-red-400',
    DOC: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', DOCX: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    XLS: 'bg-green-500/10 text-green-600 dark:text-green-400', XLSX: 'bg-green-500/10 text-green-600 dark:text-green-400',
    PPT: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', PPTX: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    TXT: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
    ZIP: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    PNG: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', JPG: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    JPEG: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', WEBP: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    GIF: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    MP4: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', MOV: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  const extColor = extColorMap[ext] ?? 'bg-[var(--brand-muted)] text-[var(--brand)]';
  const downloading = dlProgress !== null && dlProgress < 100;

  async function handleDownload() {
    if (downloading) return;
    setDlError('');
    setDlProgress(0);
    try {
      await downloadSecure(adjunto.downloadUrl, adjunto.nombreArchivo, setDlProgress);
    } catch {
      setDlError('Error al descargar');
      setTimeout(() => setDlError(''), 3000);
    } finally {
      setTimeout(() => setDlProgress(null), 1500);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--border-strong)] transition-colors group">
      {/* Image thumbnail row */}
      {isImage && (
        <button
          type="button"
          onClick={() => onOpenViewer(adjunto)}
          className="block w-full overflow-hidden bg-[var(--bg-base)] border-b border-[var(--border)]"
          aria-label={`Ver imagen: ${adjunto.nombreArchivo}`}
        >
          <SecureMailThumbnail
            downloadUrl={adjunto.downloadUrl}
            alt={adjunto.nombreArchivo}
            className="w-full max-h-48 object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </button>
      )}

      {/* File info row */}
      <div className="flex items-center gap-3 p-2.5">
        {/* Icon */}
        <span className={cn('size-12 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0', extColor)}>
          {isImage ? (
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          ) : (
            ext.slice(0, 4)
          )}
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{adjunto.nombreArchivo}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {adjunto.tipoArchivo?.split('/')[1]?.toUpperCase() ?? ext}
            {adjunto.tamanio ? ` · ${formatSize(adjunto.tamanio)}` : ''}
          </p>
          {/* Download progress bar */}
          {dlProgress !== null && (
            <div className="mt-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-base)]">
                <div
                  className={`h-full transition-all duration-150 ${dlProgress === 100 ? 'bg-emerald-500' : 'bg-[var(--brand)]'}`}
                  style={{ width: `${dlProgress}%` }}
                />
              </div>
              <p className={`mt-0.5 text-[10px] font-medium ${dlProgress === 100 ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>
                {dlProgress === 100 ? '✓ Descargado' : `Descargando… ${dlProgress}%`}
              </p>
            </div>
          )}
          {dlError && <p className="mt-1 text-[10px] text-red-500">{dlError}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canView && (
            <button
              type="button"
              onClick={() => onOpenViewer(adjunto)}
              className="h-7 px-2 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              title={isPdf ? 'Vista previa PDF' : 'Ver imagen'}
            >
              {isPdf ? (
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              <span className="hidden sm:inline">{isPdf ? 'Ver' : 'Zoom'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-muted)] transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Descargar"
          >
            {downloading ? (
              <><svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <span className="hidden sm:inline tabular-nums">{dlProgress}%</span></>
            ) : (
              <><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg><span className="hidden sm:inline">Descargar</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Star icon ─── */
function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : 'currentColor'} strokeWidth={2}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function tipoAccionLabel(tipo?: string): string {
  if (tipo === 'RESPUESTA')       return 'Respuesta';
  if (tipo === 'RESPUESTA_TODOS') return 'Respuesta a todos';
  if (tipo === 'REENVIO')         return 'Reenviado';
  return '';
}

interface MailDetailProps {
  msg:          CorreoItem;
  tab:          Tab;
  onClose:      () => void;
  onFavorite:   (id: number) => void;
  onTrash:      (id: number) => void;
  onReply:      () => void;
  onMarkUnread: () => void;
  onReplyAll:   () => void;
  onForward:    () => void;
}

export function MailDetail({ msg, tab, onClose, onFavorite, onTrash, onReply, onMarkUnread, onReplyAll, onForward }: MailDetailProps) {
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [threadLoading,  setThreadLoading]  = useState(false);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [viewerItem,     setViewerItem]     = useState<MailViewerItem | null>(null);
  const [showAllAttachments, setShowAllAttachments] = useState(false);

  async function loadThread() {
    if (threadLoading) return;
    setThreadLoading(true);
    try {
      const data = await api.get<ThreadMessage[]>(`/correos/${msg.id}/hilo`, { suppressAuthExpiry: true });
      setThreadMessages(data);
      setThreadExpanded(true);
    } catch { /* silent */ }
    finally { setThreadLoading(false); }
  }

  function toggleThread() {
    if (threadExpanded) setThreadExpanded(false);
    else if (threadMessages.length > 0) setThreadExpanded(true);
    else void loadThread();
  }

  /* Collect ALL adjuntos from main message + thread */
  const allAdjuntos = useMemo(() => {
    const main = msg.adjuntos ?? [];
    const thread: CorreoAdjuntoItem[] = threadMessages.flatMap(t => t.adjuntos ?? []);
    const seen = new Set<number>();
    return [...main, ...thread].filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
  }, [msg.adjuntos, threadMessages]);

  /* viewer items array */
  const viewerItems = useMemo<MailViewerItem[]>(() => allAdjuntos.map(adjuntoToViewerItem), [allAdjuntos]);

  function openViewer(adjunto: CorreoAdjuntoItem) {
    setViewerItem(adjuntoToViewerItem(adjunto));
  }

  const isInbox = tab !== 'enviados';
  const isTrash = tab === 'papelera';
  const displayName = isInbox ? (msg.emisorNombre ?? `Usuario #${msg.emisorId}`) : (msg.destinatarioNombres?.join(', ') ?? '—');
  const identity  = isInbox ? msg.emisor : msg.destinatarios?.[0];
  const avatarSrc = isInbox ? resolveUrl(msg.emisorFoto) : resolveUrl(identity?.fotoPerfil);

  const categoriaLabel: Record<string, string> = {
    ACADEMICO: 'Académico', INSTITUCIONAL: 'Institucional', COORDINACION: 'Coordinación',
    TRAMITE: 'Trámite', JUSTIFICANTE: 'Justificante', SOLICITUD: 'Solicitud',
    REPORTE: 'Reporte', AVISO: 'Aviso', DUDA: 'Duda', IMPORTANTE: 'Importante',
    EVENTOS: 'Eventos', EQUIPOS: 'Equipos', MARKETPLACE: 'Marketplace', GENERAL: 'General',
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] animate-fade-in">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors" aria-label="Volver">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div className="flex-1" />

        {msg.categoria && msg.categoria !== 'GENERAL' && (
          <span className="hidden sm:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">
            {categoriaLabel[msg.categoria] ?? msg.categoria}
          </span>
        )}

        {/* Attachment history toggle */}
        {allAdjuntos.length > 0 && (
          <button
            onClick={() => setShowAllAttachments(v => !v)}
            title="Historial de adjuntos"
            className={cn(
              'size-8 flex items-center justify-center rounded-lg transition-colors',
              showAllAttachments ? 'bg-[var(--brand-muted)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
        )}

        <button onClick={() => onFavorite(msg.id)} aria-label={msg.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
          <StarIcon filled={msg.esFavorito} />
        </button>

        {isInbox && !isTrash && msg.leido && (
          <button onClick={onMarkUnread} title="Marcar como no leído"
            className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand)] transition-colors">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 7 13.5 15.5a2.1 2.1 0 0 1-3 0L2 7" /><rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} />
            </svg>
          </button>
        )}

        {isInbox && !isTrash && (
          <button onClick={() => onTrash(msg.id)} aria-label="Mover a papelera"
            className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Attachment History Panel ── */}
      {showAllAttachments && allAdjuntos.length > 0 && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {allAdjuntos.length} adjunto{allAdjuntos.length !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setShowAllAttachments(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cerrar</button>
          </div>
          {/* Image grid */}
          {allAdjuntos.some(a => isMailImage(a.nombreArchivo, a.tipoArchivo)) && (
            <div className="mb-2.5 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {allAdjuntos.filter(a => isMailImage(a.nombreArchivo, a.tipoArchivo)).map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openViewer(a)}
                  className="aspect-square overflow-hidden rounded-lg bg-[var(--bg-base)] hover:ring-2 hover:ring-[var(--brand)] transition-all"
                  title={a.nombreArchivo}
                >
                  <SecureMailThumbnail
                    downloadUrl={a.downloadUrl}
                    alt={a.nombreArchivo}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          {/* Non-image list */}
          {allAdjuntos.filter(a => !isMailImage(a.nombreArchivo, a.tipoArchivo)).length > 0 && (
            <div className="space-y-1.5">
              {allAdjuntos.filter(a => !isMailImage(a.nombreArchivo, a.tipoArchivo)).map(a => (
                <AttachmentCard key={a.id} adjunto={a} onOpenViewer={openViewer} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 sm:px-6 py-6 max-w-2xl mx-auto">

          {/* Priority / tipoAccion / audience badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {msg.prioridad === 'ALTA' && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <svg className="size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 19.5h20L12 2zm0 3l7.5 13.5h-15L12 5z"/></svg>
                Mensaje prioritario
              </div>
            )}
            {msg.tipoAccion && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand)] bg-[var(--brand-muted)] border border-[var(--brand)]/20 px-2.5 py-1 rounded-full">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                {tipoAccionLabel(msg.tipoAccion)}
              </div>
            )}
            {msg.audiencia && msg.audiencia !== 'INDIVIDUAL' && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1 rounded-full">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                {msg.audienciaCarrera ?? 'Todos'}{msg.audienciaGrupo ? ` · ${msg.audienciaGrupo}` : ''}
              </div>
            )}
          </div>

          {msg.esComunicado && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/6 mb-5">
              <div className="size-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                <svg className="size-4 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-wider">Comunicado Institucional</p>
                {msg.audiencia && msg.audiencia !== 'INDIVIDUAL' && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                    Enviado a: {msg.audienciaCarrera ?? 'Todos los usuarios'}{msg.audienciaGrupo ? ` · Grupo ${msg.audienciaGrupo}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug mb-2">{msg.asunto}</h1>
          <p className="text-xs text-[var(--text-muted)] mb-6 capitalize">{mailFullDate(msg.fecha)}{' · '}<span>{mailTimeAgo(msg.fecha)}</span></p>

          <IdentityCard user={identity} fallbackName={displayName} isInbox={isInbox} avatarSrc={avatarSrc} />
          <hr className="border-[var(--border)] mb-6" />

          {/* Body */}
          {msg.cuerpoHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed [&_a]:text-[var(--brand)] [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--text-muted)] [&_pre]:bg-[var(--bg-elevated)] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: msg.cuerpoHtml }}
            />
          ) : (
            <div className="text-sm text-[var(--text-secondary)] leading-[1.85] whitespace-pre-wrap break-words">{msg.cuerpo ?? '(Sin contenido)'}</div>
          )}

          {/* ── Attachments ── */}
          {msg.adjuntos && msg.adjuntos.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <svg className="size-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  {msg.adjuntos.length === 1 ? '1 adjunto' : `${msg.adjuntos.length} adjuntos`}
                </p>
              </div>

              {/* Image gallery if any images */}
              {msg.adjuntos.some(a => isMailImage(a.nombreArchivo, a.tipoArchivo)) && (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {msg.adjuntos.filter(a => isMailImage(a.nombreArchivo, a.tipoArchivo)).map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openViewer(a)}
                      className="group relative aspect-video sm:aspect-square overflow-hidden rounded-xl bg-[var(--bg-base)] hover:ring-2 hover:ring-[var(--brand)] transition-all"
                      title={a.nombreArchivo}
                    >
                      <SecureMailThumbnail
                        downloadUrl={a.downloadUrl}
                        alt={a.nombreArchivo}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[11px] text-white font-medium truncate">{a.nombreArchivo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Non-image attachments */}
              <div className="flex flex-col gap-2">
                {msg.adjuntos.filter(a => !isMailImage(a.nombreArchivo, a.tipoArchivo)).map(a => (
                  <AttachmentCard key={a.id} adjunto={a} onOpenViewer={openViewer} />
                ))}
              </div>
            </div>
          )}

          {/* ── Thread / conversation view ── */}
          {(msg.replicasCount ?? 0) > 0 && (
            <div className="mt-8">
              <button
                onClick={toggleThread}
                disabled={threadLoading}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)] hover:underline disabled:opacity-60 mb-3"
              >
                {threadLoading ? (
                  <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" /></svg>
                ) : (
                  <svg className={cn('size-3.5 transition-transform', threadExpanded && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                )}
                {threadExpanded ? 'Ocultar conversación' : `Ver conversación (${msg.replicasCount} ${msg.replicasCount === 1 ? 'respuesta' : 'respuestas'})`}
              </button>

              {threadExpanded && threadMessages.length > 0 && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                  {threadMessages.map((tmsg, idx) => {
                    const isCurrentMsg = tmsg.id === msg.id;
                    const senderName   = (tmsg.emisor?.nombre ?? tmsg.emisor?.username) ?? `#${tmsg.emisorId}`;
                    return (
                      <div key={tmsg.id} className={cn('px-4 py-3', isCurrentMsg && 'bg-[var(--brand-muted)]/40')}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar src={resolveUrl(tmsg.emisor?.fotoPerfil)} name={senderName} size="xs" />
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{senderName}</span>
                          {tmsg.tipoAccion && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand)] uppercase tracking-wide shrink-0">{tipoAccionLabel(tmsg.tipoAccion)}</span>
                          )}
                          <time className="ml-auto text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">{mailThreadTime(tmsg.fecha)}</time>
                          {idx === threadMessages.length - 1 && !isCurrentMsg && (
                            <span className="text-[9px] font-bold bg-[var(--brand)] text-white px-1.5 py-0.5 rounded-full shrink-0">Nuevo</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words line-clamp-3">{tmsg.cuerpo ?? ''}</p>
                        {tmsg.adjuntos && tmsg.adjuntos.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {tmsg.adjuntos.map(a => (
                              <AttachmentCard key={a.id} adjunto={a} onOpenViewer={openViewer} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* ── Reply bar ── */}
      <div className="border-t border-[var(--border)] px-4 sm:px-5 py-3 flex items-center gap-2 shrink-0 bg-[var(--bg-surface)] flex-wrap">
        {isInbox && !isTrash && (
          <>
            <button onClick={onReply} className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
              Responder
            </button>
            {(msg.destinatarios?.length ?? 0) > 0 && (
              <button onClick={onReplyAll} title="Responder a todos" className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="7 17 2 12 7 7" /><polyline points="13 17 8 12 13 7" /><path d="M22 18v-2a4 4 0 0 0-4-4H8" /></svg>
                <span className="hidden sm:inline">Responder a todos</span>
              </button>
            )}
          </>
        )}
        <button onClick={onForward} title="Reenviar" className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
          <span className="hidden sm:inline">Reenviar</span>
        </button>
        {msg.tieneAdjuntos && (
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-auto">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            {msg.adjuntosCount ?? msg.adjuntos?.length ?? ''} adjunto{(msg.adjuntosCount ?? msg.adjuntos?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Attachment viewer modal ── */}
      {viewerItem && (
        <MailAttachmentViewer
          item={viewerItem}
          items={viewerItems}
          onClose={() => setViewerItem(null)}
        />
      )}
    </div>
  );
}
