'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUsageSnapshot } from '@/lib/user-records';

export async function getCurrentUserUsage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false as const, error: 'User is not authenticated' };
  }

  const usage = await getUsageSnapshot(session.user.id);
  return { success: true as const, usage };
}
