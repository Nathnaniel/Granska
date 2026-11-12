'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ImageCard } from '@/components/ui/Card';
import { Reveal } from '@/components/ui/Reveal';
import { StatusPill } from '@/components/ui/StatusPill';
import type { Status } from '@/lib/checks';
import { useT } from '@/lib/i18n';
import { Intro, Section } from './Section';

function UseCase({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div>
      <ImageCard parallax className="p-4 sm:p-8">
        <div className="rounded-2xl bg-white p-4 text-sm shadow-[0_6px_24px_rgb(54_54_54/0.1)]">{children}</div>
      </ImageCard>
      <h3 className="mt-4">{title}</h3>
      <p className="mt-1 text-sm text-soft">{body}</p>
    </div>
  );
}

const LIST: [string, Status][] = [
  ['lena@fjordlabs.se', 'valid'],
  ['info@oakhouse.co', 'risky'],
  ['tom@gmial.com', 'invalid'],
  ['priya@rivetworks.io', 'unknown'],
];

export function UseCases() {
  const t = useT();
  return (
    <Section id="use-cases">
      <div className="mx-auto max-w-[832px]">
      <Reveal><Intro title={t('useCases.title')} /></Reveal>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Reveal>
          <UseCase title={t('useCases.signups.title')} body={t('useCases.signups.body')}>
            <p className="text-xs text-soft">{t('useCases.signups.field')}</p>
            <div className="mt-1.5 flex h-10 items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3">
              <span className="truncate text-text">jonas@brightpath.io</span>
              <span className="shrink-0 text-xs font-medium text-ink">{t('useCases.signups.ok')}</span>
            </div>
            <Button tabIndex={-1} aria-hidden className="mt-3 w-full">{t('useCases.signups.button')}</Button>
          </UseCase>
        </Reveal>
        <Reveal>
          <UseCase title={t('useCases.sales.title')} body={t('useCases.sales.body')}>
            <p className="flex items-center justify-between gap-2 border-b border-line pb-2">
              <span className="truncate text-soft">{t('useCases.sales.to')}: <span className="text-text">maria@northpeak.com</span></span>
              <StatusPill status="valid" />
            </p>
            <p className="mt-2 font-medium text-text">{t('useCases.sales.subject')}</p>
            <p className="mt-1 text-soft">{t('useCases.sales.line')}</p>
            <p className="mt-2 text-xs text-soft">{t('useCases.sales.note')}</p>
          </UseCase>
        </Reveal>
        <Reveal>
          <UseCase title={t('useCases.marketing.title')} body={t('useCases.marketing.body')}>
            <ul className="divide-y divide-line">
              {LIST.map(([address, status]) => (
                <li key={address} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate text-text">{address}</span>
                  <StatusPill status={status} />
                </li>
              ))}
            </ul>
          </UseCase>
        </Reveal>
        <Reveal>
          <UseCase title={t('useCases.invoices.title')} body={t('useCases.invoices.body')}>
            <p className="flex justify-between gap-2 font-medium text-text"><span>{t('useCases.invoices.invoice')}</span><span>{t('useCases.invoices.amount')}</span></p>
            <p className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
              <span className="truncate text-text">billing@oakhouse.co</span>
              <StatusPill status="risky" />
            </p>
            <p className="mt-3 text-xs text-soft">{t('useCases.invoices.send')}</p>
          </UseCase>
        </Reveal>
      </div>
      </div>
    </Section>
  );
}
