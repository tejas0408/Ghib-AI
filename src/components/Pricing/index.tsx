'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';
import { cn } from '@/lib/utils';
import type { PricingTier } from '@/types';

const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'For quick tests and personal experiments.',
    features: ['3 monthly renders', 'Standard output size', 'Five style presets'],
  },
  {
    name: 'Pro',
    price: '$19',
    description: 'For creators and small teams shipping weekly visual work.',
    features: ['100 monthly renders', '4K export queue', 'Private style history', 'Priority generation'],
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$49',
    description: 'For production teams managing high-volume creative pipelines.',
    features: ['500 monthly renders', 'Team workspaces', 'Asset retention controls', 'Dedicated support'],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-28">
      <motion.div
        className="section-shell"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer(0.08)}
      >
        <motion.div variants={fadeUp()} className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm text-marine">Pricing</p>
          <h2 className="font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
            Clear tiers for solo experimentation and studio production.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08, 0.12)}
          className="mt-12 grid gap-4 lg:grid-cols-3"
        >
          {tiers.map((tier) => (
            <motion.article
              key={tier.name}
              variants={fadeUp()}
              className={cn(
                'relative overflow-hidden rounded-lg p-px',
                tier.highlighted ? 'shadow-soft-glow' : '',
              )}
            >
              {tier.highlighted ? (
                <div className="absolute -inset-28 animate-border-spin bg-[conic-gradient(from_0deg,#7ad7d1,#f8f5ef,#f3b36a,#f2a0b6,#7ad7d1)]" />
              ) : null}
              <div
                className={cn(
                  'relative flex min-h-[460px] flex-col rounded-lg border border-white/10 bg-secondary p-6',
                  tier.highlighted ? 'border-white/[0.24] bg-[#101010]' : 'bg-white/[0.03]',
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-4xl text-ink">{tier.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{tier.description}</p>
                  </div>
                  {tier.highlighted ? (
                    <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 text-xs text-ink">
                      Popular
                    </span>
                  ) : null}
                </div>

                <div className="mt-8 flex items-end gap-2">
                  <span className="font-serif text-6xl text-ink">{tier.price}</span>
                  <span className="pb-2 text-sm text-muted">/ month</span>
                </div>

                <ul className="mt-8 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-marine" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-up"
                  className={cn(
                    'focus-ring mt-auto inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition duration-300',
                    tier.highlighted
                      ? 'bg-accent text-background shadow-soft-glow hover:bg-ink'
                      : 'border border-white/[0.16] bg-white/[0.04] text-accent hover:border-white/[0.28] hover:bg-white/[0.08]',
                  )}
                >
                  {tier.highlighted ? 'Start Pro' : 'Choose Plan'}
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
