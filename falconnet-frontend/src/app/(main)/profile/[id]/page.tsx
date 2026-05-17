import { Suspense } from 'react';
import { ProfileView } from '@/components/profile/ProfileView';

function ProfileFallback() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="h-40 bg-[var(--bg-elevated)] rounded-b-2xl" />
      <div className="px-4 pb-4 pt-0">
        <div className="-mt-10 mb-4 flex items-end justify-between">
          <div className="size-20 rounded-full ring-4 ring-[var(--bg-surface)] bg-[var(--bg-elevated)]" />
          <div className="h-9 w-24 rounded-xl bg-[var(--bg-elevated)] mb-1" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-full bg-[var(--bg-elevated)]" />
          <div className="h-3.5 w-24 rounded-full bg-[var(--bg-elevated)]" />
        </div>
      </div>
    </div>
  );
}

export default async function ProfileByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId) || userId <= 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">Perfil no encontrado</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileView userId={userId} />
    </Suspense>
  );
}
