'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

// For a section on the current page, Lenis does the scrolling. Left alone, Next.js
// would jump there first and fight the glide.
export function PageLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const pathname = usePathname();
  const [path, hash] = href.split('#');
  return <Link href={href} scroll={!(hash && path === pathname)} {...rest} />;
}
