'use client';

import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';
import type { GalleryItem } from '@/types';

const galleryItems: GalleryItem[] = [
  {
    title: 'Nocturne Portrait',
    style: 'Anime Style',
    color: 'linear-gradient(135deg, rgba(242,160,182,0.86), rgba(122,215,209,0.34)), linear-gradient(45deg, #141414, #050505)',
    heightClass: 'h-72 md:h-[420px]',
  },
  {
    title: 'Ceramic Product Study',
    style: 'Clay Render',
    color: 'linear-gradient(135deg, rgba(243,179,106,0.78), rgba(248,245,239,0.18)), linear-gradient(45deg, #121212, #050505)',
    heightClass: 'h-64 md:h-[340px]',
  },
  {
    title: 'Stone Editorial Bust',
    style: 'Marble Sculpture',
    color: 'linear-gradient(135deg, rgba(248,245,239,0.74), rgba(122,215,209,0.14)), linear-gradient(45deg, #181818, #050505)',
    heightClass: 'h-80 md:h-[480px]',
  },
  {
    title: 'Arcade Travel Frame',
    style: 'Pixel Art',
    color: 'linear-gradient(135deg, rgba(122,215,209,0.7), rgba(242,160,182,0.25)), linear-gradient(45deg, #111, #050505)',
    heightClass: 'h-64 md:h-[360px]',
  },
  {
    title: 'Forest Plate',
    style: 'Storybook Illustration',
    color: 'linear-gradient(135deg, rgba(243,179,106,0.55), rgba(242,160,182,0.38)), linear-gradient(45deg, #141414, #060606)',
    heightClass: 'h-72 md:h-[420px]',
  },
];

export function Gallery() {
  return (
    <section id="showcase" className="relative overflow-hidden py-24 sm:py-28">
      <video
        src="/videos/gallery.mp4"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,rgba(5,5,5,0.66)_50%,#050505_100%)]" />

      <motion.div
        className="section-shell relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer(0.08)}
      >
        <motion.div variants={fadeUp()} className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm text-rose">Showcase</p>
            <h2 className="font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
              Editorial outputs shaped for campaigns, portfolios, and concept decks.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-muted">
            A cinematic gallery surface with responsive masonry, background media,
            hover isolation, and per-image transformation labels.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.08, 0.12)}
          className="mt-12 columns-1 gap-4 md:columns-2 lg:columns-3"
        >
          {galleryItems.map((item) => (
            <motion.article
              key={item.title}
              variants={fadeUp()}
              className="group mb-4 break-inside-avoid overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-md"
            >
              <div
                className={`${item.heightClass} relative overflow-hidden transition duration-500 group-hover:scale-[1.04]`}
                style={{ background: item.color }}
              >
                <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-20" />
                <div className="absolute inset-0 bg-black/0 transition duration-500 group-hover:bg-black/[0.24]" />
                <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-sm text-white/[0.74]">{item.style}</p>
                  <h3 className="mt-1 font-serif text-3xl text-ink">{item.title}</h3>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
