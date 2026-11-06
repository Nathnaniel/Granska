// The page's side of /api/verify: types, the hero's sample result and the stream reader.
export type Status = 'valid' | 'risky' | 'invalid' | 'unknown';
export type CheckId = 'format' | 'disposable' | 'domain' | 'inbox' | 'mailbox';
export type CheckState = 'passed' | 'failed' | 'skipped' | 'unknown';
export type Reason = 'valid' | 'format' | 'disposable' | 'typo' | 'shared' | 'mailbox' | 'unknown' | 'noDomain' | 'dnsError' | 'catchAll' | 'unreachable';
export type Source = 'first' | 'repeat' | 'suggestion';

export interface Row { state: CheckState; key?: Reason }
export type Rows = Partial<Record<CheckId, Row>>;

export interface CheckResult {
  email: string;
  status: Status;
  reason: Reason;
  suggestion?: string | null;
  rows: Rows;
}

export type CheckError = 'errorRate' | 'errorServer';
export type CheckEvent = { type: 'check'; id: CheckId; row: Row } | { type: 'result'; result: CheckResult };

interface ServerCheck { id: CheckId; status: 'passed' | 'failed' | 'unknown'; key?: Reason }

export const CHECK_IDS: CheckId[] = ['format', 'disposable', 'domain', 'inbox', 'mailbox'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REQUEST_TIMEOUT_MS = 20000; // Longer than the server's slowest possible check.

export const looksLikeEmail = (value: string) => EMAIL.test(value.trim()) && value.trim().length <= 254;

// Shown in the hero until the visitor runs a check of their own. Its rows stay idle.
export const SAMPLE: CheckResult = {
  email: 'anna@fjordlabs.se',
  status: 'valid',
  reason: 'valid',
  rows: {},
};

// A check with no key didn't run, because an earlier one settled the answer.
const toRow = ({ status, key }: ServerCheck): Row => (key || status === 'passed' ? { state: status, key } : { state: 'skipped' });

// Yields each check as the server finishes it, then the verdict.
export async function* streamCheck(email: string, source: Source): AsyncGenerator<CheckEvent> {
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify({ email, source }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 429) throw new Error('errorRate');
  if (!response.ok || !response.body) throw new Error('errorServer');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines.filter(Boolean)) {
      const event = JSON.parse(line);
      if (event.type === 'error') throw new Error('errorServer');
      if (event.type === 'check') yield { type: 'check', id: event.check.id, row: toRow(event.check) };
      if (event.type === 'result') {
        const rows = Object.fromEntries((event.checks as ServerCheck[]).map((check) => [check.id, toRow(check)]));
        yield { type: 'result', result: { email: event.email, status: event.status, reason: event.reasonKey, suggestion: event.suggestion, rows } };
      }
    }
  }
}
