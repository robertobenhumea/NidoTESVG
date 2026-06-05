'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, AtSign, FileText, ImageIcon, Info, Link as LinkIcon, MoreVertical,
  Paperclip, Search, Send, Smile, UserMinus, UserPlus, Volume2, VolumeX, X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { stompClient } from '@/lib/stomp';
import { cn } from '@/lib/utils';
import { groupChatService, mapGroupMessage } from '@/services/groupChat.service';
import { searchService } from '@/services/search.service';
import type {
  BChatGrupoDetalle, BChatGrupoMensaje, BChatGrupoMiembro, ChatGrupoRol, GroupAttachment,
  GroupMessage, GroupSharedLink, SearchUser,
} from '@/types';
import { SecureAttachmentViewer, SecureImage, openSecureAttachment, type AttachmentViewerItem } from './SecureAttachment';
import { VoicePlayer, VoiceRecorder } from './VoiceMessage';
import { ForwardMessageModal } from './ForwardMessageModal';
import { MediaGallery, type GalleryItem } from './MediaGallery';

const EMOJIS = ['😀','😂','😊','😍','😎','👍','👏','🙌','❤️','🔥','✨','💯','🎉','🏆','⚡','🙏','🤔','😅','🥳','👋'];
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z', 'webm', 'ogg', 'mp3', 'm4a', 'mp4', 'wav']);
const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.7z,.webm,.ogg,.mp3,.m4a,.mp4,.wav';
const LONG_PRESS_MS = 760;
const LONG_PRESS_MOVE_PX = 18;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return 'Hoy';
  if (sameDay(date, yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

function validDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeStr(iso?: string | null) {
  const date = validDate(iso);
  if (!date) return '';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function hasRenderableMessage(msg: GroupMessage) {
  if (msg.eliminado) return true;
  if (msg.esSistema) return Boolean(msg.content?.trim());
  if (msg.tipo === 'IMAGE' || msg.tipo === 'DOCUMENT' || msg.tipo === 'AUDIO') return Boolean(msg.archivoUrl || msg.fileUrl || msg.content?.trim());
  return Boolean(msg.content?.trim());
}

function fileSizeLabel(size?: number | null): string {
  if (!size || !Number.isFinite(size)) return 'Documento';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function messageKindLabel(tipo?: string | null): string {
  if (tipo === 'IMAGE') return 'Imagen';
  if (tipo === 'DOCUMENT') return 'Archivo';
  if (tipo === 'AUDIO') return 'Audio';
  return 'Texto';
}

function isAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return file.type.startsWith('audio/') || ['webm', 'ogg', 'mp3', 'm4a', 'mp4', 'wav'].includes(ext);
}

function roleRank(role?: ChatGrupoRol) {
  return role === 'OWNER' ? 4 : role === 'ADMIN' ? 3 : role === 'MODERADOR' ? 2 : 1;
}

function canAdmin(role?: ChatGrupoRol) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MODERADOR';
}

function extractLinks(text: string) {
  return text.match(/https?:\/\/[^\s]+/g) ?? [];
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('button,a,input,textarea,select,audio,video'));
}

function GroupBubble({
  msg, mine, member, onReply, onEdit, onReact, onForward, onDelete, onJumpTo, onCopy, onPin, onOpenAttachment,
}: {
  msg: GroupMessage;
  mine: boolean;
  member?: BChatGrupoMiembro;
  onReply: (msg: GroupMessage) => void;
  onEdit: (msg: GroupMessage) => void;
  onReact: (msg: GroupMessage, reactionType: string) => void;
  onForward: (msg: GroupMessage) => void;
  onDelete: (id: number, mode: 'todos' | 'para-mi') => void;
  onJumpTo: (id: number) => void;
  onCopy: (text: string) => void;
  onPin: (msg: GroupMessage) => void;
  onOpenAttachment: (msg: GroupMessage) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  useEffect(() => {
    document.addEventListener('scroll', cancelLongPress, true);
    return () => document.removeEventListener('scroll', cancelLongPress, true);
  }, [cancelLongPress]);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (isInteractiveTarget(e.target)) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      setMenu(true);
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = e.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX || Math.abs(dy) > LONG_PRESS_MOVE_PX) {
      cancelLongPress();
    }
  }

  if (!hasRenderableMessage(msg)) return null;

  if (msg.esSistema) {
    return (
      <div className="flex justify-center my-2">
        <span className="max-w-[86%] rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2 mb-2 group', mine && 'justify-end')}>
      {!mine && <Avatar src={member?.foto ?? msg.senderAvatar} name={member?.nombre ?? msg.senderName ?? 'Usuario'} size="sm" />}
      <div className={cn('max-w-[78%] sm:max-w-[66%]', mine && 'items-end')}>
        {!mine && (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">{member?.nombre ?? msg.senderName}</span>
            {member?.carrera && <span className="truncate text-[10px] text-[var(--text-muted)]">{member.carrera}</span>}
          </div>
        )}
        <div className={cn(
          'relative rounded-2xl px-3 py-2 shadow-sm transition-transform active:scale-[0.99]',
          mine ? 'rounded-br-md bg-[var(--brand)] text-white' : 'rounded-bl-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]',
        )}
          onContextMenu={e => { e.preventDefault(); setMenu(true); }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
        >
          {msg.reenviado && (
            <p className={cn('mb-1 text-[10px] font-semibold uppercase tracking-wide', mine ? 'text-white/60' : 'text-[var(--text-muted)]')}>
              Reenviado
            </p>
          )}
          {msg.replyPreview && (
            <button
              onClick={() => onJumpTo(msg.replyPreview!.id)}
              className={cn('mb-2 block w-full rounded-lg border-l-4 px-2 py-1 text-left text-xs', mine ? 'border-white/50 bg-white/10 text-white/75' : 'border-[var(--brand)] bg-[var(--bg-elevated)] text-[var(--text-muted)]')}
            >
              <p className={cn('truncate font-semibold', mine ? 'text-white/90' : 'text-[var(--brand)]')}>{msg.replyPreview.senderName}</p>
              <p className="truncate">{msg.replyPreview.eliminado ? 'Mensaje eliminado' : `${messageKindLabel(msg.replyPreview.tipo)} · ${msg.replyPreview.content || 'Adjunto'}`}</p>
            </button>
          )}
          {msg.eliminado ? (
            <p className="text-sm italic opacity-70">Mensaje eliminado</p>
          ) : (
            <>
              {msg.tipo === 'IMAGE' && (msg.archivoUrl || msg.fileUrl) && (
                <div className="mb-2 overflow-hidden rounded-xl">
                  <SecureImage
                    src={(msg.archivoUrl ?? msg.fileUrl)!}
                    alt={msg.nombreArchivo ?? msg.fileName ?? 'Imagen compartida'}
                    className="max-h-72 w-full max-w-[280px] object-cover rounded-xl"
                    onClick={() => onOpenAttachment(msg)}
                  />
                </div>
              )}
              {msg.tipo === 'DOCUMENT' && (msg.archivoUrl || msg.fileUrl) && (
                <button type="button" onClick={() => onOpenAttachment(msg)} className={cn('mb-2 flex items-center gap-2 rounded-xl p-2 text-left', mine ? 'bg-white/10' : 'bg-[var(--bg-elevated)]')}>
                  <FileText className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{msg.nombreArchivo ?? msg.fileName ?? 'Archivo'}</span>
                  <span className="shrink-0 text-[10px] opacity-70">{fileSizeLabel(msg.fileSize)}</span>
                </button>
              )}
              {msg.tipo === 'AUDIO' && (msg.archivoUrl || msg.fileUrl) && (
                <VoicePlayer
                  url={(msg.archivoUrl ?? msg.fileUrl)!}
                  fileName={msg.nombreArchivo ?? msg.fileName ?? 'nota-voz.webm'}
                  durationSeconds={msg.durationSeconds}
                  isOwn={mine}
                />
              )}
              {msg.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>}
            </>
          )}
          <div className={cn('mt-1 flex items-center justify-end gap-2 text-[10px]', mine ? 'text-white/60' : 'text-[var(--text-muted)]')}>
            {msg.pinned && <span>fijado</span>}
            {msg.editado && <span>editado</span>}
            <span>{timeStr(msg.createdAt)}</span>
            {!msg.eliminado && (
              <button onClick={() => setMenu(v => !v)} className="grid size-6 place-items-center rounded-full opacity-80 transition hover:bg-black/10 sm:opacity-0 sm:group-hover:opacity-100">
                <MoreVertical className="size-3.5" />
              </button>
            )}
          </div>
          {menu && (
            <div className={cn('absolute bottom-7 z-20 min-w-36 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xl', mine ? 'right-2' : 'left-2')}>
              <button onClick={() => { onReply(msg); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Responder</button>
              <button onClick={() => { setReactionsOpen(v => !v); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Reaccionar</button>
              <button onClick={() => { onForward(msg); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Reenviar</button>
              {msg.tipo === 'TEXT' && <button onClick={() => { onCopy(msg.content); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Copiar</button>}
              {mine && msg.tipo === 'TEXT' && <button onClick={() => { onEdit(msg); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Editar</button>}
              <button onClick={() => { onPin(msg); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">{msg.pinned ? 'Desfijar' : 'Fijar'}</button>
              <button onClick={() => { onDelete(msg.id, 'para-mi'); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Eliminar para mí</button>
              {mine && <button onClick={() => { onDelete(msg.id, 'todos'); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10">Eliminar para todos</button>}
              {reactionsOpen && (
                <div className="flex gap-1 border-t border-[var(--border)] p-2">
                  {QUICK_REACTIONS.map(reaction => (
                    <button key={reaction} onClick={() => { onReact(msg, reaction); setMenu(false); setReactionsOpen(false); }} className="grid size-8 place-items-center rounded-lg text-lg hover:bg-[var(--bg-elevated)]">
                      {reaction}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {!!msg.reactions?.length && (
          <div className={cn('mt-1 flex flex-wrap gap-1', mine && 'justify-end')}>
            {msg.reactions.map(reaction => (
              <button
                key={reaction.reactionType}
                onClick={() => onReact(msg, reaction.reactionType)}
                className={cn('rounded-full border px-2 py-0.5 text-[11px] shadow-sm', reaction.mine ? 'border-[var(--brand)] bg-[var(--brand-muted)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)]')}
              >
                {reaction.reactionType} {reaction.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupInfoPanel({
  detail, attachments, links, currentRole, onClose, onChanged,
}: {
  detail: BChatGrupoDetalle;
  attachments: GroupAttachment[];
  links: GroupSharedLink[];
  currentRole?: ChatGrupoRol;
  onClose?: () => void;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(detail.nombre);
  const [description, setDescription] = useState(detail.descripcion ?? '');
  const [type, setType] = useState(detail.tipo);
  const [photo, setPhoto] = useState(detail.foto ?? undefined);
  const isAdmin = canAdmin(currentRole);
  const isOwner = currentRole === 'OWNER';

  useEffect(() => {
    const id = setTimeout(async () => {
      if (query.trim().length < 2) return setResults([]);
      const res = await searchService.search(query.trim());
      const memberIds = new Set(detail.miembros.map(m => m.usuarioId));
      setResults(res.users.filter(u => !memberIds.has(u.id)).slice(0, 8));
    }, 250);
    return () => clearTimeout(id);
  }, [query, detail.miembros]);

  async function add(uid: number) {
    await groupChatService.addMembers(detail.id, [uid]);
    setQuery('');
    setResults([]);
    onChanged();
  }

  async function saveInfo() {
    await groupChatService.updateGroup(detail.id, { nombre: name, descripcion: description, foto: photo, tipo: type });
    setEditing(false);
    onChanged();
  }

  async function changeRole(member: BChatGrupoMiembro, role: ChatGrupoRol) {
    await groupChatService.changeRole(detail.id, member.usuarioId, role);
    onChanged();
  }

  async function toggleMute(member: BChatGrupoMiembro) {
    await groupChatService.setMuted(detail.id, member.usuarioId, !member.silenciado);
    onChanged();
  }

  async function remove(member: BChatGrupoMiembro) {
    await groupChatService.removeMember(detail.id, member.usuarioId);
    onChanged();
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] md:w-[360px]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Info del grupo</h2>
        {onClose && <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--bg-elevated)]"><X className="size-4" /></button>}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center text-center">
          <Avatar src={photo} name={detail.nombre} size="xl" />
          {editing ? (
            <div className="mt-4 w-full space-y-2">
              <label className="mx-auto block h-9 w-max cursor-pointer rounded-xl bg-[var(--bg-elevated)] px-4 text-xs font-bold leading-9 text-[var(--text-primary)]">
                Cambiar foto
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
              <input value={name} onChange={e => setName(e.target.value)} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm" />
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm" />
              <select value={type} onChange={e => setType(e.target.value as typeof type)} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm">
                <option value="PUBLICO">Público</option>
                <option value="PRIVADO">Privado</option>
                <option value="INVITE">Solo invitación</option>
              </select>
              <button onClick={saveInfo} className="h-9 w-full rounded-xl bg-[var(--brand)] text-sm font-semibold text-white">Guardar</button>
            </div>
          ) : (
            <>
              <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">{detail.nombre}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">{detail.tipo}</p>
              {detail.descripcion && <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{detail.descripcion}</p>}
              {isAdmin && <button onClick={() => setEditing(true)} className="mt-3 h-9 rounded-xl bg-[var(--bg-elevated)] px-4 text-xs font-semibold text-[var(--text-primary)]">Editar grupo</button>}
            </>
          )}
        </div>

        {isAdmin && (
          <section className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Agregar miembros</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar usuarios" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-3 text-sm" />
            </div>
            {results.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)]">
                {results.map(u => (
                  <button key={u.id} onClick={() => add(u.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-elevated)]">
                    <Avatar src={u.avatarUrl} name={u.username} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{u.username}</span>
                    <UserPlus className="size-4 text-[var(--brand)]" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Miembros ({detail.miembros.length})</p>
          <div className="space-y-2">
            {detail.miembros.map(member => (
              <div key={member.usuarioId} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                <div className="flex items-center gap-2">
                  <Avatar src={member.foto} name={member.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.nombre}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{member.carrera ?? member.rol}</p>
                  </div>
                  <span className="rounded-full bg-[var(--brand-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">{member.rol}</span>
                </div>
                {isAdmin && roleRank(currentRole) > roleRank(member.rol) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {isOwner && member.rol !== 'OWNER' && (
                      <select value={member.rol} onChange={e => changeRole(member, e.target.value as ChatGrupoRol)} className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 text-xs">
                        <option value="MIEMBRO">Miembro</option>
                        <option value="MODERADOR">Moderador</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                    <button onClick={() => toggleMute(member)} className="grid size-8 place-items-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)]">
                      {member.silenciado ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                    </button>
                    <button onClick={() => remove(member)} className="grid size-8 place-items-center rounded-lg bg-red-500/10 text-red-500"><UserMinus className="size-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Archivos compartidos</p>
          <div className="space-y-2">
            {attachments.slice(0, 8).map(file => (
              <button key={file.id} type="button" onClick={() => void openSecureAttachment(file.url, file.nombreArchivo ?? 'archivo')} className="flex w-full items-center gap-2 rounded-xl bg-[var(--bg-elevated)] p-2 text-left">
                {file.tipo === 'IMAGE' ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                <span className="min-w-0 flex-1 truncate text-xs">{file.nombreArchivo ?? 'Archivo'}</span>
              </button>
            ))}
            {attachments.length === 0 && <p className="text-xs text-[var(--text-muted)]">Sin archivos.</p>}
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Links compartidos</p>
          <div className="space-y-2">
            {links.slice(0, 8).flatMap(link => extractLinks(link.contenido).map(url => (
              <a key={`${link.mensajeId}-${url}`} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[var(--bg-elevated)] p-2">
                <LinkIcon className="size-4" />
                <span className="min-w-0 flex-1 truncate text-xs">{url}</span>
              </a>
            )))}
            {links.length === 0 && <p className="text-xs text-[var(--text-muted)]">Sin links.</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}

export function GroupChatThread({ groupId, showBack = false }: { groupId: number; showBack?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const [detail, setDetail] = useState<BChatGrupoDetalle | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [attachments, setAttachments] = useState<GroupAttachment[]>([]);
  const [links, setLinks] = useState<GroupSharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [editing, setEditing] = useState<GroupMessage | null>(null);
  const [forwarding, setForwarding] = useState<GroupMessage | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileProgresses, setFileProgresses] = useState<Record<string, number>>({});
  const [currentUploadKey, setCurrentUploadKey] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<AttachmentViewerItem | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  const membersById = useMemo(() => new Map((detail?.miembros ?? []).map(m => [m.usuarioId, m])), [detail]);
  const mediaMessages = useMemo(
    () => messages.filter(msg => !msg.eliminado && (msg.archivoUrl || msg.fileUrl || msg.nombreArchivo || msg.fileName)),
    [messages],
  );
  const attachmentViewerItems = useMemo<AttachmentViewerItem[]>(
    () => mediaMessages.map(msg => ({
      url: (msg.archivoUrl ?? msg.fileUrl)!,
      fileName: msg.nombreArchivo ?? msg.fileName ?? msg.content ?? 'archivo',
      type: msg.tipo,
    })).filter(item => Boolean(item.url)),
    [mediaMessages],
  );
  /* gallery items for MediaGallery */
  const galleryItems = useMemo<GalleryItem[]>(
    () => [
      ...mediaMessages
        .filter(msg => Boolean(msg.archivoUrl ?? msg.fileUrl))
        .map(msg => ({
          id: msg.id,
          url: (msg.archivoUrl ?? msg.fileUrl)!,
          fileName: msg.nombreArchivo ?? msg.fileName ?? 'archivo',
          tipo: msg.tipo,
          fileType: msg.fileType ?? null,
          fileSize: msg.fileSize ?? null,
          content: msg.content ?? null,
          createdAt: msg.createdAt ?? null,
        })),
      ...messages
        .filter(msg => !msg.eliminado && msg.tipo === 'TEXT' && /https?:\/\//i.test(msg.content ?? ''))
        .map(msg => ({
          id: msg.id,
          url: '',
          fileName: '',
          tipo: 'TEXT' as const,
          fileType: null,
          fileSize: null,
          content: msg.content ?? null,
          createdAt: msg.createdAt ?? null,
        })),
    ],
    [mediaMessages, messages],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2000);
  }

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  const load = useCallback(async () => {
    if (!Number.isFinite(groupId) || groupId <= 0) {
      router.replace('/messages');
      return;
    }
    try {
      setError('');
      const [d, msgs] = await Promise.all([
        groupChatService.getDetail(groupId),
        groupChatService.getMessagesPage(groupId, { limit: 50 }),
      ]);
      setDetail(d);
      setMessages(msgs.filter(hasRenderableMessage));
      setHasOlder(msgs.length >= 50);
    } catch {
      setError('No se pudo abrir este grupo. Revisa que pertenezcas al grupo y que tu sesión siga activa.');
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    const id = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const unsubState = stompClient.onState(setWsConnected);
    const unsubEvents = stompClient.subscribe(`/topic/grupos/${groupId}/events`, body => {
      const event = body as { type?: string; messageId?: number; message?: GroupMessage | BChatGrupoMensaje };
      if (!event.type) return;
      if (event.type === 'message.created' && event.message) {
        const message = mapGroupMessage(event.message);
        if (hasRenderableMessage(message)) {
          const shouldScroll = isAtBottom.current || message.senderId === user?.id;
          setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
          if (message.senderId !== user?.id) void groupChatService.markRead(groupId).catch(() => {});
          if (shouldScroll) {
            isAtBottom.current = true;
            window.setTimeout(() => scrollToBottom('smooth'), 50);
          }
        }
      }
      if ((event.type === 'message.updated' || event.type === 'reaction.updated') && event.message) {
        const message = mapGroupMessage(event.message);
        setMessages(prev => prev.map(m => m.id === message.id ? message : m).filter(hasRenderableMessage));
        if (event.type === 'message.updated') {
          setPinnedMessages(prev => message.pinned
            ? [message, ...prev.filter(item => item.id !== message.id)]
            : prev.filter(item => item.id !== message.id));
        }
      }
      if (event.type === 'message.deleted') {
        setMessages(prev => prev.map(m => m.id === event.messageId ? { ...m, eliminado: true, content: 'Este mensaje fue eliminado' } : m));
      }
    });
    const unsubTyping = stompClient.subscribe(`/topic/grupos/${groupId}/typing`, body => {
      const event = body as { usuarioId?: number; nombre?: string; typing?: boolean };
      if (!event.usuarioId || event.usuarioId === user?.id) return;
      setTypingUsers(prev => {
        const next = { ...prev };
        if (event.typing) next[event.usuarioId!] = event.nombre ?? 'Alguien';
        else delete next[event.usuarioId!];
        return next;
      });
      if (event.typing) {
        window.setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[event.usuarioId!];
            return next;
          });
        }, 3500);
      }
    });
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      stompClient.send(`/app/grupos/${groupId}/typing`, { typing: false });
      unsubState();
      unsubEvents();
      unsubTyping();
    };
  }, [groupId, scrollToBottom, user?.id]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    void groupChatService.markRead(groupId).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    let cancelled = false;
    async function loadSideData() {
      const [files, sharedLinks] = await Promise.allSettled([
        groupChatService.getAttachments(groupId),
        groupChatService.getLinks(groupId),
      ]);
      if (cancelled) return;
      if (files.status === 'fulfilled') setAttachments(files.value);
      if (sharedLinks.status === 'fulfilled') setLinks(sharedLinks.value);
    }
    void loadSideData();
    return () => { cancelled = true; };
  }, [groupId, messages.length]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    let cancelled = false;
    groupChatService.getPinned(groupId)
      .then(items => {
        if (!cancelled) setPinnedMessages(items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [groupId]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = (await groupChatService.getMessages(groupId)).filter(hasRenderableMessage);
        setMessages(prev => {
          const lastPrev = prev.at(-1)?.id;
          const lastNext = next.at(-1)?.id;
          if (prev.length !== next.length || lastPrev !== lastNext) {
            const shouldScroll = isAtBottom.current;
            window.setTimeout(() => { if (shouldScroll) scrollToBottom('smooth'); }, 50);
            return next;
          }
          return prev;
        });
      } catch {
        // Polling must not kick the user out of an open chat.
      }
    }, wsConnected ? 30000 : 8000);
    return () => window.clearInterval(id);
  }, [groupId, scrollToBottom, wsConnected]);

  useEffect(() => {
    if (isAtBottom.current) scrollToBottom(loading ? 'instant' : 'smooth');
  }, [messages.length, loading, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    };
    el.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const keepBottomVisible = () => {
      if (isAtBottom.current) scrollToBottom('instant');
    };
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('textarea,input')) {
        window.setTimeout(keepBottomVisible, 80);
      }
    };
    window.visualViewport?.addEventListener('resize', keepBottomVisible);
    window.visualViewport?.addEventListener('scroll', keepBottomVisible);
    document.addEventListener('focusin', handleFocus);
    return () => {
      window.visualViewport?.removeEventListener('resize', keepBottomVisible);
      window.visualViewport?.removeEventListener('scroll', keepBottomVisible);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [scrollToBottom]);

  useEffect(() => {
    return () => {
      Object.values(filePreviews).forEach(URL.revokeObjectURL);
    };
  }, [filePreviews]);

  function fileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const invalid = selected.find(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      return !ALLOWED_EXTENSIONS.has(ext) || file.size > MAX_ATTACHMENT_SIZE;
    });
    if (invalid) {
      setError(invalid.size > MAX_ATTACHMENT_SIZE ? 'Archivo demasiado pesado. Máximo 10 MB.' : 'Tipo no permitido. Usa imagen, documento o audio compatible.');
      e.target.value = '';
      return;
    }
    setError('');
    setFiles(prev => [...prev, ...selected]);
    setFilePreviews(prev => {
      const next = { ...prev };
      selected.forEach(file => {
        if (file.type.startsWith('image/')) next[fileKey(file)] = URL.createObjectURL(file);
      });
      return next;
    });
    e.target.value = '';
  }

  function clearSelectedFile(file?: File) {
    if (!file) {
      Object.values(filePreviews).forEach(URL.revokeObjectURL);
      setFiles([]);
      setFilePreviews({});
      return;
    }
    const key = fileKey(file);
    setFiles(prev => prev.filter(item => fileKey(item) !== key));
    setFilePreviews(prev => {
      const next = { ...prev };
      if (next[key]) URL.revokeObjectURL(next[key]);
      delete next[key];
      return next;
    });
  }

  function sendTyping() {
    if (!typingTimerRef.current) stompClient.send(`/app/grupos/${groupId}/typing`, { typing: true });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      stompClient.send(`/app/grupos/${groupId}/typing`, { typing: false });
      typingTimerRef.current = null;
    }, 1200);
  }

  async function loadOlder() {
    const firstId = messages[0]?.id;
    const el = scrollRef.current;
    if (!el || !firstId || loadingOlder || !hasOlder) return;
    const previousHeight = el.scrollHeight;
    setLoadingOlder(true);
    try {
      const older = (await groupChatService.getMessagesPage(groupId, { beforeId: firstId, limit: 50 })).filter(hasRenderableMessage);
      setHasOlder(older.length >= 50);
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.id));
        return [...older.filter(m => !seen.has(m.id)), ...prev];
      });
      window.requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - previousHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send() {
    if ((!text.trim() && files.length === 0) || sending) return;
    setSending(true);
    stompClient.send(`/app/grupos/${groupId}/typing`, { typing: false });
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    try {
      setError('');
      let msg: GroupMessage;
      if (editing) {
        msg = await groupChatService.editMessage(groupId, editing.id, text.trim());
        setMessages(prev => prev.map(item => item.id === msg.id ? msg : item));
      } else if (files.length > 0) {
        setFileProgresses({});
        for (let index = 0; index < files.length; index++) {
          const file = files[index];
          const key = fileKey(file);
          setCurrentUploadKey(key);
          setUploadProgress(0);
          setFileProgresses(prev => ({ ...prev, [key]: 0 }));
          msg = await groupChatService.sendWithAttachment(groupId, index === 0 ? text.trim() : '', file, {
            replyToMessageId: replyTo?.id,
            messageType: isAudioFile(file) ? 'AUDIO' : undefined,
            onProgress: (p) => {
              setUploadProgress(p);
              setFileProgresses(prev => ({ ...prev, [key]: p }));
            },
          });
          setFileProgresses(prev => ({ ...prev, [key]: 100 }));
          setMessages(prev => hasRenderableMessage(msg) && !prev.some(m => m.id === msg.id) ? [...prev, msg] : prev);
          isAtBottom.current = true;
          window.setTimeout(() => scrollToBottom('smooth'), 50);
        }
        setFileProgresses({});
        setCurrentUploadKey(null);
      } else {
        msg = await groupChatService.sendMessage(groupId, { contenido: text.trim(), replyToMessageId: replyTo?.id });
        setMessages(prev => hasRenderableMessage(msg) && !prev.some(m => m.id === msg.id) ? [...prev, msg] : prev);
        isAtBottom.current = true;
        window.setTimeout(() => scrollToBottom('smooth'), 50);
      }
      setText('');
      setReplyTo(null);
      setEditing(null);
      clearSelectedFile();
      setUploadProgress(0);
      void groupChatService.markRead(groupId);
      void Promise.allSettled([
        groupChatService.getAttachments(groupId).then(setAttachments),
        groupChatService.getLinks(groupId).then(setLinks),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje. Verifica tu conexión o permisos del grupo.');
    } finally {
      setSending(false);
    }
  }

  async function deleteMessageMode(id: number, mode: 'todos' | 'para-mi') {
    try {
      await groupChatService.deleteMessage(groupId, id, mode);
      setMessages(prev => mode === 'para-mi'
        ? prev.filter(m => m.id !== id)
        : prev.map(m => m.id === id ? { ...m, eliminado: true, content: 'Este mensaje fue eliminado', archivoUrl: null, fileUrl: null, nombreArchivo: null, fileName: null } : m));
      if (mode === 'todos') setPinnedMessages(prev => prev.filter(msg => msg.id !== id));
    } catch {
      showToast('No se pudo eliminar');
    }
  }

  async function reactToMessage(msg: GroupMessage, reactionType: string) {
    const updated = await groupChatService.react(groupId, msg.id, reactionType);
    setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
  }

  function startEdit(msg: GroupMessage) {
    if (msg.eliminado || msg.tipo !== 'TEXT') {
      showToast('Solo puedes editar mensajes de texto activos');
      return;
    }
    setEditing(msg);
    setReplyTo(null);
    setText(msg.content);
  }

  function jumpToMessage(id: number) {
    document.getElementById(`group-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openMessageAttachment(msg: GroupMessage) {
    const url = msg.archivoUrl ?? msg.fileUrl;
    if (!url) return;
    setViewerItem({
      url,
      fileName: msg.nombreArchivo ?? msg.fileName ?? msg.content ?? 'archivo',
      type: msg.tipo,
    });
  }

  async function forwardToGroup(targetGroupId: number) {
    if (!forwarding) return;
    try {
      const forwarded = await groupChatService.forwardMessage(groupId, forwarding.id, targetGroupId);
      if (targetGroupId === groupId && hasRenderableMessage(forwarded)) setMessages(prev => [...prev, forwarded]);
      setForwarding(null);
      showToast('Mensaje reenviado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reenviar';
      showToast(message);
      throw err;
    }
  }

  async function forwardToUser(recipientId: number) {
    if (!forwarding) return;
    try {
      await groupChatService.forwardMessageToUser(groupId, forwarding.id, recipientId);
      setForwarding(null);
      showToast('Mensaje reenviado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reenviar';
      showToast(message);
      throw err;
    }
  }

  async function handleCopy(content: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const area = document.createElement('textarea');
        area.value = content;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      showToast('Mensaje copiado');
    } catch {
      showToast('No se pudo copiar');
    }
  }

  async function togglePin(msg: GroupMessage) {
    try {
      const updated = await groupChatService.pin(groupId, msg.id, !msg.pinned);
      setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
      setPinnedMessages(prev => updated.pinned
        ? [updated, ...prev.filter(item => item.id !== updated.id)]
        : prev.filter(item => item.id !== updated.id));
      showToast(updated.pinned ? 'Mensaje fijado' : 'Mensaje desfijado');
    } catch {
      showToast('No se pudo actualizar fijado');
    }
  }

  const grouped: Array<{ type: 'date'; label: string } | { type: 'msg'; msg: GroupMessage }> = [];
  let prevDate: Date | null = null;
  messages.forEach(msg => {
    if (!hasRenderableMessage(msg)) return;
    const date = validDate(msg.createdAt);
    if (date && (!prevDate || !sameDay(prevDate, date))) grouped.push({ type: 'date', label: dayLabel(date) });
    grouped.push({ type: 'msg', msg });
    if (date) prevDate = date;
  });

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-base)]">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)]/95 px-3 py-2.5 backdrop-blur">
          {showBack && <button onClick={() => router.back()} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-[var(--bg-elevated)]"><ArrowLeft className="size-4" /></button>}
          <button onClick={() => setInfoOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar src={detail?.foto ?? undefined} name={detail?.nombre ?? 'Grupo'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">{detail?.nombre ?? 'Grupo'}</p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">{detail ? `${detail.miembros.length} miembros · ${detail.tipo}` : 'Cargando'}</p>
            </div>
          </button>
          <button onClick={() => setMediaOpen(v => !v)} className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><ImageIcon className="size-4" /></button>
          <button onClick={() => setInfoOpen(true)} className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><Info className="size-4" /></button>
          <button className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><MoreVertical className="size-4" /></button>
        </header>

        {mediaOpen && (
          <MediaGallery
            items={galleryItems}
            title={`Archivos — ${detail?.nombre ?? 'Grupo'}`}
            onOpen={galleryItem => {
              if (!galleryItem.url) return;
              setViewerItem({ url: galleryItem.url, fileName: galleryItem.fileName, type: galleryItem.tipo });
            }}
            onClose={() => setMediaOpen(false)}
          />
        )}

        {pinnedMessages.length > 0 && (
          <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
            <button
              type="button"
              onClick={() => setPinnedOpen(v => !v)}
              className="w-full truncate text-left text-[11px] font-medium text-[var(--brand)]"
            >
              Fijados ({pinnedMessages.length}): {pinnedMessages[0].content || pinnedMessages[0].nombreArchivo || messageKindLabel(pinnedMessages[0].tipo)}
            </button>
            {pinnedOpen && (
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {pinnedMessages.map(msg => (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => {
                      setPinnedOpen(false);
                      jumpToMessage(msg.id);
                    }}
                    className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                  >
                    {messageKindLabel(msg.tipo)} · {msg.content || msg.nombreArchivo || 'Mensaje fijado'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 touch-pan-y overscroll-contain overflow-y-auto px-3 py-4">
          {loading ? (
            <div className="flex justify-center py-12"><span className="size-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" /></div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]"><AtSign className="size-7 text-[var(--text-muted)]" /></div>
                <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Empieza la conversación</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Comparte avances, archivos o acuerdos del equipo.</p>
              </div>
            </div>
          ) : (
            <>
              {hasOlder && (
                <div className="mb-3 flex justify-center">
                  <button onClick={() => void loadOlder()} disabled={loadingOlder} className="rounded-full bg-[var(--bg-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] shadow-sm disabled:opacity-60">
                    {loadingOlder ? 'Cargando...' : 'Cargar anteriores'}
                  </button>
                </div>
              )}
              {grouped.map((item, idx) => item.type === 'date' ? (
                <div key={`d-${idx}`} className="my-3 flex justify-center"><span className="rounded-full bg-[var(--bg-surface)] px-3 py-1 text-[11px] font-semibold capitalize text-[var(--text-muted)]">{item.label}</span></div>
              ) : (
                <div id={`group-msg-${item.msg.id}`} key={item.msg.id} className="scroll-mt-24">
              <GroupBubble
                msg={item.msg}
                mine={item.msg.senderId === user?.id}
                member={membersById.get(item.msg.senderId)}
                onReply={msg => { setReplyTo(msg); setEditing(null); }}
                onEdit={startEdit}
                onReact={reactToMessage}
                onForward={setForwarding}
                onDelete={deleteMessageMode}
                onJumpTo={jumpToMessage}
                onCopy={handleCopy}
                onPin={togglePin}
                onOpenAttachment={openMessageAttachment}
              />
                </div>
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          {Object.keys(typingUsers).length > 0 && (
            <p className="mb-2 px-2 text-[11px] font-medium text-[var(--brand)]">
              {Object.values(typingUsers).slice(0, 2).join(', ')} {Object.keys(typingUsers).length === 1 ? 'está escribiendo...' : 'están escribiendo...'}
            </p>
          )}
          {error && <p className="mb-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">{error}</p>}
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-[var(--brand)] bg-[var(--brand-muted)] px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--brand)]">Respondiendo a {membersById.get(replyTo.senderId)?.nombre ?? replyTo.senderName ?? 'Usuario'}</p>
                <p className="truncate text-[var(--text-muted)]">{replyTo.eliminado ? 'Mensaje eliminado' : replyTo.content || 'Archivo'}</p>
              </div>
              <button onClick={() => setReplyTo(null)}><X className="size-4" /></button>
            </div>
          )}
          {editing && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-600">Editando mensaje</p>
                <p className="truncate text-[var(--text-muted)]">{editing.content}</p>
              </div>
              <button onClick={() => { setEditing(null); setText(''); }}><X className="size-4" /></button>
            </div>
          )}
          {files.length > 0 && (
            <div className="mb-2">
              <div className="flex max-h-32 gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {files.map(file => {
                  const key = fileKey(file);
                  const filePct = fileProgresses[key];
                  const isUp = sending && currentUploadKey === key;
                  const isDone = sending && filePct === 100;
                  return (
                    <div key={key} className="flex w-48 shrink-0 flex-col gap-2 rounded-xl bg-[var(--bg-elevated)] p-2.5">
                      <div className="flex items-center gap-2">
                        {filePreviews[key]
                          ? <img src={filePreviews[key]} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
                          : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--brand-muted)] text-xl">
                              {isAudioFile(file) ? '🎵' : file.name.endsWith('.pdf') ? '📄' : '📎'}
                            </span>
                        }
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-[var(--text-primary)]">{file.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        {!sending && (
                          <button onClick={() => clearSelectedFile(file)} className="shrink-0">
                            <X className="size-4 text-[var(--text-muted)] hover:text-red-500" />
                          </button>
                        )}
                      </div>
                      {(isUp || isDone) && (
                        <div>
                          <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-base)]">
                            <div className={`h-full transition-all duration-150 ${isDone ? 'bg-emerald-500' : 'bg-[var(--brand)]'}`}
                              style={{ width: `${filePct ?? 0}%` }} />
                          </div>
                          <p className="mt-0.5 text-right text-[10px] text-[var(--text-muted)]">
                            {isDone ? '✓ Listo' : `${filePct ?? 0}%`}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {sending && files.length > 1 && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                    <span>Subiendo {files.length} archivos…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-base)]">
                    <div className="h-full bg-[var(--brand)] transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
          {sending && files.length === 0 && uploadProgress > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded-full border-2 border-[var(--brand)]/30 border-t-[var(--brand)] animate-spin" />
                  Subiendo…
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full bg-[var(--brand)] transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="relative">
              <button onClick={() => setEmojiOpen(v => !v)} className="grid size-9 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><Smile className="size-5" /></button>
              {emojiOpen && (
                <div className="absolute bottom-full left-0 mb-2 grid w-64 grid-cols-5 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-xl">
                  {EMOJIS.map(e => <button key={e} onClick={() => { setText(t => t + e); setEmojiOpen(false); }} className="grid h-9 place-items-center rounded-lg text-xl hover:bg-[var(--bg-elevated)]">{e}</button>)}
                </div>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()} className="grid size-9 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><Paperclip className="size-5" /></button>
            <input ref={fileRef} type="file" onChange={onFileChange} className="hidden" accept={ATTACHMENT_ACCEPT} multiple />
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); sendTyping(); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              placeholder={editing ? 'Editar mensaje' : 'Mensaje al grupo'}
              className="max-h-32 flex-1 resize-none rounded-2xl border border-transparent bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <VoiceRecorder
              disabled={sending || Boolean(editing)}
              onSend={async (voiceFile, durationSeconds) => {
                setSending(true);
                try {
                  const msg = await groupChatService.sendWithAttachment(groupId, '', voiceFile, { replyToMessageId: replyTo?.id, messageType: 'AUDIO', durationSeconds, onProgress: setUploadProgress });
                  setMessages(prev => hasRenderableMessage(msg) && !prev.some(m => m.id === msg.id) ? [...prev, msg] : prev);
                  isAtBottom.current = true;
                  window.setTimeout(() => scrollToBottom('smooth'), 50);
                  setReplyTo(null);
                  void groupChatService.markRead(groupId);
                  void Promise.allSettled([
                    groupChatService.getAttachments(groupId).then(setAttachments),
                    groupChatService.getLinks(groupId).then(setLinks),
                  ]);
                } finally {
                  setSending(false);
                }
              }}
            />
            <button onClick={() => void send()} disabled={sending || (!text.trim() && files.length === 0)} className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)]">
              {sending ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="size-4" />}
            </button>
          </div>
        </footer>
      </section>

      {detail && <div className="hidden md:block"><GroupInfoPanel detail={detail} attachments={attachments} links={links} currentRole={detail.miRol} onChanged={load} /></div>}
      {detail && infoOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 md:hidden">
          <div className="ml-auto h-full w-[min(92vw,380px)]">
            <GroupInfoPanel detail={detail} attachments={attachments} links={links} currentRole={detail.miRol} onClose={() => setInfoOpen(false)} onChanged={load} />
          </div>
        </div>
      )}
      {forwarding && (
        <ForwardMessageModal
          onClose={() => setForwarding(null)}
          onForwardUser={forwardToUser}
          onForwardGroup={forwardToGroup}
        />
      )}
      {viewerItem && (
        <SecureAttachmentViewer
          item={viewerItem}
          items={attachmentViewerItems}
          onClose={() => setViewerItem(null)}
        />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)] shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
