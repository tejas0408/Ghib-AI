import { NextResponse } from 'next/server';
import { apiError, getAuthenticatedUser } from '@/lib/api-response';
import { downloadQuerySchema } from '@/lib/generation-contracts';
import { isUserImageKitUrl } from '@/lib/imagekit';

export const runtime = 'nodejs';

function fileExtensionForContentType(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'png';
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return apiError('Unauthorized user access.', 401);
  }

  const url = new URL(request.url);
  const parsed = downloadQuerySchema.safeParse({
    url: url.searchParams.get('url') ?? '',
  });

  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? 'Invalid download URL.', 400);
  }

  if (!isUserImageKitUrl(parsed.data.url, user.id)) {
    return apiError('Download URL is not available for this user.', 403);
  }

  const response = await fetch(parsed.data.url);

  if (!response.ok) {
    return apiError(`Unable to fetch image for download: ${response.status}.`, 502);
  }

  const contentType = response.headers.get('content-type') ?? 'image/png';

  if (!contentType.startsWith('image/')) {
    return apiError('Download URL did not return an image.', 400);
  }

  const buffer = await response.arrayBuffer();
  const extension = fileExtensionForContentType(contentType);

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="ghib-transformation.${extension}"`,
      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, max-age=0, no-store',
    },
  });
}
