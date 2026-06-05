'use client';

import { useState, useEffect } from 'react';

const preloadedCache = new Map<string, HTMLImageElement[]>();
const pendingCache = new Map<string, Promise<HTMLImageElement[]>>();

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

    const cachedImages = preloadedCache.get(cacheKey);
    if (cachedImages) {
      setImages(cachedImages);
      setProgress(100);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    setImages([]);
    setProgress(0);
    setIsLoaded(false);

    const pendingImages = pendingCache.get(cacheKey);

    if (pendingImages) {
      pendingImages.then((loadedImages) => {
        if (cancelled) return;

        setImages(loadedImages);
        setProgress(100);
        setIsLoaded(true);
      });

      return () => {
        cancelled = true;
      };
    }

    const frameIndices: number[] = [];

    for (let i = 1; i <= totalFrames; i += step) {
      frameIndices.push(i);
    }

    const totalToLoad = frameIndices.length;
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = new Array(totalToLoad);

    const loadImages = new Promise<HTMLImageElement[]>((resolve) => {
      frameIndices.forEach((frameIdx, index) => {
        const img = new Image();
        const padIdx = String(frameIdx).padStart(3, '0');
        img.src = `/${folder}/ezgif-frame-${padIdx}.jpg`;

        const handleImageComplete = () => {
          loadedCount++;

          if (!cancelled) {
            setProgress(Math.round((loadedCount / totalToLoad) * 100));
          }

          if (loadedCount === totalToLoad) {
            resolve(loadedImages);
          }
        };

        img.onload = handleImageComplete;
        img.onerror = handleImageComplete;
        loadedImages[index] = img;
      });
    });

    pendingCache.set(cacheKey, loadImages);

    loadImages.then((loadedImages) => {
      pendingCache.delete(cacheKey);
      preloadedCache.set(cacheKey, loadedImages);

      if (cancelled) return;

      setImages(loadedImages);
      setProgress(100);
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [folder, totalFrames, cacheKey, step, enabled]);

  return { images, progress, isLoaded };
}
