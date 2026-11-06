'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { EmailField } from '@/components/ui/EmailField';
import { GoogleIcon } from '@/components/ui/icons';
import { Pill } from '@/components/ui/Pill';
import { Tabs } from '@/components/ui/Tabs';
import { auth } from '@/lib/auth';
import { looksLikeEmail } from '@/lib/checks';
import { useLocale, useMessages, useT } from '@/lib/i18n';
import { formatUsd, isPlan, planPrice } from '@/lib/plans';

const RESEND_SECONDS = 60;
type Tab = 'create' | 'login';
type ErrorKey = 'errorEmpty' | 'errorInvalid' | 'errorExpired' | 'errorGeneric';

export function AuthCard() {
  const t = useT();
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [tab, setTab] = useState<Tab>(params.get('tab') === 'login' ? 'login' : 'create');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<ErrorKey | null>(params.get('error') === 'expired' ? 'errorExpired' : null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const plan = params.get('plan');
  const billing = params.get('billing') === 'annual' ? 'annual' : 'monthly';
  const dashboard = `/${locale}/dashboard`;

  async function send(address: string) {
    setBusy(true);
    try {
      await auth.sendMagicLink(address);
      setSentTo(address);
      setCooldown(RESEND_SECONDS);
    } catch {
      setError('errorGeneric');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return setError('errorEmpty');
    if (!looksLikeEmail(address)) return setError('errorInvalid');
    setError(null);
    void send(address);
  }

  async function google() {
    setBusy(true);
    try {
      await auth.signInWithGoogle();
      router.push(dashboard);
    } catch {
      setError('errorGeneric');
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] rounded-3xl bg-white px-5 py-[46px] sm:px-8">
      {isPlan(plan) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <Pill className="bg-tan/25 text-ink">
            <span suppressHydrationWarning>{t('auth.planPill', { plan: m.pricing[plan].name, price: `${formatUsd(planPrice(plan, billing), locale)}${t('pricing.perMonth')}` })}</span>
          </Pill>
          <Link href={`/${locale}#pricing`} className="text-xs text-soft underline underline-offset-2 hover:text-text">{t('auth.change')}</Link>
        </div>
      )}

      {sentTo ? (
        <div aria-live="polite">
          <h1 className="text-[24px]!">{t('auth.checkInbox')}</h1>
          <p className="mt-2 text-sm break-words text-soft">{t('auth.sent', { email: sentTo })}</p>
          <div className="mt-5 grid gap-2">
            <Button onClick={async () => { await auth.completeMagicLink(sentTo); router.push(dashboard); }}>{t('auth.demoOpen')}</Button>
            <Button
              variant="secondary" disabled={cooldown > 0 || busy}
              onClick={async () => { await send(sentTo); setResent(true); }}
            >
              {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
            </Button>
          </div>
          {resent && <p className="mt-3 text-sm text-soft">{t('auth.resent')}</p>}
          <button type="button" onClick={() => { setSentTo(null); setResent(false); setCooldown(0); }} className="mt-4 text-sm text-soft underline underline-offset-2 hover:text-text">
            {t('auth.differentEmail')}
          </button>
        </div>
      ) : (
        <>
          <div className="text-center">
            <Tabs
              label={t('auth.tabs')} value={tab} onChange={setTab}
              tabs={[{ id: 'create', label: t('auth.createTab') }, { id: 'login', label: t('auth.loginTab') }]}
            />
          </div>
          <h1 className="sr-only">{t(tab === 'create' ? 'auth.createTab' : 'auth.loginTab')}</h1>

          <Button variant="secondary" onClick={google} disabled={busy} className="mt-10 w-full bg-idle! text-text!">
            <GoogleIcon /> {t('auth.google')}
          </Button>

          <div className="mx-auto mt-4 flex max-w-[196px] items-center gap-3 text-xs text-soft">
            <span className="h-px flex-1 bg-line/40" />{t('auth.or')}<span className="h-px flex-1 bg-line/40" />
          </div>

          <form noValidate onSubmit={onSubmit} className="mt-1">
            <EmailField
              id="auth-email" label={t('auth.emailLabel')} autoComplete="email" value={email} placeholder={t('auth.emailPlaceholder')}
              aria-invalid={!!error && error !== 'errorExpired'} aria-describedby={error ? 'auth-error' : undefined}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
            />
            {error && (
              <p id="auth-error" role="alert" className="mt-2 text-sm text-ink">
                <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-invalid align-middle" />{t(`auth.${error}`)}
              </p>
            )}
            <Button type="submit" disabled={busy} className="mt-5 h-[38px] w-full font-display font-normal">{busy ? t('auth.sending') : t('auth.continueEmail')}</Button>
          </form>
        </>
      )}
    </div>
  );
}
