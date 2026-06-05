'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { ImageUp, SlidersHorizontal, UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';

const steps = [
  {
    title: 'Upload Image',
    body: 'Start with a portrait, product, interior, travel frame, or raw concept asset.',
    Icon: UploadCloud,
  },
  {
    title: 'Choose Style',
    body: 'Select a profile that defines texture, color discipline, edge behavior, and lighting.',
    Icon: SlidersHorizontal,
  },
  {
    title: 'Generate Artwork',
    body: 'Render a polished output tuned for publishing, presentation, or studio iteration.',
    Icon: ImageUp,
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 70%', 'end 45%'],
  });
  const pathLength = useSpring(scrollYProgress, { stiffness: 120, damping: 32 });

  return (
    <section className="relative py-24 sm:py-28">
      <motion.div
        ref={ref}
        className="section-shell"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer(0.1)}
      >
        <motion.div variants={fadeUp()} className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm text-ember">Workflow</p>
          <h2 className="font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
            From source image to finished artwork in three focused moves.
          </h2>
        </motion.div>

        <div className="relative mt-16">
          <svg
            className="pointer-events-none absolute left-0 top-10 hidden h-36 w-full md:block"
            viewBox="0 0 900 120"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M80 60C240 8 300 112 450 60C600 8 660 112 820 60"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <motion.path
              d="M80 60C240 8 300 112 450 60C600 8 660 112 820 60"
              stroke="url(#timelineGlow)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ pathLength }}
            />
            <defs>
              <linearGradient id="timelineGlow" x1="80" y1="60" x2="820" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7ad7d1" />
                <stop offset="0.55" stopColor="#f8f5ef" />
                <stop offset="1" stopColor="#f3b36a" />
              </linearGradient>
            </defs>
          </svg>

          <motion.div
            className="pointer-events-none absolute bottom-0 left-6 top-0 w-px bg-white/10 md:hidden"
            aria-hidden="true"
          >
            <motion.div
              className="h-full origin-top bg-gradient-to-b from-marine via-ink to-ember"
              style={{ scaleY: pathLength }}
            />
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.Icon;

              return (
                <motion.article
                  key={step.title}
                  variants={fadeUp(index * 0.08)}
                  className="relative min-h-[260px] rounded-lg border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20"
                >
                  <div className="mb-10 flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.05]">
                      <Icon className="h-5 w-5 text-ink" aria-hidden="true" />
                    </span>
                    <span className="font-serif text-5xl text-white/[0.12]">0{index + 1}</span>
                  </div>
                  <h3 className="font-serif text-3xl text-ink">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted">{step.body}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
