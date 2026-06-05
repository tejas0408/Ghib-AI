'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';
import { ParallaxVideo } from '@/components/ui/ParallaxVideo';
import { TextReveal } from '@/components/ui/text-reveal';

export function Hero() {
  return (
    <section id="top" className="relative min-h-[92svh] overflow-hidden">
      <div className="absolute inset-0">
        <ParallaxVideo
          src="/videos/hero.mp4"
          overlayClassName="video-scrim"
          className="min-h-[92svh]"
        />
      </div>

      <motion.div
        className="section-shell relative z-10 flex min-h-[92svh] flex-col items-center justify-center pb-16 pt-28 text-center"
        variants={staggerContainer(0.12, 0.15)}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={fadeUp()}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] px-4 py-2 text-sm text-ink backdrop-blur-xl"
        >
          <Sparkles className="h-4 w-4 text-marine" aria-hidden="true" />
          AI-Powered Image Transformation
        </motion.div>

        <h1 className="max-w-5xl font-serif text-6xl leading-[0.92] text-ink sm:text-7xl md:text-8xl xl:text-9xl">
          <TextReveal text="Ghib AI" />
        </h1>

        <motion.p
          variants={fadeUp(0.15)}
          className="mt-8 max-w-2xl text-base leading-8 text-muted sm:text-lg md:text-xl"
        >
          Convert ordinary photos into cinematic anime scenes, clay renders, marble
          sculptures, pixel studies, and storybook illustrations.
        </motion.p>

        <motion.div variants={fadeUp(0.25)} className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a
            href="#comparison"
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-background shadow-soft-glow transition hover:bg-ink hover:scale-[1.02]"
          >
            Generate Now
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#showcase"
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/[0.16] bg-white/[0.04] px-6 font-medium text-accent backdrop-blur-xl transition hover:border-white/[0.28] hover:bg-white/[0.08]"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Watch Demo
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp(0.35)}
          className="mt-14 grid w-full max-w-3xl grid-cols-3 border-y border-white/10 py-5 text-left"
        >
          {[
            ['5', 'visual modes'],
            ['4K', 'studio export'],
            ['28s', 'median render'],
          ].map(([value, label]) => (
            <div key={label} className="px-3 text-center">
              <div className="font-serif text-3xl text-ink md:text-4xl">{value}</div>
              <div className="mt-1 text-xs uppercase text-muted">{label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
