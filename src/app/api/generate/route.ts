import { apiError, apiSuccess, errorMessage, getAuthenticatedUser } from '@/lib/api-response';
import { generateImageSchema } from '@/lib/generation-contracts';
import { hasRecentGenerationCapacity, runGenerationPipeline } from '@/lib/services/generation';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return apiError('Unauthorized user access.', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = generateImageSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid generation payload.', 400);
  }

  if (!(await hasRecentGenerationCapacity(user.id))) {
    return apiError('Rate limit exceeded. Please wait 1 minute.', 429);
  }

  try {
    const generation = await runGenerationPipeline({
      userId: user.id,
      sourceImage: parsed.data.sourceImage,
      sourceImageFileId: parsed.data.sourceImageFileId,
      style: parsed.data.style,
      promptInput: parsed.data.focus ?? parsed.data.promptInput,
      modelId: parsed.data.modelId,
    });

    return apiSuccess({
      generationId: generation.id,
      status: generation.generationStatus,
      generatedImageUrl: generation.generatedImageUrl,
      originalImageUrl: generation.originalImageUrl,
      style: generation.style,
      model: generation.model,
      generationTime: generation.generationTime,
      fileSize: generation.fileSize,
      imageWidth: generation.imageWidth,
      imageHeight: generation.imageHeight,
      createdAt: generation.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to run image transformation:', error);
    return apiError(errorMessage(error, 'Internal pipeline generation failure.'), 500);
  }
}
