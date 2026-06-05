'use client';

import { useParams } from 'next/navigation';
import { ConvList } from '../../components/ConvList';
import { GroupChatThread } from '../../components/GroupChatThread';
import { useChatViewport } from '../../components/useChatViewport';

export default function GroupMessageThreadPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const id = Number(groupId);
  useChatViewport();

  return (
    <div className="flex h-[var(--chat-vh,100dvh)] overflow-hidden pt-[env(safe-area-inset-top,0px)] md:h-[calc(100dvh-var(--nav-h)-var(--safe-top))] md:pt-0">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] md:flex lg:w-[340px] xl:w-[360px]">
        <ConvList activeGroupId={id} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <GroupChatThread groupId={id} showBack />
      </section>
    </div>
  );
}
