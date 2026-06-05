'use client';

import { motion } from 'framer-motion';
import { BookOpen, Gem, Grid3X3, Palette, WandSparkles } from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';
import { FrameSequence } from '@/components/ui/FrameSequence';
import { useAppStore, type TransformStyle } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { StyleProfile } from '@/types';

const styles: StyleProfile[] = [
  {
    id: 'anime',
    title: 'Anime Style',
    description: 'Vibrant highlights, graphic contrast, and crisp line treatments.',
    accent: 'from-rose/[0.35] to-marine/10',
    Icon: WandSparkles,
  },
  {
    id: 'clay',
    title: 'Clay Render',
    description: 'Matte forms, soft shadows, and hand-molded dimensional texture.',
    accent: 'from-ember/[0.35] to-white/10',
    Icon: Palette,
  },
  {
    id: 'marble',
    title: 'Marble Sculpture',
    description: 'White stone texture, polished contours, and chiselled edges.',
    accent: 'from-white/[0.35] to-marine/10',
    Icon: Gem,
  },
  {
    id: 'pixel',
    title: 'Pixel Art',
    description: 'Restricted palettes, sharp pixel grids, and retro poster energy.',
    accent: 'from-marine/[0.35] to-rose/10',
    Icon: Grid3X3,
  },
  {
    id: 'storybook',
    title: 'Storybook Illustration',
    description: 'Watercolor washes, hand-drawn marks, and gentle narrative light.',
    accent: 'from-ember/25 to-rose/20',
    Icon: BookOpen,
  },
];

export function StyleShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const activeStyle = useAppStore((state) => state.activeStyle);
  const setActiveStyle = useAppStore((state) => state.setActiveStyle);

  return (
    <section id="styles" ref={sectionRef} className="relative overflow-hidden py-24 sm:py-28">
      <div className="absolute inset-0">
        <FrameSequence
          folder="2"
          totalFrames={120}
          containerRef={sectionRef}
          offset={['start end', 'end start']}
          overlayOpacity={0.72}
        />
      </div>
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-25" />

      <motion.div
        className="section-shell relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer(0.09)}
      >
        <motion.div variants={fadeUp()} className="max-w-3xl">
          <p className="mb-4 text-sm text-marine">Style Engine</p>
          <h2 className="font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
            Five transformation languages with production-grade control.
          </h2>
          <p className="mt-6 text-base leading-8 text-muted md:text-lg">
            Select a style profile and the interface updates the rendering language
            across the showcase and comparison workspace.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08, 0.12)}
          className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6"
        >
          {styles.map((style, index) => (
            <StyleCard
              key={style.id}
              style={style}
              active={activeStyle === style.id}
              onSelect={() => setActiveStyle(style.id)}
              className={index < 3 ? 'lg:col-span-2' : 'lg:col-span-3'}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function StyleCard({
  style,
  active,
  onSelect,
  className,
}: {
  style: StyleProfile;
  active: boolean;
  onSelect: (style: TransformStyle) => void;
  className?: string;
}) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const Icon = style.Icon;

  const handleMouseMove = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.button
      type="button"
      variants={fadeUp()}
      onClick={() => onSelect(style.id)}
      onMouseMove={handleMouseMove}
      style={
        {
          '--x': `${position.x}%`,
          '--y': `${position.y}%`,
        } as CSSProperties
      }
      className={cn(
        'focus-ring group relative min-h-[248px] overflow-hidden rounded-lg border p-6 text-left transition duration-300',
        active ? 'border-white/[0.28] bg-white/[0.08]' : 'border-white/10 bg-white/[0.03] hover:border-white/20',
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--x) var(--y), rgba(255,255,255,0.12), transparent 42%)',
        }}
      />
      <span className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', style.accent)} />
      <span className="relative z-10 flex h-full flex-col justify-between">
        <span>
          <span className="mb-8 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.05]">
            <Icon className="h-5 w-5 text-ink" aria-hidden="true" />
          </span>
          <span className="block font-serif text-3xl text-ink">{style.title}</span>
          <span className="mt-4 block text-sm leading-6 text-muted">{style.description}</span>
        </span>
        <span className="mt-8 inline-flex text-sm text-accent">{active ? 'Selected' : 'Preview'}</span>
      </span>
    </motion.button>
  );
}
