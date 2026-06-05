'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ParallaxVideoProps {
  src: string;
  className?: string;
  videoClassName?: string;
  overlayClassName?: string;
  overlayOpacity?: number;
}

export function ParallaxVideo({
  src,
  className,
  videoClassName,
  overlayClassName,
  overlayOpacity = 0.45,
}: ParallaxVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? ['0%', '0%'] : ['0%', '18%']);
  const scale = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [1, 1] : [1, 1.08]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden bg-background', className)}>
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="metadata"
          className={cn('h-full w-full object-cover', videoClassName)}
        />
      </motion.div>
      <div
        className={cn('absolute inset-0 bg-background', overlayClassName)}
        style={overlayClassName ? undefined : { opacity: overlayOpacity }}
      />
    </div>
  );
}
