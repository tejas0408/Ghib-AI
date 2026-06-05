import crypto from 'crypto';

type PlanDetails = {
  plan: 'free' | 'pro' | 'studio';
  limit: number;
};

export const PLAN_LIMITS = {
  free: 3,
  pro: 100,
  studio: 500,
} as const;

export function getPlanDetailsFromVariant(variantId?: string | null): PlanDetails {
  if (variantId && variantId === process.env.POLAR_PRO_VARIANT_ID) {
    return { plan: 'pro', limit: PLAN_LIMITS.pro };
  }

  if (variantId && variantId === process.env.POLAR_STUDIO_VARIANT_ID) {
    return { plan: 'studio', limit: PLAN_LIMITS.studio };
  }

  return { plan: 'free', limit: PLAN_LIMITS.free };
}

export function validatePolarWebhookSignature(
  body: string,
  signatureHeader: string,
  secret?: string,
): boolean {
  if (!secret) {
    console.warn('POLAR_WEBHOOK_SECRET is not configured. Signature validation skipped.');
    return true;
  }

  try {
    const [webhookId, timestamp, signature] = signatureHeader.split(',').map((part) => part.trim());

    if (!webhookId || !timestamp || !signature) {
      return false;
    }

    const message = `${webhookId}.${timestamp}.${body}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest('hex');
    const received = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');

    if (received.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}
