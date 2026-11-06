import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'dark';

const BASE = 'inline-flex h-10 items-center justify-center gap-2 rounded-[48px] px-5 text-sm font-medium whitespace-nowrap transition-[filter,background-color] duration-200 disabled:cursor-not-allowed disabled:opacity-60';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:brightness-95',
  secondary: 'bg-idle text-soft hover:bg-[#eeeeee]',
  dark: 'bg-text text-white hover:bg-ink',
};

interface Common { variant?: Variant; className?: string; children: ReactNode }

export function Button({ variant = 'primary', className = '', children, href, ...rest }:
  Common & { href?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (href) return <Link href={href} className={classes} onClick={rest.onClick as never}>{children}</Link>;
  return <button type="button" className={classes} {...rest}>{children}</button>;
}
