import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { subscriptions, usage } from '@/db/schema';

export function getCurrentMonthKey(date = new Date()) {
  return date.toISOString().substring(0, 7);
}

export async function initializeUserRecords(userId: string) {
  const currentMonth = getCurrentMonthKey();

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(subscriptions)
        .values({
          id: `sub_${userId}`,
          userId,
          plan: 'free',
          status: 'active',
          monthlyLimit: 3,
        })
        .onConflictDoNothing({
          target: subscriptions.userId,
        });

      const subscriptionRecord = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      const monthlyLimit = subscriptionRecord?.monthlyLimit ?? 3;

      await tx
        .insert(usage)
        .values({
          id: `usg_${userId}_${currentMonth}`,
          userId,
          month: currentMonth,
          rendersUsed: 0,
          rendersRemaining: monthlyLimit,
        })
        .onConflictDoNothing({
          target: [usage.userId, usage.month],
        });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize user subscription/usage records:', error);
    return { success: false, error: 'Database execution error' };
  }
}

export async function getUsageSnapshot(userId: string) {
  const currentMonth = getCurrentMonthKey();
  await initializeUserRecords(userId);

  const [subscriptionRecord, usageRecord] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    }),
    db.query.usage.findFirst({
      where: and(eq(usage.userId, userId), eq(usage.month, currentMonth)),
    }),
  ]);

  const limit = subscriptionRecord?.monthlyLimit ?? 3;
  const used = usageRecord?.rendersUsed ?? 0;
  const remaining = usageRecord?.rendersRemaining ?? Math.max(0, limit - used);

  return {
    month: currentMonth,
    plan: subscriptionRecord?.plan ?? 'free',
    status: subscriptionRecord?.status ?? 'active',
    limit,
    used,
    remaining,
  };
}
