'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarModal } from '@/components/ui/AvatarModal';
import { ReactionPicker } from '@/components/feed/ReactionPicker';
import { CommentSection } from '@/components/feed/CommentSection';
import { cn, timeAgo } from '@/lib/utils';
import { REACTIONS } from '@/lib/constants';
import { postService } from '@/services/post.service';
import { api } from '@/services/api';
import { PostMedia } from '@/components/feed/PostMedia';
import type { Post, ReactionType, Poll } from '@/types';

interface PostCardProps {
  post:             Post;
  onDelete?:        (id: number) => void;
  onReact?:         (postId: number, type: ReactionType) => void;
  onCommentAdded?:  (postId: number) => void;
  onVote?:          (opcionId: number, encuestaId: number) => void;
  currentUserId?:   number;
}

/** Returns null (not visible), 'new' (< 2h old), or 'expiring' (< 2h left). */
function useExpiryStatus(createdAt: string, expiresAt?: string): null | 'new' | 'expiring' {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (!expiresAt) return ageMs < 2 * 3_600_000 ? 'new' : null;
  const leftMs = new Date(expiresAt).getTime() - Date.now();
  if (leftMs <= 0) return null;
  if (leftMs < 2 * 3_600_000) return 'expiring';
  if (ageMs < 2 * 3_600_000) return 'new';
  return null;
}

function ExpiryBadge({ status }: { status: 'new' | 'expiring' }) {
  return status === 'new' ? (
    <span className="shrink-0 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 leading-none">
      Nuevo
    </span>
  ) : (
    <span className="shrink-0 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 leading-none">
      Expira pronto
    </span>
  );
}

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === 'ADMIN') return (
    <span className="shrink-0 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 leading-none">
      Admin
    </span>
  );
  if (r === 'DOCENTE') return (
    <span className="shrink-0 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 leading-none">
      Docente
    </span>
  );
  return null;
}

function PollWidget({ poll, onVote }: { poll: Poll; onVote?: (opcionId: number, encuestaId: number) => void }) {
  const voted = poll.miVoto != null;
  const total = poll.total || 1;

  return (
    <div className="px-4 pb-3">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{poll.pregunta}</p>
      <div className="space-y-2">
        {poll.opciones.map((op) => {
          const pct     = Math.round((op.votos / total) * 100);
          const isVoted = poll.miVoto === op.id;
          return (
            <button
              key={op.id}
              onClick={() => !voted && onVote?.(op.id, poll.id)}
              disabled={voted}
              className={`relative w-full text-left rounded-xl overflow-hidden border transition-colors ${
                isVoted
                  ? 'border-[var(--brand)] bg-[var(--brand-muted)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] disabled:cursor-default'
              }`}
            >
              {voted && (
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--brand)]/15 rounded-xl transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={`text-sm ${isVoted ? 'font-semibold text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>
                  {op.texto}
                </span>
                {voted && (
                  <span className={`text-xs font-medium tabular-nums ml-2 ${isVoted ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        {poll.total} {poll.total === 1 ? 'voto' : 'votos'}
        {!voted && <span className="ml-1">· Toca para votar</span>}
      </p>
    </div>
  );
}


function AnnouncementCard({ post, currentUserId }: { post: Post; currentUserId?: number }) {
  const author      = post.author;
  const displayName = author.displayName ?? author.username;
  const isOwn       = currentUserId === author.id;

  return (
    <article
      className="rounded-2xl overflow-hidden border-2 border-amber-400/70 dark:border-amber-500/50"
      style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #2C2150 100%)' }}
      aria-label={`Anuncio de ${displayName}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-amber-400 text-[#1A1A2E] rounded-full px-3 py-1">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            Anuncio
          </span>
          <span className="text-xs text-white/50">{timeAgo(post.createdAt)}</span>
        </div>
        {post.content && (
          <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap break-words mb-3">
            {post.content}
          </p>
        )}
        {post.imageUrl && (
          <div className="mt-2 rounded-xl overflow-hidden">
            <PostMedia src={post.imageUrl} />
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <Avatar src={author.avatarUrl} name={displayName} size="xs" />
          <span className="text-xs text-white/60">{displayName}</span>
          {isOwn && (
            <span className="ml-auto text-xs text-white/40">Tu anuncio</span>
          )}
        </div>
      </div>
    </article>
  );
}

function getReaction(type?: ReactionType) {
  return REACTIONS.find((r) => r.type === type);
}

const MOTIVOS = [
  'Contenido inapropiado',
  'Spam o publicidad',
  'Acoso o bullying',
  'Información falsa',
  'Violencia o amenazas',
  'Otro',
];

function ReportModal({ postId, onClose, onSent }: { postId: number; onClose: () => void; onSent: () => void }) {
  const [motivo, setMotivo]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSend() {
    if (!motivo) { setError('Selecciona un motivo.'); return; }
    setLoading(true);
    try {
      await api.post(`/admin/reportes/publicacion/${postId}`, { motivo });
      onSent();
    } catch {
      setError('No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Reportar publicación</h3>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div
          className="p-4 space-y-2 overflow-y-auto"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <p className="text-xs text-[var(--text-muted)] mb-3">¿Por qué reportas esta publicación?</p>
          {MOTIVOS.map((m) => (
            <label key={m} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors">
              <input
                type="radio"
                name="motivo"
                value={m}
                checked={motivo === m}
                onChange={() => setMotivo(m)}
                className="accent-[var(--brand)]"
              />
              <span className="text-sm text-[var(--text-primary)]">{m}</span>
            </label>
          ))}
          {error && <p className="text-xs text-red-500 pt-1">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">
              Cancelar
            </button>
            <button onClick={handleSend} disabled={loading || !motivo} className="flex-1 h-9 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:bg-[var(--brand-hover)] disabled:opacity-50 transition-colors">
              {loading ? 'Enviando…' : 'Reportar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCard({ post, onDelete, onReact, onCommentAdded, onVote, currentUserId }: PostCardProps) {
  const author       = post.author;
  const displayName  = author.displayName ?? author.username;
  const isOwn        = currentUserId === author.id;
  const expiryStatus = useExpiryStatus(post.createdAt, post.expiresAt);

  const [pickerOpen, setPicker]         = useState(false);
  const [pickerClosing, setPickerClos]  = useState(false);
  const [commentsOpen, setComments]     = useState(false);
  const [avatarOpen, setAvatar]         = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareDone, setShareDone]       = useState(false);
  const [reportOpen, setReportOpen]     = useState(false);
  const [reportSent, setReportSent]     = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const holdRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHoldRef                      = useRef(false);
  const closingTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHold() {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  }

  /** Close picker with 150ms fade-out animation */
  const closePicker = useCallback(() => {
    if (!pickerOpen) return;
    setPickerClos(true);
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    closingTimerRef.current = setTimeout(() => {
      setPickerClos(false);
      setPicker(false);
    }, 150);
  }, [pickerOpen]);

  // ── Touch events (mobile) ──────────────────────────────────────────────────
  function onReactTouchStart(e: React.TouchEvent) {
    didHoldRef.current = false;
    holdRef.current = setTimeout(() => {
      didHoldRef.current = true;
      holdRef.current = null;
      setPicker(true);
    }, 500);
  }

  function onReactTouchEnd(e: React.TouchEvent) {
    if (holdRef.current) {
      clearHold();
      if (!didHoldRef.current && !pickerOpen) {
        // Quick tap → toggle LIKE, prevent ghost click
        e.preventDefault();
        onReact?.(post.id, 'LIKE');
      }
    }
  }

  function onReactTouchMove() {
    // Finger moved → cancel long-press
    clearHold();
  }

  // ── Mouse events (desktop) ─────────────────────────────────────────────────
  function onReactMouseEnter() {
    // Only trigger on desktop (no touch)
    holdRef.current = setTimeout(() => { holdRef.current = null; setPicker(true); }, 400);
  }

  function onReactMouseLeave() {
    clearHold();
  }

  function onReactClick() {
    clearHold();
    if (!pickerOpen && !pickerClosing) onReact?.(post.id, 'LIKE');
  }

  function onWrapperMouseLeave() {
    clearHold();
    closePicker();
  }

  function handlePickerSelect(type: ReactionType) {
    // Close immediately then react — ensures no double-fire on mobile
    closePicker();
    onReact?.(post.id, type);
  }

  async function handleShare() {
    if (shareLoading || shareDone) return;
    setShareLoading(true);
    try {
      await postService.sharePost(post.id);
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch { /* ignore */ } finally {
      setShareLoading(false);
    }
  }

  const activeRx = post.userReaction;
  const rxInfo   = getReaction(activeRx);

  if (post.isAnnouncement) {
    return <AnnouncementCard post={post} currentUserId={currentUserId} />;
  }

  return (
    <>
      <article
        className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
        aria-label={`Publicación de ${displayName}`}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2.5 px-3 sm:px-4 pt-3 sm:pt-4 pb-2.5 sm:pb-3">
          <button
            onClick={() => setAvatar(true)}
            aria-label={`Ver foto de ${displayName}`}
            className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          >
            <Avatar src={author.avatarUrl} name={displayName} size="md" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                href={`/profile/${author.id}`}
                className="text-sm font-semibold text-[var(--text-primary)] hover:underline leading-tight truncate"
              >
                {displayName}
              </Link>
              <RoleBadge role={author.role} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {author.carrera && (
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-px rounded-full truncate max-w-[100px]">
                  {author.carrera}
                </span>
              )}
              <time dateTime={post.createdAt} className="text-xs text-[var(--text-muted)] shrink-0">
                {timeAgo(post.createdAt)}
              </time>
              {expiryStatus && <ExpiryBadge status={expiryStatus} />}
            </div>
          </div>

          {/* Post menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más opciones"
              className="size-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-9 z-20 min-w-[140px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {isOwn && onDelete && (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
                      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                    </svg>
                    Eliminar
                  </button>
                )}
                {!isOwn && !reportSent && (
                  <button
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Reportar
                  </button>
                )}
                {!isOwn && reportSent && (
                  <span className="block px-3 py-2.5 text-xs text-[var(--text-muted)]">Reportado</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {post.content && (
          <p className="px-3 sm:px-4 pb-3 text-[15px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
        )}

        {/* ── Poll ── */}
        {post.poll && (
          <PollWidget poll={post.poll} onVote={onVote} />
        )}

        {/* ── Image ── */}
        {post.imageUrl && (
          <div className={post.content || post.poll ? 'mt-1' : undefined}>
            <PostMedia src={post.imageUrl} />
          </div>
        )}

        {/* ── Summary row ── */}
        {(post.reactionCount > 0 || post.commentCount > 0) && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-xs text-[var(--text-muted)]">
            {post.reactionCount > 0 && (
              <span>
                {post.reactionCount} reacción{post.reactionCount !== 1 ? 'es' : ''}
              </span>
            )}
            {post.commentCount > 0 && (
              <button
                className="ml-auto hover:underline focus-visible:underline"
                onClick={() => setComments((v) => !v)}
              >
                {post.commentCount} comentario{post.commentCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* ── Actions bar ── */}
        <div className="flex items-center px-1 sm:px-2 py-0.5 border-t border-[var(--border)]">

          {/* Reaction button + picker */}
          <div
            className="relative flex-1"
            onMouseEnter={onReactMouseEnter}
            onMouseLeave={onWrapperMouseLeave}
          >
            <ReactionPicker
              open={pickerOpen}
              closing={pickerClosing}
              current={activeRx}
              onSelect={handlePickerSelect}
              onClose={closePicker}
            />

            <button
              onTouchStart={onReactTouchStart}
              onTouchEnd={onReactTouchEnd}
              onTouchMove={onReactTouchMove}
              onMouseEnter={onReactMouseEnter}
              onMouseLeave={onReactMouseLeave}
              onClick={onReactClick}
              aria-label={activeRx ? `${rxInfo?.label ?? 'Reacción'} (mantén para cambiar)` : 'Me gusta (mantén para más reacciones)'}
              aria-pressed={!!activeRx}
              className={cn(
                'w-full flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-colors duration-150 select-none touch-manipulation',
                activeRx
                  ? 'text-[var(--brand)] bg-[var(--brand-muted)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
              )}
            >
              {activeRx ? (
                <span className="text-base leading-none">{rxInfo?.emoji}</span>
              ) : (
                <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M7 10v12" strokeLinecap="round" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className="text-xs sm:text-sm">{activeRx ? rxInfo?.label : 'Me gusta'}</span>
            </button>
          </div>

          {/* Comment */}
          <button
            onClick={() => setComments((v) => !v)}
            aria-label={`Comentarios · ${post.commentCount}`}
            aria-expanded={commentsOpen}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-colors duration-150',
              commentsOpen
                ? 'text-[var(--brand)] bg-[var(--brand-muted)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs sm:text-sm">Comentar</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            aria-label="Compartir publicación"
            className={cn(
              'flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-colors duration-150',
              shareDone
                ? 'text-green-500 bg-green-50 dark:bg-green-950/30'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            {shareDone ? (
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
              </svg>
            )}
            <span className="text-xs sm:text-sm">{shareDone ? '¡Listo!' : 'Compartir'}</span>
          </button>
        </div>

        {/* ── Comments ── */}
        {commentsOpen && (
          <CommentSection
            postId={post.id}
            onCommentAdded={() => onCommentAdded?.(post.id)}
          />
        )}
      </article>

      <AvatarModal
        src={author.avatarUrl}
        name={displayName}
        open={avatarOpen}
        onClose={() => setAvatar(false)}
      />

      {reportOpen && (
        <ReportModal
          postId={post.id}
          onClose={() => setReportOpen(false)}
          onSent={() => { setReportOpen(false); setReportSent(true); }}
        />
      )}
    </>
  );
}
