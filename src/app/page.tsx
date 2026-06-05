import { CTA } from '@/components/CTA';
import { Comparison } from '@/components/Comparison';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { Gallery } from '@/components/Gallery';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Navbar } from '@/components/Navbar';
import { Pricing } from '@/components/Pricing';
import { StyleShowcase } from '@/components/StyleShowcase';
import { Testimonials } from '@/components/Testimonials';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StyleShowcase />
        <HowItWorks />
        <Gallery />
        <Comparison />
        <Features />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
