'use client';

import { motion } from 'framer-motion';
import { Download, Layers, ShieldCheck, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';

const features = [
  {
    title: 'Style Fidelity',
    body: 'Profiles preserve material logic, contour behavior, palette rules, and lighting intent.',
    Icon: Sparkles,
  },
  {
    title: 'Fast Iteration',
    body: 'Generate multiple art directions quickly without resetting source context or controls.',
    Icon: Zap,
  },
  {
    title: 'Layered Outputs',
    body: 'Transparent-ready exports, editorial backgrounds, and reusable style passes.',
    Icon: Layers,
  },
  {
    title: 'Fine Controls',
    body: 'Tune intensity, texture, color discipline, and prompt guidance for every render.',
    Icon: SlidersHorizontal,
  },
  {
    title: 'Protected Assets',
    body: 'Private workspaces, secure upload flows, and studio-grade retention controls.',
    Icon: ShieldCheck,
  },
  {
    title: 'Export Quality',
    body: 'Production-ready outputs for social, presentation, print mockups, and campaign boards.',
    Icon: Download,
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-28">
      <motion.div
        className="section-shell"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer(0.08)}
      >
        <motion.div variants={fadeUp()} className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm text-ember">Platform</p>
          <h2 className="font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
            Built for visual teams that need taste, speed, and repeatability.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08, 0.12)}
          className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.Icon;

            return (
              <motion.article
                key={feature.title}
                variants={fadeUp()}
                className="min-h-[232px] rounded-lg border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-white/20"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.05]">
                  <Icon className="h-5 w-5 text-ink" aria-hidden="true" />
                </span>
                <h3 className="mt-8 font-serif text-3xl text-ink">{feature.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted">{feature.body}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
