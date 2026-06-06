'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { generationStyles } from '@/lib/presets-config';
import { runGenerationPipeline } from '@/lib/services/generation';

const GENERATION_RATE_LIMIT = 3;
const GENERATION_RATE_LIMIT_WINDOW_MS = 60_000;
const generationAttemptsByUser = new Map<string, number[]>();

const generateImageSchema = z.object({
  sourceImage: z.string().url('Enter a valid image URL.'),
  style: z.enum(generationStyles),
  promptInput: z.string().max(500).optional(),
});

type GenerateImagePayload = z.infer<typeof generateImageSchema>;

function consumeGenerationAttempt(userId: string) {
  const now = Date.now();
  const recentAttempts = (generationAttemptsByUser.get(userId) ?? []).filter(
    (attemptedAt) => now - attemptedAt < GENERATION_RATE_LIMIT_WINDOW_MS,
  );

  if (recentAttempts.length >= GENERATION_RATE_LIMIT) {
    return false;
  }

  generationAttemptsByUser.set(userId, [...recentAttempts, now]);
  return true;
}

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

  if (!consumeGenerationAttempt(userId)) {
    return {
      success: false as const,
      error: 'Generation limit reached. Please wait a minute before trying again.',
    };
  }

  try {
    const generation = await runGenerationPipeline({
      userId,
      style: parsed.data.style,
      sourceImage: parsed.data.sourceImage,
      promptInput: parsed.data.promptInput,
    });

    return {
      success: true as const,
      generationId: generation.id,
      imageUrl: generation.generatedImageUrl ?? generation.originalImageUrl,
      status: generation.generationStatus,
    };
  } catch (error) {
    console.error('Failed to run image transformation:', error);
    const message = error instanceof Error ? error.message : 'Internal server error occurred.';
    return { success: false as const, error: message };
  }
}
