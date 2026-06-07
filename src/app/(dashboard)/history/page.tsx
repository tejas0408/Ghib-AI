import { Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth-server';
import { getUserGenerationHistory } from '@/lib/services/generation';

export default async function HistoryPage() {
  const user = await requireAuth('/history');

  const userGenerations = await getUserGenerationHistory({
    userId: user.id,
    limit: 60,
  });

  return (
    <div className="section-shell py-12 text-ink">
      <div className="border-b border-white/10 pb-8">
        <p className="mb-3 text-sm text-ember">History</p>
        <h1 className="font-serif text-4xl text-ink md:text-5xl">Image Logs</h1>
      </div>

      {userGenerations.length === 0 ? (
        <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.02] p-12 text-center text-muted">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted/40" aria-hidden="true" />
          <p className="text-sm">No generation records yet.</p>
          <Link href="/generate" className="mt-2 block text-xs text-accent underline">
            Open the creative workstation
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {userGenerations.map((generation) => (
            <article key={generation.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
              <div className="aspect-square overflow-hidden">
                {generation.generatedImageUrl ? (
                  <img
                    src={generation.generatedImageUrl}
                    alt={generation.style}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03] p-5 text-center text-xs uppercase text-muted">
                    {generation.generationStatus}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs uppercase text-muted">{generation.style}</p>
                <p className="mt-1 font-serif text-lg text-ink">{generation.createdAt.toLocaleDateString()}</p>
                <p className="mt-2 text-[10px] uppercase text-muted">{generation.generationStatus}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
