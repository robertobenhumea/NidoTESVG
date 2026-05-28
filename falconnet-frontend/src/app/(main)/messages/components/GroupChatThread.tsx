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
import { SecureImage, openSecureAttachment } from './SecureAttachment';
import { VoicePlayer, VoiceRecorder } from './VoiceMessage';

const EMOJIS = ['😀','😂','😊','😍','😎','👍','👏','🙌','❤️','🔥','✨','💯','🎉','🏆','⚡','🙏','🤔','😅','🥳','👋'];
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'txt', 'webm', 'ogg', 'mp3', 'm4a', 'mp4', 'wav']);
const LONG_PRESS_MS = 650;
const LONG_PRESS_MOVE_PX = 10;

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
  msg, mine, member, onReply, onEdit, onReact, onForward, onDelete, onJumpTo,
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
              <p className="truncate">{msg.replyPreview.eliminado ? 'Mensaje eliminado' : msg.replyPreview.content}</p>
            </button>
          )}
          {msg.eliminado ? (
            <p className="text-sm italic opacity-70">Mensaje eliminado</p>
          ) : (
            <>
              {msg.tipo === 'IMAGE' && (msg.archivoUrl || msg.fileUrl) && (
                <button type="button" onClick={() => void openSecureAttachment((msg.archivoUrl ?? msg.fileUrl)!, msg.nombreArchivo ?? msg.fileName ?? 'imagen')} className="mb-2 block overflow-hidden rounded-xl text-left">
                  <SecureImage src={(msg.archivoUrl ?? msg.fileUrl)!} alt={msg.nombreArchivo ?? msg.fileName ?? 'Imagen compartida'} className="max-h-80 w-full max-w-[280px] object-cover" />
                </button>
              )}
              {msg.tipo === 'DOCUMENT' && (msg.archivoUrl || msg.fileUrl) && (
                <button type="button" onClick={() => void openSecureAttachment((msg.archivoUrl ?? msg.fileUrl)!, msg.nombreArchivo ?? msg.fileName ?? 'archivo')} className={cn('mb-2 flex items-center gap-2 rounded-xl p-2 text-left', mine ? 'bg-white/10' : 'bg-[var(--bg-elevated)]')}>
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
              {mine && <button onClick={() => { onEdit(msg); setMenu(false); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]">Editar</button>}
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
  const [groups, setGroups] = useState<Array<{ id: number; nombre: string; foto?: string }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  const membersById = useMemo(() => new Map((detail?.miembros ?? []).map(m => [m.usuarioId, m])), [detail]);

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
          setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
        }
      }
      if ((event.type === 'message.updated' || event.type === 'reaction.updated') && event.message) {
        const message = mapGroupMessage(event.message);
        setMessages(prev => prev.map(m => m.id === message.id ? message : m).filter(hasRenderableMessage));
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
      unsubState();
      unsubEvents();
      unsubTyping();
    };
  }, [groupId, user?.id]);

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
      groupChatService.getGroups()
        .then(items => {
          if (!cancelled) setGroups(items.map(g => ({ id: g.id, nombre: g.nombre, foto: g.foto })));
        })
        .catch(() => {});
    }
    void loadSideData();
    return () => { cancelled = true; };
  }, [groupId, messages.length]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = (await groupChatService.getMessages(groupId)).filter(hasRenderableMessage);
        setMessages(prev => {
          const lastPrev = prev.at(-1)?.id;
          const lastNext = next.at(-1)?.id;
          return prev.length !== next.length || lastPrev !== lastNext ? next : prev;
        });
      } catch {
        // Polling must not kick the user out of an open chat.
      }
    }, wsConnected ? 30000 : 8000);
    return () => window.clearInterval(id);
  }, [groupId, wsConnected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' }); }, [messages.length, loading]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0];
    if (!next) return;
    const ext = next.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      setError('Tipo no permitido. Usa imagen, documento o audio compatible.');
      e.target.value = '';
      return;
    }
    if (next.size > MAX_ATTACHMENT_SIZE) {
      setError('Archivo demasiado pesado. Máximo 10 MB.');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(next);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(next.type.startsWith('image/') ? URL.createObjectURL(next) : null);
    e.target.value = '';
  }

  function clearSelectedFile() {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
  }

  function sendTyping() {
    stompClient.send(`/app/grupos/${groupId}/typing`, { typing: true });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      stompClient.send(`/app/grupos/${groupId}/typing`, { typing: false });
    }, 1200);
  }

  async function loadOlder() {
    const firstId = messages[0]?.id;
    if (!firstId || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const older = (await groupChatService.getMessagesPage(groupId, { beforeId: firstId, limit: 50 })).filter(hasRenderableMessage);
      setHasOlder(older.length >= 50);
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.id));
        return [...older.filter(m => !seen.has(m.id)), ...prev];
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send() {
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    try {
      setError('');
      let msg: GroupMessage;
      if (editing) {
        msg = await groupChatService.editMessage(groupId, editing.id, text.trim());
        setMessages(prev => prev.map(item => item.id === msg.id ? msg : item));
      } else if (file) {
        msg = await groupChatService.sendWithAttachment(groupId, text.trim(), file, {
          replyToMessageId: replyTo?.id,
          messageType: isAudioFile(file) ? 'AUDIO' : undefined,
        });
        setMessages(prev => hasRenderableMessage(msg) && !prev.some(m => m.id === msg.id) ? [...prev, msg] : prev);
      } else {
        msg = await groupChatService.sendMessage(groupId, { contenido: text.trim(), replyToMessageId: replyTo?.id });
        setMessages(prev => hasRenderableMessage(msg) && !prev.some(m => m.id === msg.id) ? [...prev, msg] : prev);
      }
      setText('');
      setReplyTo(null);
      setEditing(null);
      clearSelectedFile();
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
    await groupChatService.deleteMessage(groupId, id, mode);
    setMessages(prev => mode === 'para-mi'
      ? prev.filter(m => m.id !== id)
      : prev.map(m => m.id === id ? { ...m, eliminado: true, content: 'Este mensaje fue eliminado' } : m));
  }

  async function reactToMessage(msg: GroupMessage, reactionType: string) {
    const updated = await groupChatService.react(groupId, msg.id, reactionType);
    setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
  }

  function startEdit(msg: GroupMessage) {
    setEditing(msg);
    setReplyTo(null);
    setText(msg.content);
  }

  function jumpToMessage(id: number) {
    document.getElementById(`group-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function forwardTo(targetGroupId: number) {
    if (!forwarding) return;
    const forwarded = await groupChatService.forwardMessage(groupId, forwarding.id, targetGroupId);
    if (targetGroupId === groupId && hasRenderableMessage(forwarded)) setMessages(prev => [...prev, forwarded]);
    setForwarding(null);
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
          <button onClick={() => setInfoOpen(true)} className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><Info className="size-4" /></button>
          <button className="grid size-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><MoreVertical className="size-4" /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
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
          {file && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--bg-elevated)] p-2">
              {filePreview ? <img src={filePreview} alt="" className="size-11 rounded-lg object-cover" /> : <FileText className="size-5" />}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{file.name}</span>
              <button onClick={clearSelectedFile}><X className="size-4" /></button>
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
            <input ref={fileRef} type="file" onChange={onFileChange} className="hidden" accept="image/jpeg,image/png,image/webp,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.webm,.ogg,.mp3,.m4a,.mp4,.wav" />
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
                  const msg = await groupChatService.sendWithAttachment(groupId, '', voiceFile, { replyToMessageId: replyTo?.id, messageType: 'AUDIO', durationSeconds });
                  setMessages(prev => hasRenderableMessage(msg) && !prev.some(m => m.id === msg.id) ? [...prev, msg] : prev);
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
            <button onClick={() => void send()} disabled={sending || (!text.trim() && !file)} className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)]">
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
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-2xl sm:max-w-sm sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Reenviar a grupo</h3>
              <button onClick={() => setForwarding(null)} className="grid size-8 place-items-center rounded-full hover:bg-[var(--bg-elevated)]"><X className="size-4" /></button>
            </div>
            <div className="space-y-2">
              {groups.map(group => (
                <button key={group.id} onClick={() => void forwardTo(group.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--bg-elevated)]">
                  <Avatar src={group.foto} name={group.nombre} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{group.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
