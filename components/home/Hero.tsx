'use client';

import { Checker } from '@/components/Checker';
import { Button } from '@/components/ui/Button';
import { ImageCard } from '@/components/ui/Card';
import { useLocale, useT } from '@/lib/i18n';

export function Hero() {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="mx-auto grid max-w-[1067px] gap-10 px-4 pt-12 pb-12 md:px-6 lg:grid-cols-[566px_365px] lg:justify-between lg:gap-0 lg:pt-[176px]">
      <div className="lg:order-2 lg:self-end lg:pb-40">
        <h1 className="lg:text-[2.25rem]! lg:tracking-[0.02em]!">{t('hero.title')}</h1>
        <p className="mt-4 max-w-[346px] font-display text-base text-soft">{t('hero.sub')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={`/${locale}/get-started`} className="font-display">{t('nav.getStarted')}</Button>
          <Button href={`/${locale}#checker`} variant="secondary">{t('hero.tryFree')}</Button>
        </div>
      </div>
      <ImageCard className="flex items-center justify-center px-4 py-10 sm:px-10 sm:py-[61px] lg:order-1 lg:min-h-[720px]">
        <div id="checker" className="w-full max-w-[418px] rounded-2xl bg-white px-5 py-8 shadow-[0_6px_24px_rgb(54_54_54/0.1)] sm:px-10 sm:py-12">
          <Checker sample />
        </div>
      </ImageCard>
    </section>
  );
}
