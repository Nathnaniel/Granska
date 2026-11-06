'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CHECK_IDS, looksLikeEmail, runDemoCheck, type CheckResult } from '@/lib/demoCheck';
import { useT } from '@/lib/i18n';
import { ResultCard } from './ResultCard';
import { EmailField } from './ui/EmailField';
import { ArrowIcon } from './ui/icons';

const STEP_MS = 450;
const DONE = CHECK_IDS.length;

// Runs a check and settles its rows one at a time, like the real server's stream.
export function useChecker({ sample, onChecked }: { sample?: string; onChecked?: () => void } = {}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<'errorEmpty' | 'errorInvalid' | null>(null);
  const [result, setResult] = useState<CheckResult | null>(sample ? runDemoCheck(sample) : null);
  const [step, setStep] = useState(sample ? 1 : 0);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const running = !!result && step < DONE;

  useEffect(() => {
    if (!result || step >= DONE) {
      if (result && pending.current) { pending.current = false; onChecked?.(); }
      return;
    }
    const rest = CHECK_IDS.slice(step).every((id) => result.checks[id] === 'skipped');
    const instant = rest || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = setTimeout(() => setStep(instant ? DONE : step + 1), instant ? 0 : STEP_MS);
    return () => clearTimeout(id);
  }, [result, step, onChecked]);

  const check = useCallback((address: string) => {
    const trimmed = address.trim();
    if (!trimmed) { setError('errorEmpty'); input.current?.focus(); return; }
    if (!looksLikeEmail(trimmed)) { setError('errorInvalid'); input.current?.focus(); return; }
    setError(null);
    pending.current = true;
    setResult(runDemoCheck(trimmed));
    setStep(0);
  }, []);

  return { value, setValue, error, setError, result, step, running, input, check };
}

export type CheckerState = ReturnType<typeof useChecker>;

export function CheckerForm({ state, aside, active = false }: { state: CheckerState; aside?: string; active?: boolean }) {
  const t = useT();
  const id = useId();
  const { value, setValue, error, setError, running, input, check } = state;
  const ready = active || value.trim() !== '';
  return (
    <form noValidate className="group" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!running) check(value); }}>
      <div className="relative">
        {aside && <p className="absolute top-0 right-0 font-display text-xs leading-4 text-soft">{aside}</p>}
        <EmailField
          id={id} inputRef={input} label={t('auth.emailLabel')} autoComplete="off" value={value}
          placeholder={t('auth.emailPlaceholder')} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
        />
      </div>
      {error && <p id={`${id}-error`} className="mt-2 text-sm text-ink"><span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-invalid align-middle" />{t(`checker.${error}`)}</p>}
      <button
        type="submit" disabled={running}
        className={`mt-5 flex h-[38px] w-full items-center justify-center gap-2 rounded-[40px] font-display text-sm transition-colors disabled:cursor-not-allowed ${ready ? 'bg-brand text-white' : 'bg-idle text-soft group-focus-within:bg-brand group-focus-within:text-white'}`}
      >
        <ArrowIcon /> {running ? t('checker.checking') : t('checker.verify')}
      </button>
    </form>
  );
}

export function Checker({ sample }: { sample?: string }) {
  const t = useT();
  const state = useChecker({ sample });
  const { result, step, running, setValue, check } = state;
  return (
    <div>
      <CheckerForm state={state} active={!!sample} />
      <div aria-live="polite" aria-busy={running} className="pt-5">
        {result && (
          <ResultCard result={result} step={step} onSuggestion={(address) => { setValue(address); check(address); }} />
        )}
      </div>
      <p className="pt-3 text-xs text-soft">{t('checker.demoNote')}</p>
    </div>
  );
}
