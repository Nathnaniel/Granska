'use client';

import { useCallback, useId, useRef, useState, type FormEvent } from 'react';
import { looksLikeEmail, SAMPLE, streamCheck, type CheckError, type CheckResult, type Rows, type Source } from '@/lib/checks';
import { useT } from '@/lib/i18n';
import { ResultCard } from './ResultCard';
import { EmailField } from './ui/EmailField';
import { ArrowIcon } from './ui/icons';

const STEP_MS = 350; // The first checks take milliseconds, so hold each one long enough to read.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = () => new Promise((resolve) => setTimeout(resolve, reducedMotion() ? 0 : STEP_MS));

// Runs a check against /api/verify and settles its rows as the server reports them.
export function useChecker({ sample = false, onChecked }: { sample?: boolean; onChecked?: () => void } = {}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<'errorEmpty' | 'errorInvalid' | null>(null);
  const [failure, setFailure] = useState<CheckError | null>(null);
  const [result, setResult] = useState<CheckResult | null>(sample ? SAMPLE : null);
  const [rows, setRows] = useState<Rows>({});
  const [running, setRunning] = useState(false);
  const [isSample, setIsSample] = useState(sample);
  const input = useRef<HTMLInputElement>(null);
  const run = useRef(0);
  const typed = useRef(0); // Page memory only, so the server can count repeat use without identifying anyone.

  const check = useCallback(async (address: string, source?: Source) => {
    const trimmed = address.trim();
    if (!trimmed) { setError('errorEmpty'); input.current?.focus(); return; }
    if (!looksLikeEmail(trimmed)) { setError('errorInvalid'); input.current?.focus(); return; }

    const current = ++run.current;
    const origin = source ?? (typed.current === 0 ? 'first' : 'repeat');
    if (!source) typed.current += 1;
    setError(null);
    setFailure(null);
    setResult(null);
    setRows({});
    setIsSample(false);
    setRunning(true);

    try {
      for await (const event of streamCheck(trimmed, origin)) {
        if (current !== run.current) return;
        if (event.type === 'check') {
          setRows((settled) => ({ ...settled, [event.id]: event.row }));
          await pause();
        } else {
          setRows(event.result.rows);
          setResult(event.result);
          onChecked?.();
        }
      }
    } catch (err) {
      if (current !== run.current) return;
      setRows({});
      setFailure(err instanceof Error && err.message === 'errorRate' ? 'errorRate' : 'errorServer');
    }
    if (current === run.current) setRunning(false);
  }, [onChecked]);

  return { value, setValue, error, setError, failure, result, rows, running, isSample, input, check };
}

export type CheckerState = ReturnType<typeof useChecker>;

export function CheckerForm({ state, aside, active = false }: { state: CheckerState; aside?: string; active?: boolean }) {
  const t = useT();
  const id = useId();
  const { value, setValue, error, setError, failure, running, input, check } = state;
  const ready = active || value.trim() !== '';
  const message = error ?? failure;
  return (
    <form noValidate className="group" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!running) void check(value); }}>
      <div className="relative">
        {aside && <p className="absolute top-0 right-0 font-display text-xs leading-4 text-soft">{aside}</p>}
        <EmailField
          id={id} inputRef={input} label={t('auth.emailLabel')} autoComplete="off" value={value}
          placeholder={t('auth.emailPlaceholder')} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
        />
      </div>
      {message && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-ink"><span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-invalid align-middle" />{t(`checker.${message}`)}</p>}
      <button
        type="submit" disabled={running}
        className={`mt-5 flex h-[38px] w-full items-center justify-center gap-2 rounded-[40px] font-display text-sm transition-colors disabled:cursor-not-allowed ${ready ? 'bg-brand text-white' : 'bg-idle text-soft group-focus-within:bg-brand group-focus-within:text-white'}`}
      >
        <ArrowIcon /> {running ? t('checker.checking') : t('checker.verify')}
      </button>
    </form>
  );
}

export function Checker({ sample = false }: { sample?: boolean }) {
  const t = useT();
  const state = useChecker({ sample });
  const { result, rows, running, isSample, setValue, check } = state;
  return (
    <div>
      <CheckerForm state={state} active={sample} />
      <div aria-live="polite" aria-busy={running} className="pt-5">
        <ResultCard result={result} rows={rows} onSuggestion={(address) => { setValue(address); void check(address, 'suggestion'); }} />
      </div>
      {isSample && <p className="pt-3 text-xs text-soft">{t('checker.sampleNote')}</p>}
    </div>
  );
}
