import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-[0.5px] border-line bg-white ${className}`}>{children}</div>;
}

// The large rounded card with the landscape behind floating UI.
export function ImageCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`landscape overflow-hidden rounded-[28px] ${className}`}>{children}</div>;
}
