'use client';

import { Button } from '@/components/ui/Button';
import { useLocale, useT } from '@/lib/i18n';

export function InfoPage({ page }: { page: 'docs' | 'privacy' | 'terms' }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="mx-auto max-w-[720px] px-4 py-24 md:px-6">
      <h1>{t(`soon.${page}`)}</h1>
      <p className="mt-3 text-soft">{t('soon.body')}</p>
      <Button href={`/${locale}`} variant="secondary" className="mt-6">{t('soon.back')}</Button>
    </div>
  );
}
