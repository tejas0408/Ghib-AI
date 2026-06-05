'use client';

import { useState, useEffect } from 'react';

const preloadedCache: Record<string, HTMLImageElement[]> = {};

export function useImagePreloader(
  folder: string,
  totalFrames: number,
  enabled: boolean,
  isMobile: boolean,
) {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const step = isMobile ? 2 : 1;
  const cacheKey = `${folder}-${totalFrames}-${step}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!enabled) {
      return;
    }

    if (preloadedCache[cacheKey]) {
      setImages(preloadedCache[cacheKey]);
      setProgress(100);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    const frameIndices: number[] = [];

    for (let i = 1; i <= totalFrames; i += step) {
      frameIndices.push(i);
    }

    const totalToLoad = frameIndices.length;
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = new Array(totalToLoad);

    frameIndices.forEach((frameIdx, index) => {
      const img = new Image();
      const padIdx = String(frameIdx).padStart(3, '0');
      img.src = `/${folder}/ezgif-frame-${padIdx}.jpg`;

      const handleImageComplete = () => {
        if (cancelled) return;

        loadedCount++;
        setProgress(Math.round((loadedCount / totalToLoad) * 100));

        if (loadedCount === totalToLoad) {
          preloadedCache[cacheKey] = loadedImages;
          setImages(loadedImages);
          setIsLoaded(true);
        }
      };

      img.onload = handleImageComplete;
      img.onerror = handleImageComplete;
      loadedImages[index] = img;
    });

    return () => {
      cancelled = true;
      loadedImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [folder, totalFrames, cacheKey, step, enabled]);

  return { images, progress, isLoaded };
}
