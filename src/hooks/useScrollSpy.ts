'use client';

import { useEffect, useState } from 'react';

export function useScrollSpy(selectors: string[], rootMargin = '-30% 0px -60% 0px') {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin,
        threshold: 0,
      },
    );

    const observedElements = selectors
      .map((selector) => document.querySelector(selector))
      .filter((element): element is Element => Boolean(element));

    observedElements.forEach((element) => observer.observe(element));

    return () => {
      observedElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [selectors, rootMargin]);

  return activeId;
}
