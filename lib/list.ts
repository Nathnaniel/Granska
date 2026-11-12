// Reads an uploaded list and checks it through /api/verify/batch.
import type { Reason, Status } from './checks';

export const MAX_ADDRESSES = 1000;
const BATCH_SIZE = 25;
const PARALLEL_BATCHES = 2;
const BATCH_TIMEOUT_MS = 60000;

export interface ListResult { email: string; status: Status; reason: Reason; suggestion?: string | null }
export interface ParsedList { emails: string[]; duplicates: number }

// Splits one line of CSV or TSV, honouring quoted fields.
function splitRow(line: string, separator: string) {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

// Finds the email column: one named like "email", or else the first column with
// an @ in it. A first row without an @ in that column is treated as the header.
export function parseList(text: string): ParsedList {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { emails: [], duplicates: 0 };

  const sample = lines.slice(0, 5).join('\n');
  const separator = ['\t', ';', ','].reduce((best, sep) => (sample.split(sep).length > sample.split(best).length ? sep : best), ',');
  const rows = lines.map((line) => splitRow(line, separator));

  const header = rows[0].map((cell) => cell.toLowerCase());
  let column = header.findIndex((cell) => /^e-?mail( address)?$|^email_?address$/.test(cell));
  if (column === -1) {
    column = Math.max(0, rows.slice(0, 20).map((row) => row.findIndex((cell) => cell.includes('@'))).find((i) => i >= 0) ?? 0);
  }
  const body = rows[0][column]?.includes('@') ? rows : rows.slice(1);

  const seen = new Set<string>();
  const emails: string[] = [];
  let duplicates = 0;
  for (const row of body) {
    const email = row[column]?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) { duplicates += 1; continue; }
    seen.add(key);
    emails.push(email);
  }
  // A file where nothing looks like an address has no list to check.
  if (!emails.some((email) => email.includes('@'))) return { emails: [], duplicates: 0 };
  return { emails, duplicates };
}

export class ListError extends Error {}

async function checkBatch(emails: string[]): Promise<ListResult[]> {
  const response = await fetch('/api/verify/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails }),
    signal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
  });
  if (response.status === 429) throw new ListError('errorLimit');
  if (!response.ok) throw new ListError('errorStopped');
  const { results } = await response.json();
  return results.map((r: { email: string; status: Status; reasonKey: Reason; suggestion?: string | null }) => (
    { email: r.email, status: r.status, reason: r.reasonKey, suggestion: r.suggestion }
  ));
}

// Checks the list a batch at a time, reporting results in the list's order.
export async function checkList(emails: string[], onBatch: (results: ListResult[], done: number) => void, isCancelled: () => boolean) {
  const batches: string[][] = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) batches.push(emails.slice(i, i + BATCH_SIZE));

  const all: ListResult[] = [];
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const group = await Promise.all(batches.slice(i, i + PARALLEL_BATCHES).map(checkBatch));
    if (isCancelled()) return;
    for (const results of group) all.push(...results);
    onBatch([...all], all.length);
  }
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(results: ListResult[], reasonText: (r: ListResult) => string) {
  const rows = results.map((r) => [r.email, r.status, reasonText(r), r.suggestion ?? ''].map(csvCell).join(','));
  return ['email,status,reason,suggestion', ...rows].join('\n');
}

export function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
