import { and, desc, eq } from 'drizzle-orm';
import { Calendar, Clock, CreditCard, Image as ImageIcon, Sparkles, Zap } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { renders, subscriptions, usage } from '@/db/schema';
import { auth } from '@/lib/auth';
import { getCurrentMonthKey, initializeUserRecords } from '@/lib/user-records';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const userId = session.user.id;
  const currentMonth = getCurrentMonthKey();
  await initializeUserRecords(userId);

  const [subscriptionRecord, usageRecord, userRenders] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    }),
    db.query.usage.findFirst({
      where: and(eq(usage.userId, userId), eq(usage.month, currentMonth)),
    }),
    db.query.renders.findMany({
      where: eq(renders.userId, userId),
      orderBy: desc(renders.createdAt),
      limit: 5,
    }),
  ]);

  const plan = subscriptionRecord?.plan ?? 'free';
  const limit = subscriptionRecord?.monthlyLimit ?? 3;
  const used = usageRecord?.rendersUsed ?? 0;
  const remaining = usageRecord?.rendersRemaining ?? 3;
  const progressPercent = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="section-shell py-12 text-ink">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-8 md:flex-row md:items-center">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-ink md:text-5xl">
            Workspace: {session.user.name}
          </h1>
          <p className="mt-2 text-sm text-muted">Manage render limits, active plan, and studio history</p>
        </div>
        <Link
          href="/generate"
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-background transition hover:scale-[1.01] hover:bg-white/95"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Transform Photo
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Zap className="h-20 w-20 text-marine" aria-hidden="true" />
          </div>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted">
            <Clock className="h-4 w-4 text-rose" aria-hidden="true" /> Usage Quota
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl text-ink">{remaining}</span>
            <span className="text-sm text-muted">/ {limit} remaining</span>
          </div>
          <div className="mt-6">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{used} renders used</span>
              <span>Resets monthly</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <CreditCard className="h-20 w-20 text-ember" aria-hidden="true" />
          </div>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted">
            <Calendar className="h-4 w-4 text-marine" aria-hidden="true" /> Active Plan
          </h2>
          <span className="font-serif text-4xl uppercase tracking-tight text-ink">
            {plan === 'free' ? 'Free Tier' : plan === 'pro' ? 'Pro Studio' : 'Studio'}
          </span>
          <div className="mt-6">
            <Link href="/billing" className="text-xs font-medium text-ink underline transition hover:text-accent">
              Subscription Portal
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <ImageIcon className="h-20 w-20 text-rose" aria-hidden="true" />
          </div>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase text-muted">
            <ImageIcon className="h-4 w-4 text-ember" aria-hidden="true" /> Total Outputs
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl text-ink">{userRenders.length}</span>
            <span className="text-sm text-muted">recent outputs</span>
          </div>
          <div className="mt-6">
            <Link href="/history" className="text-xs font-medium text-ink underline transition hover:text-accent">
              Browse image logs
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-6 font-serif text-2xl text-ink">Recent Studio Transformations</h2>
        {userRenders.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.01] p-12 text-center text-muted">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted/40" aria-hidden="true" />
            <p className="text-sm">No images transformed yet.</p>
            <Link href="/generate" className="mt-2 block text-xs text-accent underline">
              Generate your first model artwork
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {userRenders.map((render) => (
              <div
                key={render.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] transition hover:border-white/20"
              >
                <img
                  src={render.generatedImage}
                  alt={`Style transformation output: ${render.style}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-black/40 p-3 opacity-0 transition duration-300 group-hover:opacity-100">
                  <span className="text-[10px] uppercase text-white/70">{render.style}</span>
                  <span className="mt-1 truncate font-serif text-xs text-ink">
                    {render.createdAt.toLocaleDateString()}
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
