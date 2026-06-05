import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SmoothScrollLink } from '@/components/ui/SmoothScrollLink';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Styles', href: '#styles' },
      { label: 'Showcase', href: '#showcase' },
      { label: 'Workstation', href: '/generate' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Journal', href: '#top' },
      { label: 'Press', href: '#top' },
      { label: 'Contact', href: '#footer' },
    ],
  },
  {
    title: 'Social',
    links: [
      { label: 'X', href: '#top' },
      { label: 'Instagram', href: '#top' },
      { label: 'Behance', href: '#top' },
      { label: 'Dribbble', href: '#top' },
    ],
  },
];

export function Footer() {
  return (
    <footer id="footer" className="border-t border-white/10 py-12">
      <div className="section-shell">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04]">
                <Sparkles className="h-4 w-4 text-marine" aria-hidden="true" />
              </span>
              <span className="font-serif text-2xl text-ink">Ghib AI</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
              Premium image transformation workflows for creators, brands, and
              visual production teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-medium text-ink">{column.title}</h2>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <SmoothScrollLink
                          href={link.href}
                          className="focus-ring rounded-full text-sm text-muted transition hover:text-accent"
                        >
                          {link.label}
                        </SmoothScrollLink>
                      ) : (
                        <Link
                          href={link.href}
                          prefetch={true}
                          className="focus-ring rounded-full text-sm text-muted transition hover:text-accent"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>Copyright 2026 Ghib AI. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-marine" aria-hidden="true" />
            <span>Systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
