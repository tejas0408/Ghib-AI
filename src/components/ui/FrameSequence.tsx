'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { useFrameSequence } from '@/hooks/useFrameSequence';

interface FrameSequenceProps {
  folder: string;
  totalFrames?: number;
  className?: string;
  canvasClassName?: string;
  overlayClassName?: string;
  overlayOpacity?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
  offset?: [string, string];
  externalFrameIndex?: MotionValue<number>;
  parallax?: boolean;
}

export function FrameSequence({
  folder,
  totalFrames = 120,
  className,
  canvasClassName,
  overlayClassName,
  overlayOpacity = 0.45,
  containerRef,
  offset = ['start end', 'end start'],
  externalFrameIndex,
  parallax = false,
}: FrameSequenceProps) {
  const localContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const target = containerRef?.current || localContainerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewport(true);
          observer.disconnect(); // Once loaded, keep it loaded
        }
      },
      {
        rootMargin: '400px', // Start preloading 400px before entry
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [containerRef]);

  const { images, progress, isLoaded } = useImagePreloader(
    folder,
    totalFrames,
    isInViewport,
    isMobile,
  );

  const targetScrollRef = containerRef || localContainerRef;
  const { scrollYProgress } = useScroll({
    target: targetScrollRef,
    offset: offset as any,
  });

  const localFrameIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, images.length > 0 ? images.length - 1 : totalFrames - 1]
  );

  const activeFrameIndex = externalFrameIndex || localFrameIndex;

  useFrameSequence(canvasRef, images, activeFrameIndex);

  const y = useTransform(scrollYProgress, [0, 1], shouldReduceMotion || !parallax ? ['0%', '0%'] : ['0%', '18%']);
  const scale = useTransform(scrollYProgress, [0, 1], shouldReduceMotion || !parallax ? [1, 1] : [1, 1.08]);

  return (
    <div
      ref={localContainerRef}
      className={`relative w-full h-full overflow-hidden bg-background ${className || ''}`}
    >
      <motion.div
        style={{ y: parallax ? y : undefined, scale: parallax ? scale : undefined }}
        className="absolute inset-0 w-full h-full"
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover pointer-events-none block ${canvasClassName || ''}`}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      </motion.div>

      {!isLoaded && isInViewport && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm transition-opacity duration-300 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] uppercase tracking-widest text-muted">
              Syncing cinematic environment {progress}%
            </span>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 pointer-events-none z-10 ${overlayClassName || ''}`}
        style={overlayClassName ? undefined : { backgroundColor: 'var(--background)', opacity: overlayOpacity }}
      />
    </div>
  );
}
