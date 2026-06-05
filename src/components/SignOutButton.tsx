'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleSignOut}
      className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 text-sm text-muted transition hover:border-white/[0.24] hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sign Out
    </button>
  );
}
