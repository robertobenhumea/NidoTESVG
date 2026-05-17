import { Spinner } from '@/components/ui/Loader';

export default function AuthLoading() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-[var(--bg-base)]">
      <Spinner size="lg" className="text-[var(--brand)]" />
    </div>
  );
}
