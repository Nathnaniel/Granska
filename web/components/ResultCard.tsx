'use client';

import { CHECK_IDS, type CheckId, type CheckResult, type CheckState } from '@/lib/demoCheck';
import { useMessages, useT } from '@/lib/i18n';
import { StatusPill } from './ui/StatusPill';

export type RowState = CheckState | 'waiting' | 'current' | 'dim';

export function rowState(result: CheckResult | null, step: number, index: number): RowState {
  if (!result) return 'waiting';
  if (index < step) return result.checks[CHECK_IDS[index]];
  return index === step ? 'current' : 'dim';
}

const ICONS: Record<RowState, string> = {
  waiting: '/icons/loader.svg', dim: '/icons/loader-dim.svg', current: '/icons/loader-current.svg',
  passed: '/icons/check.svg', failed: '/icons/failed.svg', skipped: '/icons/remove.svg',
};

function RowIcon({ state, src }: { state: RowState; src?: string }) {
  const spin = state === 'current' ? 'animate-spin motion-reduce:animate-none [animation-duration:1.6s]' : '';
  return <img src={src ?? ICONS[state]} width={24} height={24} alt="" className={`size-6 shrink-0 ${spin}`} />;
}

export function Verdict({ result, onSuggestion }: { result: CheckResult; onSuggestion?: (address: string) => void }) {
  const t = useT();
  return (
    <>
      <StatusPill status={result.status} />
      <p className="pt-2 text-sm font-medium break-all text-text">{result.email}</p>
      <p className="pt-1 text-sm text-soft">{t(`reasons.${result.reason}`)}</p>
      {result.suggestion && (
        <button type="button" onClick={() => onSuggestion?.(result.suggestion!)} className="mt-2 text-left text-sm font-medium text-text underline underline-offset-2">
          {t('checker.didYouMean', { address: result.suggestion })}
        </button>
      )}
    </>
  );
}

// The compact result used on the home page.
export function ResultCard({ result, step, onSuggestion }: {
  result: CheckResult; step: number; onSuggestion?: (address: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <Verdict result={result} onSuggestion={onSuggestion} />
      <ul className="mt-4 border-t border-line">
        {CHECK_IDS.map((id, i) => {
          const state = rowState(result, step, i);
          const settled = i < step;
          return (
            <li key={id} className="flex items-center justify-between gap-3 border-b border-idle py-2 text-sm text-text last:border-b-0">
              {t(`checks.${id}`)}
              <span className="sr-only">{settled ? t(`checker.${state as CheckState}`) : t('checker.waiting')}</span>
              <RowIcon state={state} src={!settled ? '/icons/loader.svg' : state === 'passed' ? '/icons/check-dark.svg' : undefined} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TITLE: Record<RowState, string> = {
  waiting: 'text-muted', dim: 'text-faint', current: 'text-text', passed: 'text-text', failed: 'text-text', skipped: 'text-muted',
};
const BODY: Record<RowState, string> = {
  waiting: 'text-muted', dim: 'text-faint', current: 'text-soft', passed: 'text-soft', failed: 'text-soft', skipped: 'text-muted',
};
const MARK: Record<RowState, string> = {
  waiting: 'text-muted', dim: 'text-faint', current: 'text-muted', passed: 'text-valid', failed: 'text-invalid', skipped: 'text-muted',
};

// The full list used on the dashboard: each check, what it found and where it stands.
export function CheckRows({ result, step }: { result: CheckResult | null; step: number }) {
  const t = useT();
  const m = useMessages();

  function detail(id: CheckId, state: RowState) {
    if (state === 'failed') return t(`reasons.${result!.reason}`);
    if (state !== 'skipped') return m.more.items[id];
    return result!.status === 'unknown' ? t('checker.noAnswer') : t('checker.notRun');
  }

  function mark(state: RowState) {
    if (state === 'passed' || state === 'failed') return t(`checker.${state}`);
    if (state === 'skipped') return result!.status === 'unknown' ? t('checker.couldntCheck') : t('checker.skipped');
    return state === 'current' ? `${t('checker.waiting')}..` : t('checker.waiting');
  }

  return (
    <ul className="grid gap-[11px]">
      {CHECK_IDS.map((id, i) => {
        const state = rowState(result, step, i);
        return (
          <li key={id} className="flex items-center gap-4 font-display text-sm">
            <RowIcon state={state} />
            <div className="min-w-0 flex-1">
              <p className={`leading-5 font-medium transition-colors ${TITLE[state]}`}>{t(`checks.${id}`)}</p>
              <p className={`leading-5 transition-colors ${BODY[state]}`}>{detail(id, state)}</p>
            </div>
            <p className={`shrink-0 text-xs ${MARK[state]}`}>{mark(state)}</p>
          </li>
        );
      })}
    </ul>
  );
}
