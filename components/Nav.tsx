'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Button } from './ui/Button';
import { CrossIcon, MenuIcon } from './ui/icons';
import { Logo } from './ui/Logo';
import { PageLink } from './ui/PageLink';

export function Nav({ account = false }: { account?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: `/${locale}`, label: t('nav.home') },
    { href: `/${locale}#features`, label: t('nav.features') },
    { href: `/${locale}#use-cases`, label: t('nav.useCases') },
    { href: `/${locale}#pricing`, label: t('nav.pricing') },
  ];
  // Focus goes to the drawer itself, so the close button isn't outlined the moment it opens.
  const open = () => { dialog.current?.showModal(); dialog.current?.focus(); };
  const close = () => dialog.current?.close();
  const logIn = `/${locale}/get-started?tab=login`;
  const getStarted = `/${locale}/get-started`;
  const logOut = () => { close(); auth.signOut(); router.push(`/${locale}`); };

  return (
    <header className={`sticky top-0 z-40 border-b transition-colors duration-200 ${scrolled ? 'border-line bg-white' : 'border-transparent'}`}>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm">{t('nav.skip')}</a>
      <div className="mx-auto flex h-20 max-w-[1080px] items-center justify-between gap-4 px-6">
        <Link href={`/${locale}`} aria-label="Granska"><Logo /></Link>
        <nav aria-label={t('nav.main')} className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <PageLink key={link.href} href={link.href} className="font-display text-sm text-soft transition-colors hover:text-text">{link.label}</PageLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 lg:gap-3">
          <LanguageSwitcher className="max-lg:bg-idle max-lg:font-sans" />
          <div className="hidden lg:block">
            {account ? <Button onClick={logOut} className="font-display">{t('dashboard.signOut')}</Button> : <Button href={getStarted} className="font-display">{t('nav.getStarted')}</Button>}
          </div>
          <button type="button" aria-label={t('nav.openMenu')} onClick={open} className="grid size-10 place-items-center rounded-full text-text lg:hidden">
            <MenuIcon width={20} height={20} />
          </button>
        </div>
      </div>

      <dialog ref={dialog} tabIndex={-1} data-lenis-prevent aria-label={t('nav.main')} className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 lg:hidden">
        <div className="flex h-full flex-col px-6 pb-6">
          <div className="flex h-20 shrink-0 items-center justify-between">
            <Logo />
            <button type="button" aria-label={t('nav.closeMenu')} onClick={close} className="grid size-10 place-items-center rounded-full text-text">
              <CrossIcon width={20} height={20} />
            </button>
          </div>
          <nav aria-label={t('nav.main')} className="mt-4 flex flex-col">
            {links.map((link) => (
              <PageLink key={link.href} href={link.href} onClick={close} className="border-b border-line py-4 text-lg text-text">{link.label}</PageLink>
            ))}
          </nav>
          <div className="mt-auto grid gap-3 pt-6">
            {account ? <Button onClick={logOut} className="w-full">{t('dashboard.signOut')}</Button> : (
              <>
                <Button href={getStarted} onClick={close} className="w-full">{t('nav.getStarted')}</Button>
                <Button href={logIn} onClick={close} variant="secondary" className="w-full">{t('nav.logIn')}</Button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </header>
  );
}
