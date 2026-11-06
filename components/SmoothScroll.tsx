'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';

// Slow, smooth page scrolling. GSAP's clock drives it, so the scroll animations stay
// in step with it. Lenis turns itself off for visitors who ask for reduced motion.
export function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      lerp: 0.055,
      wheelMultiplier: 0.8,
      anchors: { duration: 1.8 },
      stopInertiaOnNavigate: true,
    });
    const tick = (time: number) => lenis.raf(time * 1000);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
