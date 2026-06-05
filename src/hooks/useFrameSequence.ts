'use client';

import { useEffect, useRef } from 'react';
import type { MotionValue } from 'framer-motion';

export function useFrameSequence(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  images: HTMLImageElement[],
  frameIndexValue: MotionValue<number>,
) {
  const lastIndexRef = useRef<number>(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = (rawIndex: number) => {
      const index = Math.min(
        images.length - 1,
        Math.max(0, Math.floor(rawIndex)),
      );

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.round(rect.width * dpr);
      const targetHeight = Math.round(rect.height * dpr);

      // Avoid drawing if dimensions are zero
      if (targetWidth === 0 || targetHeight === 0) return;

      const dimensionsChanged = canvas.width !== targetWidth || canvas.height !== targetHeight;

      if (index === lastIndexRef.current && !dimensionsChanged) return;

      const img = images[index];
      if (!img) return;

      if (dimensionsChanged) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      if (imgWidth && imgHeight) {
        const imgRatio = imgWidth / imgHeight;
        const canvasRatio = canvas.width / canvas.height;

        let sx = 0, sy = 0, sWidth = imgWidth, sHeight = imgHeight;

        if (imgRatio > canvasRatio) {
          // Image is wider than canvas
          sWidth = imgHeight * canvasRatio;
          sx = (imgWidth - sWidth) / 2;
        } else {
          // Image is taller than canvas
          sHeight = imgWidth / canvasRatio;
          sy = (imgHeight - sHeight) / 2;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        lastIndexRef.current = index;
      }
    };

    // Draw initial frame
    drawFrame(frameIndexValue.get());

    // Listen to changes in frame index and batch to next animation frame
    let frameId: number | null = null;
    const unsubscribe = frameIndexValue.on('change', (val) => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        drawFrame(val);
      });
    });

    // Handle resize
    const handleResize = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        drawFrame(frameIndexValue.get());
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, images, frameIndexValue]);
}
