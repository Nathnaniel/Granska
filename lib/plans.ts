import type { Locale } from './locales';

export type PlanId = 'starter' | 'pro';
export type Billing = 'monthly' | 'annual';

const MONTHLY: Record<PlanId, number> = { starter: 9, pro: 29 };
export const isPlan = (value: unknown): value is PlanId => value === 'starter' || value === 'pro';

export const planPrice = (plan: PlanId, billing: Billing) => (billing === 'annual' ? MONTHLY[plan] * 0.8 : MONTHLY[plan]);

export function formatUsd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2,
  }).format(amount);
}
