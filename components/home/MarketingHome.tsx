// The marketing home page, hidden for now: the site opens on the checker instead.
// To bring it back, render <MarketingHome /> from app/[locale]/page.tsx.
import { Footer } from '@/components/Footer';
import { ClosingCta } from '@/components/home/ClosingCta';
import { Faq } from '@/components/home/Faq';
import { Features } from '@/components/home/Features';
import { Hero } from '@/components/home/Hero';
import { Pricing } from '@/components/home/Pricing';
import { UseCases } from '@/components/home/UseCases';
import { Nav } from '@/components/Nav';
import { ScrollAnimations } from '@/components/ScrollAnimations';
import { CornerArt } from '@/components/ui/CornerArt';

export function MarketingHome() {
  return (
    <>
      <CornerArt />
      <Nav />
      <main id="content">
        <Hero />
        <Features />
        <UseCases />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
      <ScrollAnimations />
    </>
  );
}
