'use server';

import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import { renders } from '@/db/schema';
import { auth } from '@/lib/auth';

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

  try {
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
