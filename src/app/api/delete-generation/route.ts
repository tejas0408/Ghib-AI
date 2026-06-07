import { apiError, apiSuccess, errorMessage, getAuthenticatedUser } from '@/lib/api-response';
import { deleteGenerationSchema } from '@/lib/generation-contracts';
import { deleteUserGeneration } from '@/lib/services/generation';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return apiError('Unauthorized user access.', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteGenerationSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid delete payload.', 400);
  }

  try {
    const generation = await deleteUserGeneration({
      userId: user.id,
      generationId: parsed.data.generationId,
    });

    if (!generation) {
      return apiError('Generation was not found for this user.', 404);
    }

    return apiSuccess({
      generationId: generation.id,
      deleted: true,
    });
  } catch (error) {
    console.error('Failed to delete generation:', error);
    return apiError(errorMessage(error, 'Failed to delete generation.'), 500);
  }
}
