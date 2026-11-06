'use client';

import Link from 'next/link';
import { useLocale, useT } from '@/lib/i18n';
import { Logo } from './ui/Logo';

export function Footer() {
  const t = useT();
  const locale = useLocale();
  const links = [
    { href: `/${locale}#features`, label: t('nav.features') },
    { href: `/${locale}#pricing`, label: t('nav.pricing') },
    { href: `/${locale}/docs`, label: t('footer.docs') },
    { href: `/${locale}/privacy`, label: t('footer.privacy') },
    { href: `/${locale}/terms`, label: t('footer.terms') },
  ];
  return (
    <footer>
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-6 px-4 py-[30px] md:px-6">
        <div>
          <Logo />
          <p className="mt-3 font-display text-xs whitespace-pre-wrap text-ink">{t('footer.copyright')}</p>
        </div>
        <nav aria-label="Granska" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="font-display text-sm text-soft transition-colors hover:text-text">{link.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
