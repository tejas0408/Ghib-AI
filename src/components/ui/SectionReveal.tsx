'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp } from '@/components/AnimationVariants';

interface SectionRevealProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

export function SectionReveal({ children, id, className }: SectionRevealProps) {
  return (
    <motion.div
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeUp(0, 0.75)}
    >
      {children}
    </motion.div>
  );
}
