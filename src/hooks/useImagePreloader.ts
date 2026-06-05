'use client';

import { useState, useEffect } from 'react';

const preloadedCache: Record<string, HTMLImageElement[]> = {};

export function useImagePreloader(folder: string, totalFrames: number, isMobile: boolean) {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // If mobile, load every 2nd frame to optimize memory usage (60 frames instead of 120)
  const step = isMobile ? 2 : 1;
  const cacheKey = `${folder}-${totalFrames}-${step}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (preloadedCache[cacheKey]) {
      setImages(preloadedCache[cacheKey]);
      setProgress(100);
      setIsLoaded(true);
      return;
    }

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

      const handleImageLoad = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / totalToLoad) * 100));

        if (loadedCount === totalToLoad) {
          // Store clean, fully-loaded array in cache
          preloadedCache[cacheKey] = loadedImages;
          setImages(loadedImages);
          setIsLoaded(true);
        }
      };

      const handleImageError = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / totalToLoad) * 100));

        if (loadedCount === totalToLoad) {
          preloadedCache[cacheKey] = loadedImages;
          setImages(loadedImages);
          setIsLoaded(true);
        }
      };

      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      loadedImages[index] = img;
    });
  }, [folder, totalFrames, cacheKey, step]);

  return { images, progress, isLoaded };
}
