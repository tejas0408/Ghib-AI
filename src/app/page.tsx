import dynamic from 'next/dynamic';
import { CTA } from '@/components/CTA';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { Gallery } from '@/components/Gallery';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Navbar } from '@/components/Navbar';
import { StyleShowcase } from '@/components/StyleShowcase';
import { Testimonials } from '@/components/Testimonials';
import { SectionReveal } from '@/components/ui/SectionReveal';

const Comparison = dynamic(() => import('@/components/Comparison').then((mod) => mod.Comparison), {
  loading: () => <div className="section-shell my-24 h-96 animate-pulse rounded-lg bg-white/[0.03]" />,
});

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SectionReveal>
          <StyleShowcase />
        </SectionReveal>
        <SectionReveal>
          <HowItWorks />
        </SectionReveal>
        <SectionReveal>
          <Gallery />
        </SectionReveal>
        <SectionReveal>
          <Comparison />
        </SectionReveal>
        <SectionReveal>
          <Features />
        </SectionReveal>
        <SectionReveal>
          <Testimonials />
        </SectionReveal>
        <SectionReveal>
          <CTA />
        </SectionReveal>
      </main>
      <Footer />
    </>
  );
}
