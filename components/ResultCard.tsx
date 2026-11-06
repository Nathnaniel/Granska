'use client';

import { CHECK_IDS, type CheckId, type CheckResult, type CheckState, type Rows } from '@/lib/checks';
import { useMessages, useT } from '@/lib/i18n';
import { StatusPill } from './ui/StatusPill';

export type RowState = CheckState | 'waiting' | 'current' | 'dim';

export function rowState(rows: Rows, running: boolean, index: number): RowState {
  const row = rows[CHECK_IDS[index]];
  if (row) return row.state;
  if (!running) return 'waiting';
  return index === CHECK_IDS.findIndex((id) => !rows[id]) ? 'current' : 'dim';
}

const MARK_LABELS = {
  passed: 'checker.passed', failed: 'checker.failed', skipped: 'checker.skipped', unknown: 'checker.couldntCheck',
} as const;

const ICONS: Record<RowState, string> = {
  waiting: '/icons/loader.svg', dim: '/icons/loader-dim.svg', current: '/icons/loader-current.svg',
  passed: '/icons/check.svg', failed: '/icons/failed.svg', skipped: '/icons/remove.svg', unknown: '/icons/remove.svg',
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
export function ResultCard({ result, rows, onSuggestion }: {
  result: CheckResult | null; rows: Rows; onSuggestion?: (address: string) => void;
}) {
  const t = useT();
  return (
    <div>
      {result && <Verdict result={result} onSuggestion={onSuggestion} />}
      <ul className={`border-t border-line ${result ? 'mt-4' : ''}`}>
        {CHECK_IDS.map((id) => {
          const state = rows[id]?.state;
          return (
            <li key={id} className={`flex items-center justify-between gap-3 border-b border-idle py-2 text-sm transition-colors last:border-b-0 ${state ? 'text-text' : 'text-muted'}`}>
              {t(`checks.${id}`)}
              <span className="sr-only">{state ? t(MARK_LABELS[state]) : t('checker.waiting')}</span>
              <RowIcon state={state ?? 'waiting'} src={state === 'passed' ? '/icons/check-dark.svg' : undefined} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TITLE: Record<RowState, string> = {
  waiting: 'text-muted', dim: 'text-faint', current: 'text-text', passed: 'text-text', failed: 'text-text', skipped: 'text-muted', unknown: 'text-muted',
};
const BODY: Record<RowState, string> = {
  waiting: 'text-muted', dim: 'text-faint', current: 'text-soft', passed: 'text-soft', failed: 'text-soft', skipped: 'text-muted', unknown: 'text-muted',
};
const MARK: Record<RowState, string> = {
  waiting: 'text-muted', dim: 'text-faint', current: 'text-muted', passed: 'text-valid', failed: 'text-invalid', skipped: 'text-muted', unknown: 'text-muted',
};

// The full list used on the dashboard: each check, what it found and where it stands.
export function CheckRows({ rows, running }: { rows: Rows; running: boolean }) {
  const t = useT();
  const m = useMessages();

  function detail(id: CheckId, state: RowState) {
    const key = rows[id]?.key;
    if (key) return t(`reasons.${key}`);
    return state === 'skipped' ? t('checker.notRun') : m.more.items[id];
  }

  function mark(state: RowState) {
    if (state === 'waiting' || state === 'dim') return t('checker.waiting');
    return state === 'current' ? `${t('checker.waiting')}..` : t(MARK_LABELS[state]);
  }

  return (
    <ul className="grid gap-[11px]">
      {CHECK_IDS.map((id, i) => {
        const state = rowState(rows, running, i);
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
