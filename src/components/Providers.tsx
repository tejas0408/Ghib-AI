'use client';

import { MotionConfig, useReducedMotion } from 'framer-motion';
import { ReactLenis } from 'lenis/react';

export function Providers({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <ReactLenis
      root
      options={{
        lerp: shouldReduceMotion ? 1 : 0.085,
        duration: shouldReduceMotion ? 0 : 1.15,
        smoothWheel: !shouldReduceMotion,
      }}
    >
      <MotionConfig
        reducedMotion="user"
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        {children}
      </MotionConfig>
    </ReactLenis>
  );
}
