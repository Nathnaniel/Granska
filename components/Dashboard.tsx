'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { CheckerForm, useChecker } from './Checker';
import { CheckRows, Verdict } from './ResultCard';
import { Tabs } from './ui/Tabs';
import { UploadPanel } from './UploadPanel';

type Mode = 'input' | 'upload';

// The email checker, open to everyone. Sign-in and daily counts are switched off.
export function Dashboard() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('input');
  const [listActive, setListActive] = useState(false);
  const state = useChecker();
  const { result, rows, running, setValue, check } = state;

  return (
    <div className="mx-auto max-w-[552px] px-4 pt-[60px] pb-16">
      <div className="text-center">
        <h1 className="text-ink!">{t('hero.title')}</h1>
        <p className="mx-auto mt-2.5 max-w-[420px] font-display text-sm text-secondary">{t('hero.sub')}</p>
        <div className="mt-6">
          <Tabs
            label={t('dashboard.modes')} value={mode} onChange={setMode}
            tabs={[{ id: 'input', label: t('dashboard.inputTab') }, { id: 'upload', label: t('dashboard.uploadTab') }]}
          />
        </div>
      </div>

      {mode === 'input' ? (
        <div role="tabpanel" className="mx-auto mt-2.5 max-w-[337px]">
          <CheckerForm state={state} />
          {result && !running && (
            <div aria-live="polite" className="pt-5"><Verdict result={result} onSuggestion={(address) => { setValue(address); void check(address, 'suggestion'); }} /></div>
          )}
        </div>
      ) : (
        <div role="tabpanel" className="mt-[60px]"><UploadPanel onList={setListActive} /></div>
      )}

      {!(mode === 'upload' && listActive) && <div className={`mx-auto max-w-[480px] ${mode === 'input' ? 'mt-[66px]' : 'mt-[46px]'}`}>
        <CheckRows rows={mode === 'input' ? rows : {}} running={mode === 'input' && running} />
      </div>}
      <div className="mx-auto mt-[62px] max-w-[519px] px-1 font-display text-xs leading-normal text-text">
        <p>{t('checker.honest')}</p>
      </div>
    </div>
  );
}
