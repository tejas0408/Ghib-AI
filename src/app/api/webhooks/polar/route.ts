import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions, usage } from '@/db/schema';
import {
  getPlanDetailsFromVariant,
  validatePolarWebhookSignature,
} from '@/lib/billing-utils';
import { getCurrentMonthKey } from '@/lib/user-records';

export const runtime = 'nodejs';

type PolarWebhookPayload = {
  type?: string;
  data?: {
    id?: string;
    subscription_id?: string;
    variant_id?: string;
    status?: string;
    cancel_at_period_end?: boolean;
    custom_metadata?: {
      userId?: string;
    };
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('webhook-signature') ?? '';

  const isValid = validatePolarWebhookSignature(rawBody, signature, process.env.POLAR_WEBHOOK_SECRET);

  if (!isValid) {
    return new NextResponse('Webhook Signature Verification Failed', { status: 401 });
  }

  const payload = JSON.parse(rawBody) as PolarWebhookPayload;
  const event = payload.type;
  const data = payload.data;

  if (!event || !data) {
    return new NextResponse('Invalid Webhook Payload', { status: 400 });
  }

  try {
    switch (event) {
      case 'checkout.completed':
      case 'subscription.created': {
        const userId = data.custom_metadata?.userId;
        const subscriptionId = data.subscription_id ?? data.id;

        if (!userId || !subscriptionId) {
          break;
        }

        const { plan, limit } = getPlanDetailsFromVariant(data.variant_id);
        const currentMonth = getCurrentMonthKey();

        await db.transaction(async (tx) => {
          await tx
            .insert(subscriptions)
            .values({
              id: `sub_${userId}`,
              userId,
              plan,
              status: 'active',
              monthlyLimit: limit,
              polarSubscriptionId: subscriptionId,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: subscriptions.userId,
              set: {
                plan,
                status: 'active',
                monthlyLimit: limit,
                polarSubscriptionId: subscriptionId,
                updatedAt: new Date(),
              },
            });

          await tx
            .insert(usage)
            .values({
              id: `usg_${userId}_${currentMonth}`,
              userId,
              month: currentMonth,
              rendersUsed: 0,
              rendersRemaining: limit,
            })
            .onConflictDoUpdate({
              target: [usage.userId, usage.month],
              set: {
                rendersRemaining: limit,
              },
            });
        });

        break;
      }

      case 'subscription.updated': {
        const subscriptionId = data.id;

        if (!subscriptionId) {
          break;
        }

        const existingSub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.polarSubscriptionId, subscriptionId),
        });

        if (!existingSub) {
          break;
        }

        const { plan, limit } = getPlanDetailsFromVariant(data.variant_id);
        const mappedStatus =
          data.cancel_at_period_end || data.status === 'canceled'
            ? 'canceled'
            : data.status === 'active' || data.status === 'trialing'
              ? data.status
              : 'past_due';

        await db
          .update(subscriptions)
          .set({
            plan,
            status: mappedStatus,
            monthlyLimit: limit,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.polarSubscriptionId, subscriptionId));

        break;
      }

      case 'subscription.cancelled':
      case 'subscription.canceled': {
        const subscriptionId = data.id;

        if (!subscriptionId) {
          break;
        }

        await db
          .update(subscriptions)
          .set({
            plan: 'free',
            status: 'canceled',
            monthlyLimit: 3,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.polarSubscriptionId, subscriptionId));

        break;
      }

      default:
        console.log(`Unhandled Polar webhook event: ${event}`);
    }

    return new NextResponse('Webhook Processed', { status: 200 });
  } catch (error) {
    console.error('Failed to sync Polar webhook:', error);
    return new NextResponse('Database Synchronization Error', { status: 500 });
  }
}
