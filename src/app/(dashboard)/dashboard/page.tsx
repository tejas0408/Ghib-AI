import { count, eq } from 'drizzle-orm';
import { History, Image as ImageIcon, Palette, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/db';
import { generations } from '@/db/schema';
import { requireAuth } from '@/lib/auth-server';
import { getUserGenerationHistory } from '@/lib/services/generation';

export default async function DashboardPage() {
  const user = await requireAuth();
  const userId = user.id;

  const [userGenerations, totalRows] = await Promise.all([
    getUserGenerationHistory({ userId, limit: 5 }),
    db.select({ value: count() }).from(generations).where(eq(generations.userId, userId)),
  ]);

  const totalGenerations = totalRows[0]?.value ?? 0;
  const recentStyleCount = new Set(userGenerations.map((generation) => generation.style)).size;

  return (
    <div className="section-shell py-12 text-ink">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-8 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-ink md:text-5xl">
            Workspace: {user.name}
          </h1>
          <p className="mt-2 text-sm text-muted">Review workstation activity and recent transformation history</p>
        </div>
        <Link
          href="/generate"
          prefetch={true}
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-background transition hover:scale-[1.01] hover:bg-white/95"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Transform Photo
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <ImageIcon className="h-20 w-20 text-rose" aria-hidden="true" />
          </div>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted">
            <ImageIcon className="h-4 w-4 text-ember" aria-hidden="true" /> Total Outputs
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl text-ink">{totalGenerations}</span>
            <span className="text-sm text-muted">saved transformations</span>
          </div>
          <div className="mt-6">
            <Link href="/history" prefetch={true} className="text-xs font-medium text-ink underline transition hover:text-accent">
              Browse image logs
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Palette className="h-20 w-20 text-marine" aria-hidden="true" />
          </div>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted">
            <History className="h-4 w-4 text-rose" aria-hidden="true" /> Recent Styles
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl text-ink">{recentStyleCount}</span>
            <span className="text-sm text-muted">in latest outputs</span>
          </div>
          <p className="mt-6 text-xs leading-6 text-muted">
            The latest five records remain available as quick visual checkpoints.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Zap className="h-20 w-20 text-ember" aria-hidden="true" />
          </div>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted">
            <Zap className="h-4 w-4 text-marine" aria-hidden="true" /> Workstation
          </h2>
          <span className="font-serif text-4xl tracking-tight text-ink">Unlimited</span>
          <p className="mt-6 text-xs leading-6 text-muted">
            Transform images without monthly limits, plan gates, or checkout prompts.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-6 font-serif text-2xl text-ink">Recent Studio Transformations</h2>
        {userGenerations.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.01] p-12 text-center text-muted">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted/40" aria-hidden="true" />
            <p className="text-sm">No images transformed yet.</p>
            <Link href="/generate" prefetch={true} className="mt-2 block text-xs text-accent underline">
              Generate your first model artwork
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {userGenerations.map((generation) => (
              <div
                key={generation.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] transition hover:border-white/20"
              >
                {generation.generatedImageUrl ? (
                  <img
                    src={generation.generatedImageUrl}
                    alt={`Style transformation output: ${generation.style}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-[10px] uppercase text-muted">
                    {generation.generationStatus}
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col justify-end bg-black/40 p-3 opacity-0 transition duration-300 group-hover:opacity-100">
                  <span className="text-[10px] uppercase text-white/70">{generation.style}</span>
                  <span className="mt-1 truncate font-serif text-xs text-ink">
                    {generation.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
