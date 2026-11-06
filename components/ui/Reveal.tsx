import type { ReactNode } from 'react';

// Marks a block for the scroll animation in ScrollAnimations.
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div data-reveal className={className}>{children}</div>;
}
