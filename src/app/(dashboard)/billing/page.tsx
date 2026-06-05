import { Check } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BillingCheckoutButton } from '@/components/BillingCheckoutButton';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { getUsageSnapshot } from '@/lib/user-records';
import { cn } from '@/lib/utils';

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    limit: '3 monthly renders',
    description: 'For quick tests and personal experiments.',
    features: ['Standard queue', 'Five style presets', 'Personal history'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$19',
    limit: '100 monthly renders',
    description: 'For creators shipping steady visual work.',
    features: ['Priority queue', '4K-ready workflow', 'Expanded history'],
    variantId: env.POLAR_PRO_VARIANT_ID,
    highlighted: true,
  },
  {
    key: 'studio',
    name: 'Studio',
    price: '$49',
    limit: '500 monthly renders',
    description: 'For production teams managing concept pipelines.',
    features: ['Highest monthly quota', 'Studio workflow support', 'Campaign-scale output logs'],
    variantId: env.POLAR_STUDIO_VARIANT_ID,
  },
] as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const snapshot = await getUsageSnapshot(session.user.id);

  return (
    <div className="section-shell py-12 text-ink">
      <div className="border-b border-white/10 pb-8">
        <p className="mb-3 text-sm text-marine">Billing</p>
        <h1 className="font-serif text-4xl text-ink md:text-5xl">Subscription Portal</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Active plan: {snapshot.plan}. {snapshot.remaining} of {snapshot.limit} renders remain this month.
        </p>
      </div>

      {params?.success === 'true' ? (
        <div className="mt-6 rounded-lg border border-marine/20 bg-marine/10 p-4 text-sm text-marine">
          Checkout completed. Your subscription will update after Polar confirms the webhook event.
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = snapshot.plan === plan.key;

          return (
            <article
              key={plan.key}
              className={cn(
                'rounded-lg border bg-white/[0.02] p-6',
                plan.highlighted ? 'border-white/[0.24] shadow-soft-glow' : 'border-white/[0.08]',
              )}
            >
              <div className="flex min-h-[440px] flex-col">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-4xl text-ink">{plan.name}</h2>
                      <p className="mt-3 text-sm leading-6 text-muted">{plan.description}</p>
                    </div>
                    {current ? (
                      <span className="rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-1 text-xs text-ink">
                        Current
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-8 flex items-end gap-2">
                    <span className="font-serif text-6xl text-ink">{plan.price}</span>
                    <span className="pb-2 text-sm text-muted">/ month</span>
                  </div>
                  <p className="mt-3 text-sm text-muted">{plan.limit}</p>

                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-6 text-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-marine" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-8">
                  {plan.key === 'free' ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.04] px-5 text-sm text-muted opacity-70"
                    >
                      {current ? 'Current Plan' : 'Included'}
                    </button>
                  ) : (
                    <BillingCheckoutButton
                      variantId={plan.variantId}
                      disabled={current}
                      label={current ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
