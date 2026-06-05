'use client';

import { useScroll, useTransform } from 'framer-motion';
import type { RefObject } from 'react';

export interface UseScrollSequenceOptions {
  offset?: [
    'start start' | 'start end' | 'center center' | 'end start' | 'end end',
    'start start' | 'start end' | 'center center' | 'end start' | 'end end',
  ];
}

export function useScrollSequence(
  containerRef: RefObject<HTMLElement | null>,
  totalFrames: number,
  options: UseScrollSequenceOptions = {},
) {
  const { offset = ['start end', 'end start'] } = options;
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset,
  });

  // Map the scrollYProgress from [0, 1] to frame indexes [0, totalFrames - 1]
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, totalFrames - 1]);

  return { scrollYProgress, frameIndex };
}
