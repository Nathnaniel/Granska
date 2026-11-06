'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Reveal } from '@/components/ui/Reveal';
import { StatusPill } from '@/components/ui/StatusPill';
import { TickBar } from '@/components/ui/TickBar';
import { useT } from '@/lib/i18n';
import { Intro, Section } from './Section';

function Feature({ title, body, stage = 'px-5 py-10', children }: { title: string; body: string; stage?: string; children: ReactNode }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className={`flex min-h-[150px] items-center justify-center bg-surface ${stage}`}>{children}</div>
      <div className="p-5">
        <h3>{title}</h3>
        <p className="mt-1 text-sm text-soft">{body}</p>
      </div>
    </Card>
  );
}

const Tile = ({ children, className = 'rounded-xl' }: { children: ReactNode; className?: string }) => (
  <div className={`w-full border-[0.5px] border-line bg-white p-3 text-sm ${className}`}>{children}</div>
);

function Gauge({ value }: { value: number }) {
  const length = Math.PI * 40;
  return (
    <svg viewBox="0 0 100 56" className="mx-auto h-[45px]" aria-hidden>
      <path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke="var(--color-line)" strokeWidth="8" strokeLinecap="round" />
      <path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke="var(--color-brand)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(length * value) / 100} ${length}`} />
      <text x="50" y="48" textAnchor="middle" fontSize="25" fill="var(--color-text)">{value}</text>
    </svg>
  );
}

export function Features() {
  const t = useT();
  return (
    <Section id="features">
      <Reveal><Intro title={t('features.title')} body={t('features.sub')} /></Reveal>
      <div className="mt-10 grid max-w-[1008px] grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal>
          <Feature title={t('features.typo.title')} body={t('features.typo.body')}>
            <Tile className="rounded-[20px]">
              <p className="text-soft line-through">sara@gmial.com</p>
              <p className="mt-1 font-medium text-text">{t('checker.didYouMean', { address: 'sara@gmail.com' })}</p>
            </Tile>
          </Feature>
        </Reveal>
        <Reveal>
          <Feature title={t('features.disposable.title')} body={t('features.disposable.body')}>
            <Tile className="flex items-center justify-between gap-2 rounded-xl">
              <span className="truncate text-text">x7f2@mailinator.com</span>
              <StatusPill status="risky" />
            </Tile>
          </Feature>
        </Reveal>
        <Reveal>
          <Feature title={t('features.bulk.title')} body={t('features.bulk.body')}>
            <div className="flex w-full items-center gap-[11px] rounded-2xl border-[0.5px] border-edge bg-white p-4 font-display">
              <span className="grid size-[27px] shrink-0 place-items-center rounded-lg border-[0.5px] border-edge"><img src="/icons/csv.svg" width={11} height={11} alt="" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex items-end justify-between gap-2 text-[10px] leading-3 text-text">leads october <span className="text-[7px]">{t('features.bulk.valid')}</span></p>
                <TickBar value={100} className="mt-0.5 h-1" />
                <p className="mt-1 text-[7px] leading-[10px] text-hint">{t('features.bulk.checked')}</p>
              </div>
            </div>
          </Feature>
        </Reveal>
        <Reveal>
          <Feature title={t('features.score.title')} body={t('features.score.body')}>
            <div className="text-center">
              <Gauge value={92} />
              <p className="mt-1 text-xs text-soft">{t('features.score.label')}</p>
            </div>
          </Feature>
        </Reveal>
        <Reveal>
          <Feature title={t('features.api.title')} body={t('features.api.body')} stage="px-5 py-2.5">
            <pre className="w-full overflow-hidden rounded-2xl border-[0.5px] border-line bg-white p-3 font-mono text-[11px] leading-relaxed text-text">
{`GET /v1/verify?email=anna@fjordlabs.se

{
  "status": "valid",
  "score": 92
}`}
            </pre>
          </Feature>
        </Reveal>
        <Reveal>
          <Feature title={t('features.privacy.title')} body={t('features.privacy.body')}>
            <Tile className="grid gap-2 rounded-xl">
              <p className="flex justify-between text-soft">{t('features.privacy.sent')} <span className="font-medium text-text">0</span></p>
              <p className="flex justify-between text-soft">{t('features.privacy.stored')} <span className="font-medium text-text">0</span></p>
            </Tile>
          </Feature>
        </Reveal>
      </div>
    </Section>
  );
}
