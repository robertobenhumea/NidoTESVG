'use client';

import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import type { CorreoAdjuntoItem, CorreoItem, Tab, UsuarioInstitucional } from './types';

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function IdentityBlock({ user, fallbackName }: { user?: UsuarioInstitucional; fallbackName: string }) {
  const name = user?.nombre ?? fallbackName;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{name}</p>
        {user?.verificadoInstitucional && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            VERIFICADO
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
        {user?.carrera ?? 'Instituto Tecnológico'}
        {user?.semestre ? ` · ${user.semestre}` : ''}
        {user?.username ? ` · @${user.username}` : ''}
      </p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
        {user?.rol ?? 'ESTUDIANTE'} · {user?.departamento ?? user?.facultad ?? 'Instituto Tecnológico'}
      </p>
    </div>
  );
}

function AttachmentCard({ adjunto }: { adjunto: CorreoAdjuntoItem }) {
  const isImage = adjunto.tipoArchivo?.startsWith('image/');
  const url = resolveUrl(adjunto.archivoUrl);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2 hover:border-[var(--border-strong)] transition-colors"
    >
      {isImage ? (
        <img src={url} alt="" className="size-12 rounded-lg object-cover bg-[var(--bg-surface)]" />
      ) : (
        <span className="size-12 rounded-lg bg-[var(--brand-muted)] text-[var(--brand)] flex items-center justify-center text-xs font-bold">
          {adjunto.nombreArchivo.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'FILE'}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{adjunto.nombreArchivo}</p>
        <p className="text-[11px] text-[var(--text-muted)]">
          {adjunto.tipoArchivo ?? 'Archivo'} · {adjunto.tamanio ? `${(adjunto.tamanio / (1024 * 1024)).toFixed(1)} MB` : 'Listo'}
        </p>
      </div>
      <span className="text-[11px] text-[var(--brand)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        Abrir
      </span>
    </a>
  );
}

interface MailDetailProps {
  msg:        CorreoItem;
  tab:        Tab;
  onClose:    () => void;
  onFavorite: (id: number) => void;
  onTrash:    (id: number) => void;
  onReply:    () => void;
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

export function MailDetail({ msg, tab, onClose, onFavorite, onTrash, onReply }: MailDetailProps) {
  const isInbox     = tab !== 'enviados';
  const isTrash     = tab === 'papelera';
  const displayName = isInbox
    ? (msg.emisorNombre ?? `Usuario #${msg.emisorId}`)
    : (msg.destinatarioNombres?.join(', ') ?? '—');
  const identity = isInbox ? msg.emisor : msg.destinatarios?.[0];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] animate-fade-in">

      {/* Toolbar */}
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

        <button
          onClick={() => onFavorite(msg.id)}
          aria-label={msg.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <StarIcon filled={msg.esFavorito} />
        </button>

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 sm:px-6 py-6 max-w-2xl mx-auto">

          {/* Subject */}
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug mb-6">
            {msg.asunto}
          </h1>

          {/* Sender row */}
          <div className="flex items-start gap-3 mb-1">
            <Avatar
              src={isInbox ? resolveUrl(msg.emisorFoto) : undefined}
              name={displayName}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <IdentityBlock user={identity} fallbackName={displayName} />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {isInbox ? 'Para mí' : `Para: ${displayName}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <time
                className="text-xs text-[var(--text-muted)] block"
                title={formatFullDate(msg.fecha)}
              >
                {timeAgo(msg.fecha)}
              </time>
            </div>
          </div>

          {/* Full date */}
          <p className="text-[11px] text-[var(--text-muted)] mb-6 capitalize" style={{ paddingLeft: '52px' }}>
            {formatFullDate(msg.fecha)}
          </p>

          <hr className="border-[var(--border)] mb-6" />

          {/* Body */}
          <div className="text-sm text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap break-words">
            {msg.cuerpo ?? '(Sin contenido)'}
          </div>

          {msg.adjuntos && msg.adjuntos.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Adjuntos
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {msg.adjuntos.map(adjunto => <AttachmentCard key={adjunto.id} adjunto={adjunto} />)}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Reply bar */}
      <div className="border-t border-[var(--border)] px-4 sm:px-5 py-3 flex items-center gap-2 shrink-0">
        {isInbox && !isTrash && (
          <button
            onClick={onReply}
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            Responder
          </button>
        )}
      </div>
    </div>
  );
}
