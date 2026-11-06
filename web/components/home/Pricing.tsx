'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { PricingCard } from '@/components/PricingCard';
import { Pill } from '@/components/ui/Pill';
import { Reveal } from '@/components/ui/Reveal';
import { useLocale, useMessages, useT } from '@/lib/i18n';
import { formatUsd, planPrice, type Billing, type PlanId } from '@/lib/plans';
import { Intro, Section } from './Section';

const OPTIONS: Billing[] = ['monthly', 'annual'];

function BillingToggle({ value, onChange }: { value: Billing; onChange: (next: Billing) => void }) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const next = value === 'monthly' ? 'annual' : 'monthly';
    onChange(next);
    refs.current[OPTIONS.indexOf(next)]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={t('pricing.billing')} onKeyDown={onKey} className="relative inline-grid grid-cols-2">
      <span aria-hidden className={`slide absolute inset-y-0 left-0 w-1/2 rounded-[48px] bg-idle transition-transform duration-200 ${value === 'annual' ? 'translate-x-full' : ''}`} />
      {OPTIONS.map((option, i) => (
        <button
          key={option} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === option}
          tabIndex={value === option ? 0 : -1} onClick={() => onChange(option)}
          className={`relative z-10 h-9 rounded-[48px] px-5 text-sm transition-colors ${value === option ? 'text-text' : 'text-soft'}`}
        >
          {t(option === 'monthly' ? 'pricing.monthly' : 'pricing.annually')}
        </button>
      ))}
    </div>
  );
}

export function Pricing() {
  const t = useT();
  const m = useMessages();
  const locale = useLocale();
  const [billing, setBilling] = useState<Billing>('monthly');

  const paid = (plan: PlanId) => ({
    price: formatUsd(planPrice(plan, billing), locale),
    period: t('pricing.perMonth'),
    note: billing === 'annual' ? t('pricing.billedAnnually') : undefined,
    href: `/${locale}/get-started?plan=${plan}${billing === 'annual' ? '&billing=annual' : ''}`,
  });

  return (
    <Section id="pricing" tight>
      <Reveal>
        <Intro title={t('pricing.title')} body={t('pricing.sub')} />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <BillingToggle value={billing} onChange={setBilling} />
          <Pill className="bg-tan/25 text-ink">{t('pricing.save')}</Pill>
        </div>
      </Reveal>
      <Reveal className="mt-8 grid gap-5 md:grid-cols-3">
        <PricingCard name={m.pricing.free.name} price={formatUsd(0, locale)} items={m.pricing.free.items} cta={m.pricing.starter.cta} href={`/${locale}#checker`} />
        <PricingCard name={m.pricing.starter.name} items={m.pricing.starter.items} cta={m.pricing.starter.cta} ctaFirst {...paid('starter')} />
        <PricingCard name={m.pricing.pro.name} items={m.pricing.pro.items} cta={m.pricing.pro.cta} badge={t('pricing.popular')} highlighted ctaFirst {...paid('pro')} />
      </Reveal>
      <p className="mt-6 text-sm text-soft">{t('pricing.note1')} {t('pricing.note2')}</p>
    </Section>
  );
}
