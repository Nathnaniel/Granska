import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white ${className}`}>{children}</div>;
}

// The large rounded card with the landscape behind floating UI.
export function ImageCard({ children, className = '', parallax = false }: { children: ReactNode; className?: string; parallax?: boolean }) {
  return <div data-parallax={parallax || undefined} className={`landscape overflow-hidden rounded-[28px] ${className}`}>{children}</div>;
}
