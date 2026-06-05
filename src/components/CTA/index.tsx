'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';

export function CTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-20" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,rgba(122,215,209,0.08)_48%,#050505_100%)]" />
      <motion.div
        className="section-shell relative z-10 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        variants={staggerContainer(0.1)}
      >
        <motion.p variants={fadeUp()} className="mb-5 text-sm text-ember">
          Create
        </motion.p>
        <motion.h2
          variants={fadeUp(0.08)}
          className="mx-auto max-w-4xl font-serif text-5xl leading-[0.96] text-ink md:text-6xl xl:text-8xl"
        >
          Your Next Masterpiece Starts With One Upload
        </motion.h2>
        <motion.div variants={fadeUp(0.16)} className="mt-10">
          <Link
            href="/generate"
            prefetch={true}
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 font-medium text-background shadow-soft-glow transition hover:bg-ink hover:scale-[1.02]"
          >
            Start Creating
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
