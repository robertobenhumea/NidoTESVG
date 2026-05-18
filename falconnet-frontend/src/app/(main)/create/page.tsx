'use client';

import { useRouter } from 'next/navigation';
import { CreatePostCard } from '@/components/feed/CreatePostCard';
import { useAuth } from '@/hooks/useAuth';
import { postService } from '@/services/post.service';
import type { Post } from '@/types';

export default function CreatePage() {
  const router = useRouter();
  const { user } = useAuth();

  async function handleSubmit(content: string, imageUrl?: string): Promise<Post> {
    if (!user) throw new Error('No autenticado');
    return postService.createPost({ content, imageUrl }, user);
  }

  function handleCreated() {
    router.replace('/');
  }

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-3 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="size-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Volver"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Nueva publicación</h1>
      </div>

      <CreatePostCard
        author={user}
        onSubmit={handleSubmit}
        onPostCreated={handleCreated}
      />
    </div>
  );
}
