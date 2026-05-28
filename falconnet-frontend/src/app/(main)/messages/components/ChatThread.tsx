'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { chatService, mapMessage } from '@/services/chat.service';
import { chatOffline } from '@/lib/chatOffline';
import { userService } from '@/services/user.service';
import { useAuth } from '@/hooks/useAuth';
import { stompClient, type ConnectionState } from '@/lib/stomp';
import type { BMensaje, Message, MessageStatus, User } from '@/types';
import { SecureImage, openSecureAttachment } from './SecureAttachment';

const POLL_MS = 5_000;
const PAGE_SIZE = 50;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'txt']);
const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

/* ── Emoji picker ─────────────────────────────────────────── */
const EMOJIS = [
  '😀','😂','🥹','😊','😍','🤩','😎','🥰','😘','🤣',
  '😭','😤','😱','🤔','🫡','🙏','👍','👏','🙌','💪',
  '❤️','🔥','✨','💯','🎉','🎊','🥳','🏆','⚡','💫',
  '👋','🫶','💀','🤯','😅','😬','🥺','😏','🤭','🫠',
];

/* ── Date utils ───────────────────────────────────────────── */
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function dayLabel(date: Date): string {
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return 'Hoy';
  if (sameDay(date, yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' });
}
function timeStr(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  catch { return ''; }
}

function lastSeenLabel(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `últ. vez ${date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
}

function fileSizeLabel(size?: number | null): string {
  if (!size || !Number.isFinite(size)) return 'Documento';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function hasVisibleMessage(msg: Message): boolean {
  if (msg.eliminado) return true;
  if ((msg.content ?? '').trim()) return true;
  return Boolean((msg.tipo === 'IMAGE' || msg.tipo === 'DOCUMENT') && msg.archivoUrl);
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map<number, Message>();
  for (const msg of current) byId.set(msg.id, msg);
  for (const msg of incoming) byId.set(msg.id, msg);
  return [...byId.values()].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return timeDiff !== 0 ? timeDiff : a.id - b.id;
  });
}

function mergeConfirmedMessage(current: Message[], tempId: number, confirmed: Message): Message[] {
  const withoutTemp = current.filter(msg => msg.id !== tempId);
  return mergeMessages(withoutTemp, [confirmed]);
}

function dmConversationId(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function hashQueuedId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return Math.abs(hash || Date.now());
}

type DMRealtimeEvent = {
  eventType?: 'DM_MESSAGE_CREATED' | 'DM_MESSAGE_DELETED' | 'DM_READ' | 'DM_TYPING' | 'DM_CONNECTION_STATUS' | 'DM_MESSAGE_SENT' | 'DM_MESSAGE_DELIVERED' | 'DM_MESSAGE_READ' | 'DM_REACTION_UPDATED' | 'DM_MESSAGE_EDITED' | 'DM_MESSAGE_PINNED';
  conversationId?: string;
  messageId?: number | null;
  senderId?: number;
  recipientId?: number;
  createdAt?: string;
  payload?: unknown;
};

/* ── Message bubble ───────────────────────────────────────── */
interface BubbleProps {
  msg: Message;
  isOwn: boolean;
  showTail: boolean;
  onReply: (msg: Message) => void;
  onDelete: (id: number) => void;
  onCopy:   (text: string) => void;
  onRetry: (msg: Message) => void;
  onReact: (msg: Message, reaction: string) => void;
  onEdit: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onDeleteForMe: (id: number) => void;
  onPin: (msg: Message) => void;
  onReport: (msg: Message) => void;
}

function statusLabel(status?: MessageStatus) {
  switch (status) {
    case 'PENDING': return 'enviando';
    case 'SENT': return 'enviado';
    case 'DELIVERED': return 'entregado';
    case 'READ': return 'visto';
    case 'FAILED': return 'error';
    default: return '';
  }
}

function StatusIcon({ status }: { status?: MessageStatus }) {
  if (status === 'PENDING') {
    return <span title="Enviando" className="text-[10px] leading-none">◷</span>;
  }
  if (status === 'FAILED') {
    return <span title="Error de envío" className="text-[10px] font-bold text-red-200 leading-none">!</span>;
  }
  if (status === 'READ') {
    return (
      <svg aria-label="Visto" className="size-3.5 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 2 9 13 5 9" /><polyline points="23 2 14 13 10 9" />
      </svg>
    );
  }
  if (status === 'DELIVERED') {
    return (
      <svg aria-label="Entregado" className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 2 9 13 5 9" /><polyline points="23 2 14 13 10 9" />
      </svg>
    );
  }
  return (
    <svg aria-label="Enviado" className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Bubble({ msg, isOwn, showTail, onReply, onDelete, onCopy, onRetry, onReact, onEdit, onForward, onDeleteForMe, onPin, onReport }: BubbleProps) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  if (msg.eliminado) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5`}>
        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs italic flex items-center gap-1.5 ${
          isOwn ? 'bg-[var(--brand)]/30 text-white/60 rounded-br-md' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-bl-md'
        }`}>
          <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Mensaje eliminado
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5 group`}>
      <div className="relative max-w-[78%] sm:max-w-[68%]">
        {/* Quoted reply */}
        {msg.referencia && (
          <div className={`mb-1 px-2.5 py-1.5 rounded-xl border-l-4 text-xs ${
            isOwn
              ? 'bg-white/10 border-white/40 text-white/70'
              : 'bg-[var(--bg-surface)] border-[var(--brand)] text-[var(--text-muted)]'
          }`}>
            <p className={`font-semibold mb-0.5 truncate ${isOwn ? 'text-white/80' : 'text-[var(--brand)]'}`}>
              {msg.referencia.senderName}
            </p>
            <p className="truncate">{msg.referencia.tipo !== 'TEXT' ? 'Archivo' : msg.referencia.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={`mb-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {REACTIONS.map(reaction => (
            <button
              key={reaction}
              type="button"
              onClick={() => onReact(msg, reaction)}
              className="text-xs rounded-full bg-[var(--bg-surface)] px-1.5 py-0.5 shadow-sm hover:bg-[var(--bg-elevated)]"
            >
              {reaction}
            </button>
          ))}
        </div>
        <div
          onContextMenu={e => { e.preventDefault(); setMenu(true); }}
          onTouchStart={() => { const t = setTimeout(() => setMenu(true), 500); return () => clearTimeout(t); }}
          className={`relative px-3 py-2 rounded-2xl ${
            isOwn
              ? `bg-[var(--brand)] text-white ${showTail ? 'rounded-br-sm' : ''}`
              : `bg-[var(--bg-elevated)] text-[var(--text-primary)] ${showTail ? 'rounded-bl-sm' : ''}`
          }`}
        >
          {/* Image */}
          {msg.tipo === 'IMAGE' && msg.archivoUrl && (
            <button
              type="button"
              onClick={() => void openSecureAttachment(msg.archivoUrl!, msg.nombreArchivo ?? 'imagen')}
              className="block mb-1.5 text-left"
            >
              <SecureImage
                src={msg.archivoUrl}
                alt={msg.nombreArchivo ?? 'Imagen'}
                className="max-w-[220px] rounded-xl object-cover"
              />
            </button>
          )}

          {/* File */}
          {msg.tipo === 'DOCUMENT' && msg.archivoUrl && (
            <button
              type="button"
              onClick={() => void openSecureAttachment(msg.archivoUrl!, msg.nombreArchivo ?? 'archivo')}
              className={`flex items-center gap-2 mb-1.5 p-2 rounded-xl ${isOwn ? 'bg-white/10' : 'bg-[var(--bg-surface)]'}`}
            >
              <span className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : 'bg-[var(--brand-muted)]'}`}>
                <svg className={`size-5 ${isOwn ? 'text-white' : 'text-[var(--brand)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${isOwn ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  {msg.nombreArchivo ?? 'Archivo'}
                </p>
                <p className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>{fileSizeLabel(msg.fileSize)} · Abrir/descargar</p>
              </div>
            </button>
          )}

          {/* Text */}
          {msg.reenviado && (
            <p className={`mb-1 text-[10px] italic ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>Reenviado</p>
          )}
          {(msg.tipo === 'TEXT' || !msg.tipo) && (
            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
          )}
          {msg.tipo === 'IMAGE' && msg.content && (
            <p className="text-xs leading-relaxed break-words mt-1">{msg.content}</p>
          )}

          {/* Footer: time + read receipt */}
          <div className={`flex items-center justify-end gap-1 mt-0.5 ${isOwn ? 'text-white/55' : 'text-[var(--text-muted)]'}`}>
            {msg.editado && <span className="text-[10px]">editado</span>}
            <span className="text-[10px] tabular-nums">{timeStr(msg.createdAt)}</span>
            {isOwn && <StatusIcon status={msg.status ?? (msg.read ? 'READ' : 'SENT')} />}
          </div>
        </div>
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`mt-1 flex gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {msg.reactions.map(reaction => (
              <button
                key={reaction.reactionType}
                type="button"
                onClick={() => onReact(msg, reaction.reactionType)}
                className={`rounded-full bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] shadow-sm ${reaction.mine ? 'ring-1 ring-[var(--brand)]' : ''}`}
              >
                {reaction.reactionType} {reaction.count}
              </button>
            ))}
          </div>
        )}
        {isOwn && msg.status === 'FAILED' && (
          <button
            type="button"
            onClick={() => onRetry(msg)}
            className="mt-1 ml-auto flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-400"
          >
            Reintentar
          </button>
        )}

        {/* Context menu */}
        {menu && (
          <div
            ref={menuRef}
            className={`absolute z-30 bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden min-w-[140px] animate-fade-in`}
          >
            <button onClick={() => { onReply(msg); setMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              <svg className="size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
              Responder
            </button>
            {isOwn && msg.tipo === 'TEXT' && (
              <button onClick={() => { onEdit(msg); setMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                Editar
              </button>
            )}
            <button onClick={() => { onForward(msg); setMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              Reenviar
            </button>
            <button onClick={() => { onPin(msg); setMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              {msg.pinned ? 'Desfijar' : 'Fijar'}
            </button>
            <button onClick={() => { onReport(msg); setMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              Reportar
            </button>
            {msg.tipo === 'TEXT' && (
              <button onClick={() => { onCopy(msg.content); setMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                <svg className="size-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copiar
              </button>
            )}
            {isOwn && msg.status !== 'PENDING' && msg.status !== 'FAILED' && (
              <button onClick={() => { onDelete(msg.id); setMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                Eliminar
              </button>
            )}
            <button onClick={() => { onDeleteForMe(msg.id); setMenu(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
              Eliminar para mí
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Chat input ────────────────────────────────────────────── */
interface ChatInputProps {
  partnerId: number;
  partnerName: string;
  replyTo: Message | null;
  onClearReply: () => void;
  onSent: (msg: Message) => void;
  onSendText: (content: string, referenciaId?: number) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function ChatInput({ partnerId, partnerName, replyTo, onClearReply, onSent, onSendText, onTyping, disabled = false, disabledReason }: ChatInputProps) {
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attPreview, setAttPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const textRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmoji) return;
    function close(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showEmoji]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      setError('Tipo no permitido. Usa jpg, jpeg, png, webp, pdf, doc, docx o txt.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('Archivo demasiado pesado. Máximo 10 MB.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setError('');
    setAttachment(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setAttPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttPreview(null);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeAttachment() {
    setAttachment(null);
    setAttPreview(null);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (disabled || (!trimmed && !attachment) || sending || uploading) return;
    setSending(true);

    try {
      let msg: Message;
      if (attachment) {
        setUploading(true);
        msg = await chatService.sendWithAttachment(partnerId, trimmed, attachment, { referenciaId: replyTo?.id });
        setUploading(false);
        onSent(msg);
      } else {
        await onSendText(trimmed, replyTo?.id);
      }
      setText('');
      setAttachment(null);
      setAttPreview(null);
      onClearReply();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el archivo.');
    } finally {
      setSending(false);
      setUploading(false);
      textRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const hasContent = text.trim() || attachment;

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-surface)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}>
      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <div className="flex-1 min-w-0 bg-[var(--brand-muted)] border-l-4 border-[var(--brand)] rounded-r-xl px-3 py-1.5">
            <p className="text-[11px] font-semibold text-[var(--brand)] truncate">
              {replyTo.senderId === partnerId ? partnerName : 'Tú'}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {replyTo.tipo !== 'TEXT' ? 'Archivo' : replyTo.content}
            </p>
          </div>
          <button onClick={onClearReply} className="size-6 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-[var(--bg-elevated)] rounded-xl p-2">
            {attPreview ? (
              <img src={attPreview} alt="" className="size-10 rounded-lg object-cover shrink-0" />
            ) : (
              <span className="size-10 rounded-lg bg-[var(--brand-muted)] flex items-center justify-center shrink-0">
                <svg className="size-5 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{attachment.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{(attachment.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button onClick={removeAttachment} className="size-6 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
      {error && (
        <p className="px-4 pt-2 text-xs font-medium text-red-500">{error}</p>
      )}
      {disabled && (
        <p className="px-4 pt-2 text-xs font-medium text-red-500">{disabledReason ?? 'No puedes enviar mensajes en esta conversación.'}</p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        {/* Emoji */}
        <div className="relative" ref={emojiRef}>
          <button
            onClick={() => setShowEmoji(v => !v)}
            className={`size-9 shrink-0 flex items-center justify-center rounded-full transition-colors ${showEmoji ? 'bg-[var(--brand-muted)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {showEmoji && (
            <div className="absolute bottom-full left-0 mb-2 w-72 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => { setText(t => t + e); textRef.current?.focus(); }}
                    className="h-9 flex items-center justify-center rounded-lg text-xl hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Attachment */}
        <button
          onClick={() => fileRef.current?.click()}
          className="size-9 shrink-0 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt" />

        {/* Textarea */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKey}
          placeholder={`Mensaje…`}
          rows={1}
          className="flex-1 resize-none rounded-2xl bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-4 py-2.5 border border-transparent focus:border-[var(--border-focus)] focus:outline-none transition-colors max-h-32 overflow-y-auto"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!hasContent || sending || uploading || disabled}
          aria-label="Enviar"
          className={`size-9 shrink-0 flex items-center justify-center rounded-full transition-all duration-150 ${
            hasContent && !sending && !uploading && !disabled
              ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] active:scale-95 shadow-sm shadow-[var(--brand)]/30'
              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
          }`}
        >
          {sending || uploading ? (
            <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <svg className="size-4 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main ChatThread component ────────────────────────────── */
interface ChatThreadProps {
  partnerId: number;
  showBack?: boolean;
}

export function ChatThread({ partnerId, showBack = false }: ChatThreadProps) {
  const router          = useRouter();
  const { user }        = useAuth();
  const [partner, setPartner]   = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo]   = useState<Message | null>(null);
  const [toast, setToast]       = useState('');
  const [wsState, setWsState] = useState<ConnectionState>('disconnected');
  const [typingName, setTypingName] = useState('');
  const [newMessages, setNewMessages] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [muted, setMuted] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedMe, setBlockedMe] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const typingTimerRef = useRef<number | null>(null);
  const typingClearRef = useRef<number | null>(null);
  const tempIdRef = useRef(-1);
  const partnerName = partner ? (partner.displayName ?? partner.username) : '…';
  const mediaMessages = useMemo(
    () => messages.filter(msg => !msg.eliminado && (msg.archivoUrl || msg.fileUrl || msg.fileName || msg.nombreArchivo)),
    [messages],
  );
  const visibleMessages = useMemo(() => messages.filter(hasVisibleMessage), [messages]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  const load = useCallback(async () => {
    try {
      const [msgs, partnerUser] = await Promise.all([
        chatService.getMessages(partnerId, { limit: PAGE_SIZE }),
        userService.getUser(partnerId),
      ]);
      setMessages(msgs);
      setHasMore(msgs.length === PAGE_SIZE);
      setPartner(partnerUser);
    } catch {
      router.replace('/messages');
    } finally {
      setLoading(false);
    }
  }, [partnerId, router]);

  useEffect(() => {
    chatOffline.setMessages(partnerId, messages);
  }, [messages, partnerId]);

  const flushOfflineQueue = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const queue = chatOffline.getQueue().filter(item => item.partnerId === partnerId);
    if (queue.length === 0) return;
    setSyncing(true);
    try {
      for (const item of queue) {
        try {
          const sent = await chatService.send(item.partnerId, item.content, { referenciaId: item.referenciaId });
          chatOffline.remove(item.id);
          setMessages(prev => mergeMessages(prev.filter(msg => msg.id !== -Math.abs(hashQueuedId(item.id))), [sent]));
        } catch {
          break;
        }
      }
    } finally {
      setSyncing(false);
    }
  }, [partnerId]);

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void flushOfflineQueue();
    };
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FALCONNET_CHAT_SYNC') void flushOfflineQueue();
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    navigator.serviceWorker?.addEventListener?.('message', handleSWMessage);
    updateOnline();
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      navigator.serviceWorker?.removeEventListener?.('message', handleSWMessage);
    };
  }, [flushOfflineQueue]);

  useEffect(() => {
    if (!user?.id || !Number.isFinite(partnerId) || partnerId <= 0) return;
    const conversationId = dmConversationId(user.id, partnerId);
    const unsubState = stompClient.onState((connected, state) => {
      setWsState(state);
      if (connected) stompClient.send(`/app/dm/${conversationId}/status`, { status: 'connected' });
    });
    const unsubEvents = stompClient.subscribe(`/topic/dm/${conversationId}/events`, body => {
      const event = body as DMRealtimeEvent;
      if (!event.eventType || event.conversationId !== conversationId) return;

      if (event.eventType === 'DM_MESSAGE_CREATED' && event.payload) {
        const msg = mapMessage(event.payload as BMensaje);
        if (!hasVisibleMessage(msg)) return;
        const shouldScroll = isAtBottom.current || msg.senderId === user.id;
        setMessages(prev => mergeMessages(prev, [msg]));
        if (msg.senderId === partnerId && msg.status !== 'READ') {
          void chatService.markDelivered(msg.id).catch(() => {});
        }
        if (shouldScroll) {
          isAtBottom.current = true;
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        } else {
          setNewMessages(count => count + 1);
        }
      }

      if ((event.eventType === 'DM_MESSAGE_SENT' || event.eventType === 'DM_MESSAGE_DELIVERED') && event.payload) {
        const msg = mapMessage(event.payload as BMensaje);
        setMessages(prev => prev.map(existing => existing.id === msg.id ? { ...existing, ...msg } : existing));
      }

      if ((event.eventType === 'DM_REACTION_UPDATED' || event.eventType === 'DM_MESSAGE_EDITED' || event.eventType === 'DM_MESSAGE_PINNED') && event.payload) {
        const msg = mapMessage(event.payload as BMensaje);
        setMessages(prev => prev.map(existing => existing.id === msg.id ? { ...existing, ...msg } : existing));
        if (event.eventType === 'DM_MESSAGE_PINNED') {
          setPinnedMessages(prev => msg.pinned ? mergeMessages(prev, [msg]) : prev.filter(item => item.id !== msg.id));
        }
      }

      if (event.eventType === 'DM_MESSAGE_DELETED' && event.messageId) {
        setMessages(prev => prev.map(m => m.id === event.messageId ? {
          ...m,
          eliminado: true,
          content: 'Mensaje eliminado',
          fileUrl: null,
          archivoUrl: null,
          fileName: null,
          nombreArchivo: null,
          fileType: null,
          fileSize: null,
        } : m));
      }

      if (event.eventType === 'DM_READ' || event.eventType === 'DM_MESSAGE_READ') {
        const payload = event.payload as { readerId?: number; senderId?: number; readAt?: string } | undefined;
        if (payload?.readerId === partnerId) {
          setMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, read: true, status: 'READ', readAt: payload.readAt ?? new Date().toISOString() } : m));
        }
      }

      if (event.eventType === 'DM_TYPING') {
        if (event.senderId === user.id) return;
        const payload = event.payload as { typing?: boolean; senderName?: string } | undefined;
        if (payload?.typing) {
          setTypingName(payload.senderName ?? partnerName);
          if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
          typingClearRef.current = window.setTimeout(() => setTypingName(''), 3500);
        } else {
          setTypingName('');
        }
      }
    });

    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      stompClient.send(`/app/dm/${conversationId}/typing`, { typing: false });
      stompClient.send(`/app/dm/${conversationId}/status`, { status: 'disconnected' });
      unsubState();
      unsubEvents();
      setTypingName('');
      setNewMessages(0);
    };
  }, [partnerId, partnerName, user?.id]);

  useEffect(() => {
    void chatService.getPinned(partnerId).then(setPinnedMessages).catch(() => {});
    void chatService.getBlockStatus(partnerId).then(status => {
      setBlockedByMe(status.blockedByMe);
      setBlockedMe(status.blockedMe);
    }).catch(() => {});
  }, [partnerId]);

  useEffect(() => {
    const id = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  // Poll for new messages
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const msgs = await chatService.getMessages(partnerId, { limit: PAGE_SIZE });
        setMessages(prev => {
          if (prev.some(m => m.status === 'PENDING' || m.status === 'FAILED')) return mergeMessages(prev, msgs);
          if (prev.length > PAGE_SIZE) return mergeMessages(prev, msgs);
          if (msgs.length !== prev.length) return msgs;
          const a = prev[prev.length - 1], b = msgs[msgs.length - 1];
          return (!a || !b || a.id !== b.id || a.read !== b.read) ? msgs : prev;
        });
      } catch { /* silent */ }
    }
    const start = () => { id = setInterval(poll, POLL_MS); };
    const stop  = () => { if (id) clearInterval(id); id = null; };
    start();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' ? start() : stop());
    return stop;
  }, [partnerId]);

  const loadOlder = useCallback(async () => {
    const el = scrollRef.current;
    const firstId = messages[0]?.id;
    if (!el || !firstId || loadingOlder || !hasMore) return;

    setLoadingOlder(true);
    const previousHeight = el.scrollHeight;
    try {
      const older = await chatService.getMessages(partnerId, { beforeId: firstId, limit: PAGE_SIZE });
      setHasMore(older.length === PAGE_SIZE);
      setMessages(prev => mergeMessages(older, prev));
      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - previousHeight;
      });
    } catch {
      showToast('No se pudieron cargar mensajes anteriores');
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, messages, partnerId]);

  // Track scroll position to know if user is at bottom and load older messages at top
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isAtBottom.current) setNewMessages(0);
      if (el.scrollTop < 80) void loadOlder();
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [loadOlder]);

  // Scroll to bottom on new messages (only if already at bottom)
  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' });
    }
  }, [messages, loading]);

  async function handleDelete(id: number) {
    try {
      await chatService.deleteMessage(id);
      setMessages(prev => prev.map(m => m.id === id ? {
        ...m,
        eliminado: true,
        content: 'Mensaje eliminado',
        fileUrl: null,
        archivoUrl: null,
        fileName: null,
        nombreArchivo: null,
        fileType: null,
        fileSize: null,
      } : m));
    } catch { /* silent */ }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('Copiado');
  }

  function handleSent(msg: Message) {
    setMessages(prev => mergeMessages(prev, [msg]));
    isAtBottom.current = true;
    setNewMessages(0);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function sendTextOptimistic(content: string, referenciaId?: number) {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const queued = !online ? chatOffline.enqueue({ partnerId, content, referenciaId }) : null;
    const tempId = queued ? -hashQueuedId(queued.id) : tempIdRef.current--;
    const tempMessage: Message = {
      id: tempId,
      senderId: user.id,
      receiverId: partnerId,
      senderName: user.displayName ?? user.username,
      content,
      createdAt: now,
      read: false,
      tipo: 'TEXT',
      eliminado: false,
      referenciaId: referenciaId ?? null,
      referencia: replyTo
        ? {
            id: replyTo.id,
            content: replyTo.eliminado ? 'Mensaje eliminado' : replyTo.content || 'Archivo',
            tipo: replyTo.tipo,
            senderId: replyTo.senderId,
            senderName: replyTo.senderId === partnerId ? partnerName : 'Tú',
          }
        : undefined,
      status: queued ? 'PENDING' : 'PENDING',
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      pending: true,
      retryContent: content,
      retryReferenciaId: referenciaId,
    };
    setMessages(prev => mergeMessages(prev, [tempMessage]));
    isAtBottom.current = true;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    if (queued) {
      showToast('Sin conexión. Se enviará al reconectar.');
      navigator.serviceWorker?.ready
        .then(reg => (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register?.('falconnet-chat-sync'))
        .catch(() => {});
      return;
    }

    try {
      const confirmed = await chatService.send(partnerId, content, { referenciaId });
      setMessages(prev => mergeConfirmedMessage(prev, tempId, confirmed));
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const queuedAfterError = chatOffline.enqueue({ partnerId, content, referenciaId });
        const queuedId = -hashQueuedId(queuedAfterError.id);
        setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, id: queuedId, status: 'PENDING', pending: true } : msg));
        return;
      }
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, status: 'FAILED', pending: false } : msg));
    }
  }

  async function retryMessage(msg: Message) {
    const content = msg.retryContent ?? msg.content;
    setMessages(prev => prev.filter(item => item.id !== msg.id));
    await sendTextOptimistic(content, msg.retryReferenciaId ?? msg.referenciaId ?? undefined);
  }

  function handleTyping() {
    if (!user?.id) return;
    const conversationId = dmConversationId(user.id, partnerId);
    stompClient.send(`/app/dm/${conversationId}/typing`, { typing: true });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      stompClient.send(`/app/dm/${conversationId}/typing`, { typing: false });
    }, 1200);
  }

  async function reactToMessage(msg: Message, reaction: string) {
    try {
      const updated = await chatService.react(msg.id, reaction);
      setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch {
      showToast('No se pudo reaccionar');
    }
  }

  async function editMessage(msg: Message) {
    const next = window.prompt('Editar mensaje', msg.content);
    if (next == null || next.trim() === msg.content) return;
    try {
      const updated = await chatService.edit(msg.id, next.trim());
      setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo editar');
    }
  }

  async function forwardMessage(msg: Message) {
    const raw = window.prompt('ID del usuario destino');
    const recipientId = raw ? Number(raw) : NaN;
    if (!Number.isFinite(recipientId) || recipientId <= 0) return;
    try {
      await chatService.forward(msg.id, recipientId);
      showToast('Mensaje reenviado');
    } catch {
      showToast('No se pudo reenviar');
    }
  }

  async function deleteForMe(id: number) {
    try {
      await chatService.deleteForMe(id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } catch {
      showToast('No se pudo eliminar');
    }
  }

  async function togglePin(msg: Message) {
    try {
      const updated = await chatService.pin(msg.id, !msg.pinned);
      setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
      setPinnedMessages(prev => updated.pinned ? mergeMessages(prev, [updated]) : prev.filter(item => item.id !== updated.id));
    } catch {
      showToast('No se pudo actualizar fijado');
    }
  }

  async function runSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchResults(await chatService.search(partnerId, query.trim(), 30));
    } catch {
      setSearchResults([]);
    }
  }

  function jumpToMessage(id: number) {
    document.getElementById(`dm-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function setArchived(archived: boolean) {
    try {
      await chatService.setConversationPreference(partnerId, { archived });
      showToast(archived ? 'Chat archivado' : 'Chat desarchivado');
    } catch {
      showToast('No se pudo actualizar');
    }
  }

  async function toggleMuted() {
    try {
      const pref = await chatService.setConversationPreference(partnerId, { muted: !muted });
      setMuted(pref.muted);
      showToast(pref.muted ? 'Chat silenciado' : 'Silencio desactivado');
    } catch {
      showToast('No se pudo actualizar');
    }
  }

  async function toggleBlock() {
    try {
      if (blockedByMe) {
        await chatService.unblockUser(partnerId);
        setBlockedByMe(false);
        showToast('Usuario desbloqueado');
      } else {
        const reason = window.prompt('Motivo opcional del bloqueo') ?? undefined;
        await chatService.blockUser(partnerId, reason);
        setBlockedByMe(true);
        showToast('Usuario bloqueado');
      }
    } catch {
      showToast('No se pudo actualizar el bloqueo');
    }
  }

  async function reportMessage(msg: Message) {
    const reason = window.prompt('Motivo: spam, acoso, contenido ofensivo, archivo peligroso u otro', 'spam');
    if (!reason) return;
    const description = window.prompt('Descripción opcional') ?? undefined;
    try {
      await chatService.reportMessage(msg.id, reason, description);
      showToast('Reporte enviado');
    } catch {
      showToast('No se pudo reportar');
    }
  }

  // Group messages with day separators
  type GroupItem = { type: 'date'; label: string } | { type: 'msg'; msg: Message; showTail: boolean };
  const grouped: GroupItem[] = [];
  let prevDate: Date | null = null;
  let prevSenderId: number | null = null;

  for (let i = 0; i < visibleMessages.length; i++) {
    const msg = visibleMessages[i];
    const date = new Date(msg.createdAt);
    if (!prevDate || !sameDay(prevDate, date)) {
      grouped.push({ type: 'date', label: dayLabel(date) });
    }
    const nextMsg = visibleMessages[i + 1];
    const isLast = !nextMsg || nextMsg.senderId !== msg.senderId || (() => {
      const nd = new Date(nextMsg.createdAt);
      if (Number.isNaN(nd.getTime()) || Number.isNaN(date.getTime())) return true;
      return nd.getTime() - date.getTime() > 5 * 60 * 1000;
    })();
    grouped.push({ type: 'msg', msg, showTail: isLast });
    prevDate = date;
    prevSenderId = msg.senderId;
  }
  void prevSenderId;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        {showBack && (
          <button onClick={() => router.back()}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors shrink-0">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <Link href={`/profile/${partnerId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <div className="relative shrink-0">
            <Avatar src={partner?.avatarUrl} name={partnerName} size="sm" />
            {partner?.isOnline && (
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-surface)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
              {partnerName}
            </p>
            {(partner?.carrera ?? partner?.lastSeen ?? (partner as { carrera?: string } | null)?.carrera) && (
              <p className={`text-[11px] truncate ${typingName ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                {typingName ? `${typingName} está escribiendo...` : (partner as { carrera?: string }).carrera || lastSeenLabel(partner?.lastSeen)}
              </p>
            )}
            {!partner?.carrera && typingName && (
              <p className="text-[11px] text-[var(--brand)] truncate">escribiendo...</p>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          <span
            title={wsState === 'connected' ? 'Conectado' : wsState === 'reconnecting' || wsState === 'connecting' ? 'Reconectando' : 'Desconectado'}
            className={`size-2 rounded-full ${
              wsState === 'connected'
                ? 'bg-emerald-500'
                : wsState === 'reconnecting' || wsState === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-[var(--text-muted)]'
            }`}
          />
          <button
            type="button"
            onClick={() => setSearchOpen(v => !v)}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Buscar"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setGalleryOpen(v => !v)}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Multimedia"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          </button>
          <button
            type="button"
            onClick={toggleMuted}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={muted ? 'Quitar silencio' : 'Silenciar'}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 1 0 8" /><path d="M6 8H3v8h3l5 4V4z" />{muted && <line x1="3" y1="3" x2="21" y2="21" />}</svg>
          </button>
          <button
            type="button"
            onClick={() => void setArchived(true)}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Archivar"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
          </button>
          <button
            type="button"
            onClick={toggleBlock}
            className={`size-8 flex items-center justify-center rounded-full transition-colors ${blockedByMe ? 'text-red-500 hover:bg-red-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
            aria-label={blockedByMe ? 'Desbloquear usuario' : 'Bloquear usuario'}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.7 5.7l12.6 12.6" /></svg>
          </button>
          <Link
            href={`/profile/${partnerId}`}
            className="size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Ver perfil"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
          <input
            value={searchQuery}
            onChange={e => void runSearch(e.target.value)}
            placeholder="Buscar en este chat"
            className="w-full rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
              {searchResults.map(result => (
                <button key={result.id} onClick={() => jumpToMessage(result.id)} className="block w-full truncate rounded-lg px-2 py-1 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]">
                  {result.content || result.nombreArchivo || 'Archivo'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5">
          <button onClick={() => jumpToMessage(pinnedMessages[0].id)} className="w-full truncate text-left text-[11px] font-medium text-[var(--brand)]">
            Fijado: {pinnedMessages[0].content || pinnedMessages[0].nombreArchivo || 'Archivo'}
          </button>
        </div>
      )}

      {(blockedByMe || blockedMe) && (
        <div className="shrink-0 border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
          {blockedByMe ? 'Usuario bloqueado. Desbloquea para enviar mensajes.' : 'No puedes enviar mensajes a este usuario.'}
        </div>
      )}

      {(!online || syncing) && (
        <div className="shrink-0 border-b border-[var(--border)] bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600">
          {!online ? 'Sin conexión. Los mensajes se guardarán para enviar después.' : 'Sincronizando mensajes pendientes...'}
        </div>
      )}

      {galleryOpen && (
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Multimedia y archivos</p>
            <button onClick={() => setGalleryOpen(false)} className="text-xs text-[var(--text-muted)]">Cerrar</button>
          </div>
          {mediaMessages.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Sin archivos compartidos.</p>
          ) : (
            <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
              {mediaMessages.map(msg => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => void openSecureAttachment((msg.archivoUrl ?? msg.fileUrl)!, msg.nombreArchivo ?? msg.fileName ?? 'archivo')}
                  className="min-w-0 rounded-lg bg-[var(--bg-elevated)] p-2 text-left"
                >
                  {msg.tipo === 'IMAGE' && (msg.archivoUrl || msg.fileUrl) ? (
                    <SecureImage src={(msg.archivoUrl ?? msg.fileUrl)!} alt={msg.nombreArchivo ?? 'imagen'} className="aspect-square w-full rounded-md object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-md bg-[var(--brand-muted)] text-[var(--brand)]">
                      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                    </div>
                  )}
                  <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{msg.nombreArchivo ?? msg.fileName ?? msg.content ?? 'Archivo'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="size-6 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="size-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
              <svg className="size-8 text-[var(--text-muted)] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Sin mensajes aún</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Di hola a {partnerName} 👋</p>
          </div>
        ) : (
          <>
          {loadingOlder && (
            <div className="flex justify-center py-2">
              <span className="size-4 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
            </div>
          )}
          {grouped.map((item, idx) =>
            item.type === 'date' ? (
              <div key={`d-${idx}`} className="flex justify-center my-3">
                <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full capitalize">
                  {item.label}
                </span>
              </div>
            ) : (
              <div id={`dm-msg-${item.msg.id}`} key={item.msg.id} className="scroll-mt-28">
                <Bubble
                  msg={item.msg}
                  isOwn={item.msg.senderId === user?.id}
                  showTail={item.showTail}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  onRetry={retryMessage}
                  onReact={reactToMessage}
                  onEdit={editMessage}
                  onForward={forwardMessage}
                  onDeleteForMe={deleteForMe}
                  onPin={togglePin}
                  onReport={reportMessage}
                />
              </div>
            )
          )}
          </>
        )}
        <div ref={bottomRef} />
        {newMessages > 0 && (
          <button
            type="button"
            onClick={() => {
              setNewMessages(0);
              isAtBottom.current = true;
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="sticky bottom-2 left-1/2 z-20 mx-auto mt-2 block -translate-x-0 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
          >
            {newMessages === 1 ? 'Nuevo mensaje' : `${newMessages} mensajes nuevos`}
          </button>
        )}
      </div>

      {/* Input */}
      <ChatInput
        partnerId={partnerId}
        partnerName={partnerName}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onSent={handleSent}
        onSendText={sendTextOptimistic}
        onTyping={handleTyping}
        disabled={blockedByMe || blockedMe}
        disabledReason={blockedByMe ? 'Usuario bloqueado.' : blockedMe ? 'No puedes enviar mensajes a este usuario.' : undefined}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--text-primary)] text-[var(--bg-base)] text-xs font-medium px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
