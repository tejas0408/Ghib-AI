'use server';

import { generateImageSchema } from '@/lib/generation-contracts';
import { getSession } from '@/lib/auth-server';
import { hasRecentGenerationCapacity, runGenerationPipeline } from '@/lib/services/generation';

export async function generateTransformationAction(payload: unknown) {
  const parsed = generateImageSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? 'Invalid generation payload.',
    };
  }

  const session = await getSession();

  if (!session) {
    return { success: false as const, error: 'User is not authenticated' };
  }

  const userId = session.userId;

  if (!(await hasRecentGenerationCapacity(userId))) {
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
      sourceImageFileId: parsed.data.sourceImageFileId,
      promptInput: parsed.data.focus ?? parsed.data.promptInput,
      modelId: parsed.data.modelId,
    });

    return {
      success: true as const,
      data: {
        id: generation.id,
        imageUrl: generation.generatedImageUrl ?? generation.originalImageUrl,
        status: generation.generationStatus,
      },
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

export const generateImage = generateTransformationAction;
