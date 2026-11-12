'use client';

import { useEffect, useId, useState, type ChangeEvent, type DragEvent } from 'react';
import { useT } from '@/lib/i18n';
import { TickBar } from './ui/TickBar';

const MAX_BYTES = 20 * 1024 * 1024;
const KINDS = ['csv', 'tsv', 'txt'];
const STEP = 8;
const TICK_MS = 80;

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const IconBox = ({ src, className = 'border-edge' }: { src: string; className?: string }) => (
  <span className={`grid size-10 shrink-0 place-items-center rounded-xl border-[0.5px] transition-colors ${className}`}>
    <img src={src} width={16} height={16} alt="" />
  </span>
);

// List checks aren't live yet, so the bar shows the file being taken in and the
// note under it says what happens next.
export function UploadPanel() {
  const t = useT();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<'errorType' | 'errorSize' | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file || progress >= 100) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setProgress(reduce ? 100 : Math.min(progress + STEP, 100)), TICK_MS);
    return () => clearTimeout(timer);
  }, [file, progress]);

  function take(next?: File) {
    if (!next) return;
    const kind = next.name.split('.').pop()?.toLowerCase() ?? '';
    if (!KINDS.includes(kind)) return setError('errorType');
    if (next.size > MAX_BYTES) return setError('errorSize');
    setError(null);
    setFile(next);
    setProgress(0);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files[0]);
  }

  const kind = file?.name.split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="mx-auto max-w-[419px]">
      <input
        id={id} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" className="peer sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => { take(e.target.files?.[0]); e.target.value = ''; }}
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
        <p role="alert" className="mt-3 text-sm text-ink"><span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-invalid align-middle" />{t(`dashboard.${error}`)}</p>
      )}

      {file && (
        <div className="mt-5 flex items-center gap-4 rounded-3xl border-[0.5px] border-edge p-6 font-display">
          <IconBox src="/icons/csv.svg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-end justify-between gap-3">
              <p className="truncate text-sm leading-4 text-text">{file.name}</p>
              <p className="text-xs text-text tabular-nums">{progress}%</p>
            </div>
            <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={file.name} className="mt-1"><TickBar value={progress} /></div>
            <p className="mt-2 text-xs text-hint">
              {t('dashboard.fileProgress', { type: kind, done: megabytes((file.size * progress) / 100), total: megabytes(file.size) })}
            </p>
          </div>
        </div>
      )}
      {file && progress >= 100 && <p aria-live="polite" className="mt-3 text-sm text-soft">{t('dashboard.uploadNote', { file: file.name })}</p>}
    </div>
  );
}
