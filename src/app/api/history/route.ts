import { apiError, apiSuccess, getAuthenticatedUser } from '@/lib/api-response';
import { historyQuerySchema } from '@/lib/generation-contracts';
import { getUserGenerationHistory } from '@/lib/services/generation';

export const runtime = 'nodejs';

function stringParameter(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return apiError('Unauthorized user access.', 401);
  }

  const url = new URL(request.url);
  const parsed = historyQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? 'Invalid history query.', 400);
  }

  const rows = await getUserGenerationHistory({
    userId: user.id,
    limit: parsed.data.limit,
    cursorCreatedAt: parsed.data.cursor ? new Date(parsed.data.cursor) : undefined,
    style: parsed.data.style,
    status: parsed.data.status,
  });

  const items = rows.map((generation) => ({
    id: generation.id,
    style: generation.style,
    preset: generation.preset,
    createdAt: generation.createdAt.toISOString(),
    updatedAt: generation.updatedAt.toISOString(),
    status: generation.generationStatus,
    generatedImageUrl: generation.generatedImageUrl,
    originalImageUrl: generation.originalImageUrl,
    thumbnailUrl: stringParameter(generation.parameters.thumbnailUrl) ?? generation.generatedImageUrl,
    model: generation.model,
    provider: generation.provider,
    generationTime: generation.generationTime,
    imageWidth: generation.imageWidth,
    imageHeight: generation.imageHeight,
    fileSize: generation.fileSize,
    errorMessage: generation.errorMessage,
  }));

  return apiSuccess({
    items,
    nextCursor: rows.length === parsed.data.limit ? rows.at(-1)?.createdAt.toISOString() ?? null : null,
  });
}
