'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';

export async function getCheckoutSessionUrl(variantId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('Unauthorized access request.');
  }

  const polarOrgName = env.POLAR_ORGANIZATION_NAME;

  if (!polarOrgName) {
    throw new Error('POLAR_ORGANIZATION_NAME is not configured.');
  }

  if (!variantId) {
    throw new Error('A Polar variant id is required.');
  }

  const returnUrl = `${env.NEXT_PUBLIC_APP_URL}/billing?success=true`;
  const checkoutUrl = new URL(`https://polar.sh/${polarOrgName}/checkout`);

  checkoutUrl.searchParams.set('variant', variantId);
  checkoutUrl.searchParams.set('email', session.user.email);
  checkoutUrl.searchParams.set('metadata', JSON.stringify({ userId: session.user.id }));
  checkoutUrl.searchParams.set('success_url', returnUrl);

  return { url: checkoutUrl.toString() };
}
