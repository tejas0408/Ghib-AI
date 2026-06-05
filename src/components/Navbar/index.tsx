'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Styles', href: '#styles' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar() {
  const scrollY = useScrollPosition();
  const mobileMenuOpen = useAppStore((state) => state.mobileMenuOpen);
  const toggleMobileMenu = useAppStore((state) => state.toggleMobileMenu);
  const scrolled = scrollY > 50;

  useEffect(() => {
    document.documentElement.style.overflow = mobileMenuOpen ? 'hidden' : '';

    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <motion.header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition duration-300',
        scrolled
          ? 'border-white/[0.08] bg-background/70 backdrop-blur-xl'
          : 'border-transparent bg-transparent',
      )}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="section-shell flex h-20 items-center justify-between gap-4">
        <a href="#top" className="focus-ring inline-flex items-center gap-2 rounded-full">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04]">
            <Sparkles className="h-4 w-4 text-marine" aria-hidden="true" />
          </span>
          <span className="font-serif text-2xl text-ink">Ghib AI</span>
        </a>

        <div className="hidden items-center gap-8 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-muted backdrop-blur-xl md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="focus-ring rounded-full transition hover:text-accent"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/sign-in" className="focus-ring rounded-full px-4 py-2 text-sm text-muted transition hover:text-accent">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="focus-ring rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition hover:bg-ink"
          >
            Sign Up
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => toggleMobileMenu(true)}
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-background/96 backdrop-blur-xl md:hidden"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="section-shell flex h-20 items-center justify-between">
              <span className="font-serif text-2xl text-ink">Ghib AI</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => toggleMobileMenu(false)}
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="section-shell flex min-h-[calc(100svh-5rem)] flex-col justify-center gap-7">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => toggleMobileMenu(false)}
                  className="focus-ring rounded-lg font-serif text-5xl text-ink"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index }}
                >
                  {item.label}
                </motion.a>
              ))}
              <a
                href="/sign-up"
                onClick={() => toggleMobileMenu(false)}
                className="focus-ring mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-background"
              >
                Start Creating
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
