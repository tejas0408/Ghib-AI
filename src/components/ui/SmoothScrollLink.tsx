'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';

interface SmoothScrollLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

export function SmoothScrollLink({
  href,
  children,
  onClick,
  ...props
}: SmoothScrollLinkProps) {
  const scrollToSection = useSmoothScroll();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (href.startsWith('#')) {
      event.preventDefault();
      scrollToSection(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
