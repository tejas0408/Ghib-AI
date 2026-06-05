import type { Variants } from 'framer-motion';

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const fadeUp = (delay = 0, duration = 0.8): Variants => ({
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration,
      ease: easeOutExpo,
      delay,
    },
  },
});

export const fadeIn = (delay = 0, duration = 0.6): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration,
      ease: 'easeOut',
      delay,
    },
  },
});

export const staggerContainer = (
  staggerChildren = 0.1,
  delayChildren = 0,
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const scaleIn = (delay = 0, duration = 0.6): Variants => ({
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration,
      ease: easeOutExpo,
      delay,
    },
  },
});

export const slideInDirection = (
  direction: 'left' | 'right' | 'top' | 'bottom',
  delay = 0,
): Variants => {
  const start = {
    left: { x: -60, y: 0 },
    right: { x: 60, y: 0 },
    top: { x: 0, y: -60 },
    bottom: { x: 0, y: 60 },
  }[direction];

  return {
    hidden: { opacity: 0, ...start },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.8,
        ease: easeOutExpo,
        delay,
      },
    },
  };
};
