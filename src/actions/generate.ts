'use server';

import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import { renders, subscriptions, usage } from '@/db/schema';
import { auth } from '@/lib/auth';
import { getCurrentMonthKey } from '@/lib/user-records';

const generateImageSchema = z.object({
  sourceImage: z.string().url('Enter a valid image URL.'),
  style: z.enum(['anime', 'clay', 'marble', 'pixel', 'storybook']),
});

type GenerateImagePayload = z.infer<typeof generateImageSchema>;

export async function generateImage(payload: GenerateImagePayload) {
  const parsed = generateImageSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? 'Invalid generation payload.',
    };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false as const, error: 'User is not authenticated' };
  }

  const userId = session.user.id;
  const currentMonth = getCurrentMonthKey();

  try {
    const quotaResult = await db.transaction(async (tx) => {
      let sub = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      if (!sub) {
        sub = (
          await tx
            .insert(subscriptions)
            .values({
              id: `sub_${userId}`,
              userId,
              plan: 'free',
              status: 'active',
              monthlyLimit: 3,
            })
            .returning()
        )[0];
      }

      let userUsage = await tx.query.usage.findFirst({
        where: and(eq(usage.userId, userId), eq(usage.month, currentMonth)),
      });

      if (!userUsage) {
        userUsage = (
          await tx
            .insert(usage)
            .values({
              id: `usg_${userId}_${currentMonth}`,
              userId,
              month: currentMonth,
              rendersUsed: 0,
              rendersRemaining: sub.monthlyLimit,
            })
            .returning()
        )[0];
      }

      if (userUsage.rendersRemaining <= 0) {
        return {
          success: false as const,
          error: 'Monthly quota exceeded. Please upgrade your subscription.',
        };
      }

      const updatedUsage = await tx
        .update(usage)
        .set({
          rendersUsed: userUsage.rendersUsed + 1,
          rendersRemaining: userUsage.rendersRemaining - 1,
        })
        .where(and(eq(usage.userId, userId), eq(usage.month, currentMonth)))
        .returning();

      return {
        success: true as const,
        remaining: updatedUsage[0]?.rendersRemaining ?? userUsage.rendersRemaining - 1,
      };
    });

    if (!quotaResult.success) {
      return quotaResult;
    }

    const transformedImage = await callModelTransformationService(parsed.data.sourceImage, parsed.data.style);
    const renderId = `rnd_${randomUUID()}`;

    await db.insert(renders).values({
      id: renderId,
      userId,
      sourceImage: parsed.data.sourceImage,
      generatedImage: transformedImage,
      style: parsed.data.style,
    });

    return {
      success: true as const,
      imageUrl: transformedImage,
      remaining: quotaResult.remaining,
    };
  } catch (error) {
    console.error('Failed to run image transformation:', error);
    return { success: false as const, error: 'Internal server error occurred.' };
  }
}

async function callModelTransformationService(_source: string, _style: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1800));

  return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=900&auto=format&fit=crop';
}
