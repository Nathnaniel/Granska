'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Only elements below the fold are hidden, and only after hydration, so the page
// is complete without JavaScript and nothing on screen flashes.
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight) return;
    setHidden(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setHidden(false); observer.disconnect(); }
    }, { rootMargin: '0px 0px -40px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`reveal ${hidden ? 'reveal-hidden' : ''} ${className}`}>{children}</div>;
}
