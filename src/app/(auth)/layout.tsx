import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-background py-8 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-15" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,rgba(122,215,209,0.04)_50%,#050505_100%)]" />

      <header className="section-shell relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition hover:border-white/20">
            <Sparkles className="h-4 w-4 text-marine" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl tracking-tight text-ink">Ghib AI</span>
        </Link>
      </header>

      <main className="relative z-10 my-8 flex flex-grow items-center justify-center px-4">
        <div className="w-full max-w-md overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl">
          {children}
        </div>
      </main>

      <footer className="relative z-10 text-center text-xs text-muted/60">
        <p>(c) 2026 Ghib AI. Secure authentication system.</p>
      </footer>
    </div>
  );
}
