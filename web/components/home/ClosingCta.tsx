'use client';

import { Button } from '@/components/ui/Button';
import { ImageCard } from '@/components/ui/Card';
import { Reveal } from '@/components/ui/Reveal';
import { useLocale, useT } from '@/lib/i18n';

export function ClosingCta() {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="mx-auto max-w-[1080px] px-4 pb-24 md:px-6 md:pb-[120px]">
      <Reveal>
        <ImageCard className="relative grid min-h-[280px] place-items-center rounded-3xl! px-4 py-14 text-center">
          <span aria-hidden className="absolute inset-0 bg-text/4 backdrop-blur-[32px]" />
          <div className="relative">
            <h2>{t('cta.title')}</h2>
            <p className="mt-3 text-xs text-soft">{t('cta.small')}</p>
            <Button href={`/${locale}/get-started`} variant="dark" className="mt-10">{t('nav.getStarted')}</Button>
          </div>
        </ImageCard>
      </Reveal>
    </section>
  );
}
