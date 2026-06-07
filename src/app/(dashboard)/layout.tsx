import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/generate', label: 'Generate' },
  { href: '/history', label: 'History' },
  { href: '/account', label: 'Account' },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-ink">
      <div className="pointer-events-none fixed inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#050505_0%,rgba(122,215,209,0.035)_45%,#050505_100%)]" />

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-background/78 backdrop-blur-xl">
        <nav className="section-shell flex min-h-20 flex-col justify-center gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04]">
              <Sparkles className="h-4 w-4 text-marine" aria-hidden="true" />
            </span>
            <span className="font-serif text-2xl text-ink">Ghib AI</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="focus-ring rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 transition hover:border-white/20 hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
