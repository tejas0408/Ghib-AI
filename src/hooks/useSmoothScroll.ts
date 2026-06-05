'use client';

import { useLenis } from 'lenis/react';
import { usePathname, useRouter } from 'next/navigation';

export function useSmoothScroll() {
  const lenis = useLenis();
  const router = useRouter();
  const pathname = usePathname();

  const scrollToSection = (targetHash: string) => {
    if (pathname !== '/') {
      router.push(`/${targetHash}`);
      return;
    }

    const element = document.querySelector(targetHash);

    if (element && lenis) {
      lenis.scrollTo(targetHash, {
        offset: -80,
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      });
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return scrollToSection;
}
