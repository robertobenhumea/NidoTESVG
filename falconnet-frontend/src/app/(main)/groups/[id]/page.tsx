'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groupService } from '@/services/group.service';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { GroupDetail, GroupPost } from '@/types';

const TYPE_LABEL: Record<string, string> = {
  carrera: 'Carrera', materia: 'Materia', general: 'General',
};

function MemberList({ detail, currentUserId }: { detail: GroupDetail; currentUserId?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Miembros ({detail.memberCount})
        </span>
        <svg
          className={`size-4 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="mt-3 space-y-2.5">
          {detail.members.map((m) => (
            <Link
              key={m.userId}
              href={`/profile?id=${m.userId}`}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <Avatar src={m.avatarUrl} name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {m.name}
                  {m.userId === currentUserId && <span className="text-[var(--text-muted)] font-normal"> (tú)</span>}
                </p>
                {m.career && <p className="text-xs text-[var(--text-muted)] truncate">{m.career}</p>}
              </div>
              {m.role === 'admin' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--brand-muted)] text-[var(--brand)]">
                  Admin
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PostItem({ post }: { post: GroupPost }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <Link href={`/profile?id=${post.authorId}`}>
          <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile?id=${post.authorId}`} className="text-sm font-semibold text-[var(--text-primary)] hover:underline truncate block">
            {post.authorName}
          </Link>
          <p className="text-xs text-[var(--text-muted)]">{timeAgo(post.createdAt)}</p>
        </div>
      </div>
      {post.content && (
        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
      )}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="imagen"
          className="mt-3 w-full rounded-xl object-cover max-h-96"
          loading="lazy"
        />
      )}
    </div>
  );
}

function ComposeBox({ groupId, isMember, onPost }: {
  groupId: number;
  isMember: boolean;
  onPost: (p: GroupPost) => void;
}) {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const taRef                 = useRef<HTMLTextAreaElement>(null);

  if (!isMember) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const post = await groupService.publish(groupId, content);
      onPost(post);
      setText('');
      if (taRef.current) taRef.current.style.height = 'auto';
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as React.FormEvent);
  }

  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-4">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => { setText(e.target.value); autoResize(); }}
        onKeyDown={handleKey}
        placeholder="Escribe algo para el grupo…"
        rows={2}
        className="w-full resize-none text-sm text-[var(--text-primary)] bg-[var(--bg-elevated)] placeholder:text-[var(--text-muted)] rounded-xl border border-[var(--border)] px-3 py-2 focus:outline-none focus:border-[var(--border-focus)] transition-colors"
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-4 py-1.5 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[var(--brand-hover)] transition-colors"
        >
          {sending ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </form>
  );
}

export default function GroupDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const router       = useRouter();
  const { user }     = useAuth();
  const groupId      = Number(id);

  const [detail, setDetail]         = useState<GroupDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await groupService.getGroup(groupId));
    } catch {
      router.replace('/groups');
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleJoin() {
    if (!detail || joinLoading) return;
    setJoinLoading(true);
    try {
      const result = await groupService.toggleJoin(groupId);
      setDetail((d) =>
        d
          ? {
              ...d,
              isMember:    result.action === 'joined',
              memberCount: result.action === 'joined' ? d.memberCount + 1 : d.memberCount - 1,
              myRole:      result.action === 'joined' ? 'member' : null,
            }
          : d,
      );
    } finally {
      setJoinLoading(false);
    }
  }

  function handleNewPost(post: GroupPost) {
    setDetail((d) => d ? { ...d, posts: [post, ...d.posts] } : d);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 animate-pulse">
        <div className="h-6 w-32 rounded-full bg-[var(--bg-elevated)]" />
        <div className="h-28 rounded-2xl bg-[var(--bg-elevated)]" />
        <div className="h-32 rounded-2xl bg-[var(--bg-elevated)]" />
        <div className="h-24 rounded-2xl bg-[var(--bg-elevated)]" />
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="size-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">{detail.name}</h1>
          <p className="text-xs text-[var(--text-muted)]">{TYPE_LABEL[detail.type]} · {detail.memberCount} miembros</p>
        </div>
        <button
          onClick={handleToggleJoin}
          disabled={joinLoading || detail.myRole === 'admin'}
          className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${
            detail.isMember
              ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500'
              : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
          }`}
        >
          {joinLoading ? '…' : detail.isMember ? (detail.myRole === 'admin' ? 'Admin' : 'Salir') : 'Unirse'}
        </button>
      </div>

      {/* Group info */}
      {detail.description && (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] px-4 py-3">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">{detail.description}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">Creado por {detail.creatorName}</p>
        </div>
      )}

      {/* Members collapsible */}
      <MemberList detail={detail} currentUserId={user?.id} />

      {/* Compose */}
      <ComposeBox groupId={groupId} isMember={detail.isMember} onPost={handleNewPost} />

      {/* Posts */}
      {detail.posts.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">✍️</div>
          <p className="text-sm text-[var(--text-muted)]">Aún no hay publicaciones en este grupo.</p>
        </div>
      ) : (
        detail.posts.map((p) => <PostItem key={p.id} post={p} />)
      )}
    </div>
  );
}
