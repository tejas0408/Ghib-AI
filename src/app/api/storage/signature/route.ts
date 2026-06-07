import { createHmac, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { buildUserImageKitFolder } from '@/lib/imagekit';

const SIGNATURE_TTL_SECONDS = 5 * 60;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'User is not authenticated.' }, { status: 401 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !publicKey || !urlEndpoint) {
    return NextResponse.json({ error: 'ImageKit is not configured.' }, { status: 500 });
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;
  const signature = createHmac('sha1', privateKey).update(`${token}${expire}`).digest('hex');

  return NextResponse.json({
    token,
    expire,
    signature,
    publicKey,
    urlEndpoint,
    folder: buildUserImageKitFolder(user.id, 'originals'),
  });
}
