'use client';

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { Status } from '@/lib/checks';
import { useT } from '@/lib/i18n';
import { checkList, download, ListError, MAX_ADDRESSES, parseList, toCsv, type ListResult } from '@/lib/list';
import { Button } from './ui/Button';
import { StatusPill } from './ui/StatusPill';
import { TickBar } from './ui/TickBar';

const MAX_BYTES = 20 * 1024 * 1024;
const KINDS = ['csv', 'tsv', 'txt'];
const STATUSES: Status[] = ['valid', 'risky', 'invalid', 'unknown'];

type ErrorKey = 'errorType' | 'errorSize' | 'errorNoEmails' | 'errorTooMany' | 'errorLimit' | 'errorStopped';

const IconBox = ({ src, className = 'border-edge' }: { src: string; className?: string }) => (
  <span className={`grid size-10 shrink-0 place-items-center rounded-xl border-[0.5px] transition-colors ${className}`}>
    <img src={src} width={16} height={16} alt="" />
  </span>
);

// Reads a list, checks every address and shows the verdicts as they come back.
export function UploadPanel({ onList }: { onList?: (active: boolean) => void }) {
  const t = useT();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [total, setTotal] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const [results, setResults] = useState<ListResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [dragging, setDragging] = useState(false);
  const run = useRef(0);

  useEffect(() => () => { run.current += 1; }, []);

  async function take(next?: File) {
    if (!next || running) return;
    const kind = next.name.split('.').pop()?.toLowerCase() ?? '';
    if (!KINDS.includes(kind)) return setError('errorType');
    if (next.size > MAX_BYTES) return setError('errorSize');

    const { emails, duplicates: dupes } = parseList(await next.text());
    if (emails.length === 0) return setError('errorNoEmails');
    if (emails.length > MAX_ADDRESSES) return setError('errorTooMany');

    const current = ++run.current;
    setError(null);
    setFile(next);
    setTotal(emails.length);
    setDuplicates(dupes);
    setResults([]);
    setRunning(true);
    onList?.(true);
    try {
      await checkList(emails, (done) => { if (current === run.current) setResults(done); }, () => current !== run.current);
    } catch (err) {
      if (current === run.current) setError(err instanceof ListError ? (err.message as ErrorKey) : 'errorStopped');
    }
    if (current === run.current) setRunning(false);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void take(event.dataTransfer.files[0]);
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, results.filter((r) => r.status === s).length])) as Record<Status, number>;
  const percent = total ? Math.round((results.length / total) * 100) : 0;
  const base = file?.name.replace(/\.[^.]+$/, '') ?? 'list';
  const reasonText = (r: ListResult) => t(`reasons.${r.reason}`);

  return (
    <div className="mx-auto max-w-[419px]">
      <input
        id={id} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" className="peer sr-only" disabled={running}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { void take(e.target.files?.[0]); e.target.value = ''; }}
      />
      <label
        htmlFor={id} data-active={dragging || undefined}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
        className="group flex min-h-[170px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-[1.5px] border-dashed border-edge px-5 py-6 text-center font-display transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:border-brand data-active:border-brand data-active:bg-[#fefffc]"
      >
        <IconBox src="/icons/file-export.svg" className="border-edge group-hover:border-brand group-data-active:border-brand" />
        <span>
          <span className="block text-sm leading-4 text-text">{t('dashboard.dropPrefix')} <span className="text-brand">{t('dashboard.dropBrowse')}</span></span>
          <span className="mt-2 block text-xs text-hint group-data-active:hidden">{t('dashboard.dropHint')}</span>
          <span className="mt-2 hidden text-xs text-hint group-data-active:block">{t('dashboard.dropHintLong')}</span>
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-ink">
          <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-invalid align-middle" />
          {t(`dashboard.${error}`, { max: MAX_ADDRESSES.toLocaleString() })}
        </p>
      )}

      {file && (
        <div className="mt-5 rounded-3xl border-[0.5px] border-edge p-6 font-display">
          <div className="flex items-center gap-4">
            <IconBox src="/icons/csv.svg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-end justify-between gap-3">
                <p className="truncate text-sm leading-4 text-text">{file.name}</p>
                <p className="text-xs text-text tabular-nums">{percent}%</p>
              </div>
              <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={file.name} className="mt-1"><TickBar value={percent} /></div>
              <p aria-live="polite" className="mt-2 text-xs text-hint tabular-nums">
                {t('dashboard.listProgress', { done: results.length, total })}
                {duplicates > 0 && ` · ${t('dashboard.duplicates', { count: duplicates })}`}
              </p>
            </div>
          </div>

          {results.length > 0 && (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <StatusPill status={status} /><span className="text-sm text-text tabular-nums">{counts[status]}</span>
                  </span>
                ))}
              </div>
              <ul data-lenis-prevent className="mt-4 max-h-80 divide-y divide-idle overflow-y-auto border-y border-line">
                {results.map((r, i) => (
                  <li key={`${i}-${r.email}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-text">{r.email}</span>
                      <span className="block text-xs text-soft">
                        {reasonText(r)}{r.suggestion && ` ${t('checker.didYouMean', { address: r.suggestion })}`}
                      </span>
                    </span>
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
              {!running && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => download(`${base}-checked.csv`, toCsv(results, reasonText))}>{t('dashboard.downloadAll')}</Button>
                  <Button disabled={counts.valid === 0} onClick={() => download(`${base}-valid.csv`, toCsv(results.filter((r) => r.status === 'valid'), reasonText))}>{t('dashboard.downloadValid')}</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
