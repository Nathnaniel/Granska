'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, type Session } from '@/lib/auth';
import { useLocale, useT } from '@/lib/i18n';
import { CheckerForm, useChecker } from './Checker';
import { CheckRows, Verdict } from './ResultCard';
import { Tabs } from './ui/Tabs';
import { UploadPanel } from './UploadPanel';

const DAILY_CHECKS = 10;
type Mode = 'input' | 'upload';

export function Dashboard() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [used, setUsed] = useState(0);
  const [mode, setMode] = useState<Mode>('input');
  const [onChecked] = useState(() => () => setUsed((n) => n + 1));
  const state = useChecker({ onChecked });
  const { result, rows, running, setValue, check } = state;

  useEffect(() => {
    const current = auth.getSession();
    if (current) setSession(current);
    else router.replace(`/${locale}/get-started?tab=login`);
  }, [router, locale]);

  if (!session) return null;
  const left = Math.max(DAILY_CHECKS - used, 0);

  return (
    <div className="mx-auto max-w-[552px] px-4 pt-[60px] pb-16">
      <div className="text-center">
        <h1 className="text-[32px]! leading-[42px]! font-bold! tracking-normal! text-ink!">{t('dashboard.greeting', { name: session.name })}</h1>
        <p className="mt-2.5 font-display text-sm text-secondary">{t('dashboard.sub')}</p>
        <div className="mt-6">
          <Tabs
            label={t('dashboard.modes')} value={mode} onChange={setMode}
            tabs={[{ id: 'input', label: t('dashboard.inputTab') }, { id: 'upload', label: t('dashboard.uploadTab') }]}
          />
        </div>
      </div>

      {mode === 'input' ? (
        <div role="tabpanel" className="mx-auto mt-2.5 max-w-[337px]">
          <CheckerForm state={state} aside={t('dashboard.creditsValue', { count: left, total: DAILY_CHECKS })} />
          {result && !running && (
            <div aria-live="polite" className="pt-5"><Verdict result={result} onSuggestion={(address) => { setValue(address); void check(address, 'suggestion'); }} /></div>
          )}
        </div>
      ) : (
        <div role="tabpanel" className="mt-[60px]"><UploadPanel /></div>
      )}

      <div className={`mx-auto max-w-[480px] ${mode === 'input' ? 'mt-[66px]' : 'mt-[46px]'}`}>
        <CheckRows rows={mode === 'input' ? rows : {}} running={mode === 'input' && running} />
      </div>
      <div className="mx-auto mt-[62px] max-w-[519px] px-1 font-display text-xs leading-4 text-text">
        <p>{t('checker.honest')}</p>
      </div>
    </div>
  );
}
