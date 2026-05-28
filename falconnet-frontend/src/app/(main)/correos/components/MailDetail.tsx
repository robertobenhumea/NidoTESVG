'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo, cn, getStoredAuthToken } from '@/lib/utils';
import { api } from '@/services/api';
import type { CorreoAdjuntoItem, CorreoItem, Tab, ThreadMessage, UsuarioInstitucional } from './types';

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/* ─── Institutional role label ─── */
function rolLabel(rol?: string): string {
  const map: Record<string, string> = {
    ESTUDIANTE:     'Estudiante',
    DOCENTE:        'Docente',
    AUTORIDAD:      'Coordinación',
    ADMINISTRATIVO: 'Administrativo',
    PERSONAL:       'Personal',
    ADMIN:          'Administrador',
    DIRECCION:      'Dirección',
  };
  return (rol ? map[rol.toUpperCase()] : null) ?? rol ?? 'Estudiante';
}

function isPrivilegedRole(rol?: string): boolean {
  return ['AUTORIDAD', 'ADMIN', 'DIRECCION'].includes(rol?.toUpperCase() ?? '');
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
function IdentityCard({
  user,
  fallbackName,
  isInbox,
  avatarSrc,
}: {
  user?: UsuarioInstitucional;
  fallbackName: string;
  isInbox: boolean;
  avatarSrc?: string;
}) {
  const name     = user?.nombre ?? fallbackName;
  const role     = rolLabel(user?.rolLabel ?? user?.rol);
  const elevated = isPrivilegedRole(user?.rol);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 overflow-hidden mb-6">
      {/* Header strip */}
      <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em]">
          {isInbox ? 'Remitente' : 'Destinatario'}
        </p>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Avatar + verified */}
          <div className="relative shrink-0">
            <Avatar src={avatarSrc} name={name} size="md" />
            {user?.verificadoInstitucional && (
              <span
                className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-elevated)] flex items-center justify-center"
                title="Correo institucional verificado"
              >
                <svg className="size-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
              {user?.verificadoInstitucional && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide whitespace-nowrap">
                  Verificado
                </span>
              )}
            </div>
            {user?.correo && (
              <p className="text-[11px] font-mono text-[var(--brand)] truncate">{user.correo}</p>
            )}
            {/* Role badge */}
            <span className={cn(
              'mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
              elevated
                ? 'bg-[var(--brand-muted)] text-[var(--brand)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]',
            )}>
              {role}
            </span>
          </div>
        </div>

        {/* Academic fields grid */}
        {(user?.carrera || user?.grupo || user?.semestre || user?.matricula || user?.numeroControl) && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            {user?.carrera && (
              <InfoRow label="Carrera" value={user.carrera} />
            )}
            {user?.grupo && (
              <InfoRow label="Grupo / Semestre" value={user.grupo} />
            )}
            {(user?.matricula ?? user?.numeroControl) && (
              <InfoRow label="No. Control / Matrícula" value={(user?.matricula ?? user?.numeroControl)!} mono />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Attachment card ─── */
function AttachmentCard({ adjunto }: { adjunto: CorreoAdjuntoItem }) {
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening]         = useState(false);
  const ext     = adjunto.nombreArchivo.split('.').pop()?.toUpperCase() ?? 'FILE';
  const isImage = adjunto.tipoArchivo?.startsWith('image/');

  function formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function resolveSecureUrl(path: string): string {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async function fetchSecureBlob(): Promise<Blob> {
    const token = getStoredAuthToken();
    const url   = resolveSecureUrl(adjunto.downloadUrl);
    const res   = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob      = await fetchSecureBlob();
      const objectUrl = URL.createObjectURL(blob);
      const link      = document.createElement('a');
      link.href       = objectUrl;
      link.download   = adjunto.nombreArchivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch (err) {
      console.error('[correo/adjunto] download failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleOpen() {
    if (opening) return;
    setOpening(true);
    try {
      const blob      = await fetchSecureBlob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      console.error('[correo/adjunto] open failed:', err);
    } finally {
      setOpening(false);
    }
  }

  const extColorMap: Record<string, string> = {
    PDF:  'bg-red-500/10 text-red-600 dark:text-red-400',
    DOC:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    DOCX: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    XLS:  'bg-green-500/10 text-green-600 dark:text-green-400',
    XLSX: 'bg-green-500/10 text-green-600 dark:text-green-400',
    PPT:  'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    PPTX: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    TXT:  'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
    ZIP:  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    PNG:  'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    JPG:  'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    JPEG: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    WEBP: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    GIF:  'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    MP4:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    MOV:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    WEBM: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  const extColor = extColorMap[ext] ?? 'bg-[var(--brand-muted)] text-[var(--brand)]';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 hover:border-[var(--border-strong)] transition-colors group">
      {/* Icon — no direct public URL thumbnails */}
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
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleOpen}
          disabled={opening}
          className="h-7 px-2 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors flex items-center disabled:opacity-50"
          title="Abrir"
        >
          {opening ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          )}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-muted)] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Descargar"
        >
          {downloading ? (
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          <span className="hidden sm:inline">Descargar</span>
        </button>
      </div>
    </div>
  );
}

interface MailDetailProps {
  msg:           CorreoItem;
  tab:           Tab;
  onClose:       () => void;
  onFavorite:    (id: number) => void;
  onTrash:       (id: number) => void;
  onReply:       () => void;
  onMarkUnread:  () => void;
  onReplyAll:    () => void;
  onForward:     () => void;
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : 'currentColor'}
      strokeWidth={2}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function formatFullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
      hour:    '2-digit',
      minute:  '2-digit',
    });
  } catch {
    return iso;
  }
}

function tipoAccionLabel(tipo?: string): string {
  if (tipo === 'RESPUESTA')       return 'Respuesta';
  if (tipo === 'RESPUESTA_TODOS') return 'Respuesta a todos';
  if (tipo === 'REENVIO')         return 'Reenviado';
  return '';
}

export function MailDetail({ msg, tab, onClose, onFavorite, onTrash, onReply, onMarkUnread, onReplyAll, onForward }: MailDetailProps) {
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [threadLoading,  setThreadLoading]  = useState(false);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);

  async function loadThread() {
    if (threadLoading) return;
    setThreadLoading(true);
    try {
      const data = await api.get<ThreadMessage[]>(`/correos/${msg.id}/hilo`, { suppressAuthExpiry: true });
      setThreadMessages(data);
      setThreadExpanded(true);
    } catch {
      // silently ignore — button remains
    } finally {
      setThreadLoading(false);
    }
  }

  function toggleThread() {
    if (threadExpanded) {
      setThreadExpanded(false);
    } else if (threadMessages.length > 0) {
      setThreadExpanded(true);
    } else {
      void loadThread();
    }
  }
  const isInbox = tab !== 'enviados';
  const isTrash = tab === 'papelera';

  const displayName = isInbox
    ? (msg.emisorNombre ?? `Usuario #${msg.emisorId}`)
    : (msg.destinatarioNombres?.join(', ') ?? '—');

  const identity  = isInbox ? msg.emisor : msg.destinatarios?.[0];
  const avatarSrc = isInbox ? resolveUrl(msg.emisorFoto) : resolveUrl(identity?.fotoPerfil);

  const categoriaLabel: Record<string, string> = {
    ACADEMICO:    'Académico',
    INSTITUCIONAL:'Institucional',
    COORDINACION: 'Coordinación',
    TRAMITE:      'Trámite',
    JUSTIFICANTE: 'Justificante',
    SOLICITUD:    'Solicitud',
    REPORTE:      'Reporte',
    AVISO:        'Aviso',
    DUDA:         'Duda',
    IMPORTANTE:   'Importante',
    EVENTOS:      'Eventos',
    EQUIPOS:      'Equipos',
    MARKETPLACE:  'Marketplace',
    GENERAL:      'General',
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] animate-fade-in">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <button
          onClick={onClose}
          className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Volver"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Category tag */}
        {msg.categoria && msg.categoria !== 'GENERAL' && (
          <span className="hidden sm:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">
            {categoriaLabel[msg.categoria] ?? msg.categoria}
          </span>
        )}

        <button
          onClick={() => onFavorite(msg.id)}
          aria-label={msg.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <StarIcon filled={msg.esFavorito} />
        </button>

        {isInbox && !isTrash && msg.leido && (
          <button
            onClick={onMarkUnread}
            aria-label="Marcar como no leído"
            title="Marcar como no leído"
            className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--brand)] transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 7 13.5 15.5a2.1 2.1 0 0 1-3 0L2 7" /><rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} />
            </svg>
          </button>
        )}

        {isInbox && !isTrash && (
          <button
            onClick={() => onTrash(msg.id)}
            aria-label="Mover a papelera"
            className="size-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 sm:px-6 py-6 max-w-2xl mx-auto">

          {/* Priority / tipoAccion / audience badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {msg.prioridad === 'ALTA' && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 19.5h20L12 2zm0 3l7.5 13.5h-15L12 5z"/>
                </svg>
                Mensaje prioritario
              </div>
            )}
            {msg.tipoAccion && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand)] bg-[var(--brand-muted)] border border-[var(--brand)]/20 px-2.5 py-1 rounded-full">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                {tipoAccionLabel(msg.tipoAccion)}
              </div>
            )}
            {msg.audiencia && msg.audiencia !== 'INDIVIDUAL' && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1 rounded-full">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {msg.audienciaCarrera ?? 'Todos'}
                {msg.audienciaGrupo ? ` · ${msg.audienciaGrupo}` : ''}
              </div>
            )}
          </div>

          {/* Comunicado institutional banner */}
          {msg.esComunicado && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/6 mb-5">
              <div className="size-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                <svg className="size-4.5 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l19-9-9 19-2-8-8-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-wider">Comunicado Institucional</p>
                {msg.audiencia && msg.audiencia !== 'INDIVIDUAL' && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                    Enviado a: {msg.audienciaCarrera ?? 'Todos los usuarios'}
                    {msg.audienciaGrupo ? ` · Grupo ${msg.audienciaGrupo}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Subject */}
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug mb-2">
            {msg.asunto}
          </h1>

          {/* Date subtitle */}
          <p className="text-xs text-[var(--text-muted)] mb-6 capitalize">
            {formatFullDate(msg.fecha)}
            {' · '}
            <span className="text-[var(--text-muted)]">{timeAgo(msg.fecha)}</span>
          </p>

          {/* ── Institutional identity card ── */}
          <IdentityCard
            user={identity}
            fallbackName={displayName}
            isInbox={isInbox}
            avatarSrc={avatarSrc}
          />

          <hr className="border-[var(--border)] mb-6" />

          {/* ── Body ── */}
          {msg.cuerpoHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed [&_a]:text-[var(--brand)] [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--text-muted)] [&_pre]:bg-[var(--bg-elevated)] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_table]:w-full [&_th]:bg-[var(--bg-elevated)] [&_th]:p-2 [&_td]:p-2 [&_td]:border-b [&_td]:border-[var(--border)]"
              dangerouslySetInnerHTML={{ __html: msg.cuerpoHtml }}
            />
          ) : (
            <div className="text-sm text-[var(--text-secondary)] leading-[1.85] whitespace-pre-wrap break-words">
              {msg.cuerpo ?? '(Sin contenido)'}
            </div>
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
              <div className="flex flex-col gap-2">
                {msg.adjuntos.map(adjunto => (
                  <AttachmentCard key={adjunto.id} adjunto={adjunto} />
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
                  <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 85" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className={cn('size-3.5 transition-transform', threadExpanded && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
                {threadExpanded ? 'Ocultar conversación' : `Ver conversación (${msg.replicasCount} ${msg.replicasCount === 1 ? 'respuesta' : 'respuestas'})`}
              </button>

              {threadExpanded && threadMessages.length > 0 && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
                  {threadMessages.map((tmsg, idx) => {
                    const isCurrentMsg = tmsg.id === msg.id;
                    const senderName = (tmsg.emisor?.nombre ?? tmsg.emisor?.username) ?? `#${tmsg.emisorId}`;
                    return (
                      <div key={tmsg.id} className={cn('px-4 py-3', isCurrentMsg && 'bg-[var(--brand-muted)]/40')}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar
                            src={resolveUrl(tmsg.emisor?.fotoPerfil)}
                            name={senderName}
                            size="xs"
                          />
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{senderName}</span>
                          {tmsg.tipoAccion && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand)] uppercase tracking-wide shrink-0">
                              {tipoAccionLabel(tmsg.tipoAccion)}
                            </span>
                          )}
                          <time className="ml-auto text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
                            {timeAgo(tmsg.fecha)}
                          </time>
                          {idx === threadMessages.length - 1 && !isCurrentMsg && (
                            <span className="text-[9px] font-bold bg-[var(--brand)] text-white px-1.5 py-0.5 rounded-full shrink-0">Nuevo</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                          {tmsg.cuerpo ?? ''}
                        </p>
                        {tmsg.adjuntos && tmsg.adjuntos.length > 0 && (
                          <p className="mt-1 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            {tmsg.adjuntos.length} adjunto{tmsg.adjuntos.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Spacer for reply bar */}
          <div className="h-4" />
        </div>
      </div>

      {/* ── Reply bar ── */}
      <div className="border-t border-[var(--border)] px-4 sm:px-5 py-3 flex items-center gap-2 shrink-0 bg-[var(--bg-surface)] flex-wrap">
        {isInbox && !isTrash && (
          <>
            <button
              onClick={onReply}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              Responder
            </button>

            {(msg.destinatarios?.length ?? 0) > 0 && (
              <button
                onClick={onReplyAll}
                title="Responder a todos"
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 17 2 12 7 7" /><polyline points="13 17 8 12 13 7" />
                  <path d="M22 18v-2a4 4 0 0 0-4-4H8" />
                </svg>
                <span className="hidden sm:inline">Responder a todos</span>
              </button>
            )}
          </>
        )}

        <button
          onClick={onForward}
          title="Reenviar"
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" />
          </svg>
          <span className="hidden sm:inline">Reenviar</span>
        </button>

        {msg.tieneAdjuntos && (
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-auto">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            {msg.adjuntosCount ?? msg.adjuntos?.length ?? ''} archivo{(msg.adjuntosCount ?? msg.adjuntos?.length ?? 0) !== 1 ? 's' : ''} adjunto{(msg.adjuntosCount ?? msg.adjuntos?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
