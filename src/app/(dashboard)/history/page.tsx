import { desc, eq } from 'drizzle-orm';
import { Image as ImageIcon } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { auth } from '@/lib/auth';

export default async function HistoryPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const userRenders = await db.query.renders.findMany({
    where: eq(renders.userId, session.user.id),
    orderBy: desc(renders.createdAt),
    limit: 60,
  });

  return (
    <div className="section-shell py-12 text-ink">
      <div className="border-b border-white/10 pb-8">
        <p className="mb-3 text-sm text-ember">History</p>
        <h1 className="font-serif text-4xl text-ink md:text-5xl">Image Logs</h1>
      </div>

      {userRenders.length === 0 ? (
        <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.02] p-12 text-center text-muted">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted/40" aria-hidden="true" />
          <p className="text-sm">No render records yet.</p>
          <Link href="/generate" className="mt-2 block text-xs text-accent underline">
            Open the creative workstation
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {userRenders.map((render) => (
            <article key={render.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
              <div className="aspect-square overflow-hidden">
                <img src={render.generatedImage} alt={render.style} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <p className="text-xs uppercase text-muted">{render.style}</p>
                <p className="mt-1 font-serif text-lg text-ink">{render.createdAt.toLocaleDateString()}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
