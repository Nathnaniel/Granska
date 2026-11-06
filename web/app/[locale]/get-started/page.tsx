import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Logo } from '@/components/ui/Logo';
import { isLocale } from '@/lib/locales';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return isLocale(locale) ? pageMetadata(locale, '/get-started', 'meta.getStarted') : {};
}

export default async function GetStarted({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="landscape flex min-h-dvh flex-col">
      <div className="mx-auto flex h-20 w-full max-w-[1080px] items-center justify-between px-4 md:px-6">
        <Link href={`/${locale}`} aria-label="Granska"><Logo /></Link>
        <LanguageSwitcher />
      </div>
      <main id="content" className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense><AuthCard /></Suspense>
      </main>
    </div>
  );
}
