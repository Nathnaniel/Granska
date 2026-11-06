import type { SVGProps } from 'react';

const Base = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props} />
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => <Base {...p}><path d="m3.5 8.5 3 3 6-7" /></Base>;
export const CrossIcon = (p: SVGProps<SVGSVGElement>) => <Base {...p}><path d="m4.5 4.5 7 7m0-7-7 7" /></Base>;
export const DashIcon = (p: SVGProps<SVGSVGElement>) => <Base {...p}><path d="M4.5 8h7" /></Base>;
export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => <Base {...p}><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></Base>;
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => <Base {...p}><path d="M2.5 5h11M2.5 11h11" /></Base>;
export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => <Base {...p}><path d="M12.33 8h-9M8.67 12s4-2.95 4-4-4-4-4-4" /></Base>;
export const GlobeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c1.8 1.7 2.7 3.7 2.7 6S9.8 12.3 8 14C6.2 12.3 5.3 10.3 5.3 8S6.2 3.7 8 2Z" /></Base>
);
export const GoogleIcon = () => (
  <svg viewBox="0 0 18 18" width="20" height="20" aria-hidden>
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);
