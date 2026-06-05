import { CreditCard, Mail, User } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import { auth } from '@/lib/auth';
import { getUsageSnapshot } from '@/lib/user-records';

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const snapshot = await getUsageSnapshot(session.user.id);

  return (
    <div className="section-shell py-12 text-ink">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm text-marine">Account</p>
          <h1 className="font-serif text-4xl text-ink md:text-5xl">Profile Settings</h1>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <User className="mb-5 h-5 w-5 text-marine" aria-hidden="true" />
          <h2 className="font-serif text-2xl text-ink">Name</h2>
          <p className="mt-2 text-sm text-muted">{session.user.name}</p>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <Mail className="mb-5 h-5 w-5 text-rose" aria-hidden="true" />
          <h2 className="font-serif text-2xl text-ink">Email</h2>
          <p className="mt-2 break-all text-sm text-muted">{session.user.email}</p>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-6">
          <CreditCard className="mb-5 h-5 w-5 text-ember" aria-hidden="true" />
          <h2 className="font-serif text-2xl text-ink">Plan</h2>
          <p className="mt-2 text-sm text-muted">
            {snapshot.plan} - {snapshot.remaining} of {snapshot.limit} renders remaining
          </p>
        </div>
      </div>
    </div>
  );
}
