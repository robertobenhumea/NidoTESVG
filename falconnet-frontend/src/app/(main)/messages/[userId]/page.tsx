'use client';

import { useParams } from 'next/navigation';
import { ConvList }   from '../components/ConvList';
import { ChatThread } from '../components/ChatThread';

/* Desktop: two-pane — conv list (left) + chat (right)
   Mobile:  full-screen chat only (with back button) */
export default function MessageThreadPage() {
  const { userId } = useParams<{ userId: string }>();
  const partnerId  = Number(userId);

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: 'calc(100dvh - var(--nav-h) - var(--safe-top))' }}
    >
      {/* Left panel — desktop only */}
      <aside className="hidden md:flex w-80 lg:w-[340px] xl:w-[360px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] flex-col">
        <ConvList activePartnerId={partnerId} />
      </aside>

      {/* Right panel — full width on mobile, flex-1 on desktop */}
      <section className="flex-1 min-w-0 flex flex-col">
        <ChatThread partnerId={partnerId} showBack />
      </section>
    </div>
  );
}
