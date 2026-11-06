// Simulated results for the marketing page. Swap runDemoCheck for a call to the
// real /api/verify (it returns the same shape of verdict) to make it live.
export type Status = 'valid' | 'risky' | 'invalid' | 'unknown';
export type CheckId = 'format' | 'disposable' | 'domain' | 'inbox' | 'mailbox';
export type CheckState = 'passed' | 'failed' | 'skipped';
export type Reason = 'valid' | 'format' | 'disposable' | 'typo' | 'shared' | 'mailbox' | 'unknown';

export interface CheckResult {
  email: string;
  status: Status;
  reason: Reason;
  suggestion?: string;
  reply?: string;
  checks: Record<CheckId, CheckState>;
}

export const CHECK_IDS: CheckId[] = ['format', 'disposable', 'domain', 'inbox', 'mailbox'];

const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com', 'yopmail.com']);
const PROVIDERS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me'];
const SHARED = new Set(['info', 'admin', 'support', 'sales', 'hello', 'contact', 'billing', 'team']);
const NO_MAILBOX = /^(nobody|fake|noone|doesnotexist)/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const looksLikeEmail = (value: string) => EMAIL.test(value.trim()) && value.trim().length <= 254;

// Damerau-Levenshtein, so gmial.com counts as a single swap.
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const states = (...values: CheckState[]) =>
  Object.fromEntries(CHECK_IDS.map((id, i) => [id, values[i] ?? 'skipped'])) as Record<CheckId, CheckState>;

export function runDemoCheck(input: string): CheckResult {
  const email = input.trim().toLowerCase();
  if (!looksLikeEmail(email)) return { email, status: 'invalid', reason: 'format', checks: states('failed') };

  const [local, domain] = email.split('@');
  if (DISPOSABLE.has(domain)) return { email, status: 'risky', reason: 'disposable', checks: states('passed', 'failed') };

  const near = PROVIDERS.find((p) => p !== domain && distance(p, domain) <= 2);
  if (near && !PROVIDERS.includes(domain)) {
    return { email, status: 'invalid', reason: 'typo', suggestion: `${local}@${near}`, checks: states('passed', 'passed', 'failed') };
  }
  if (domain === 'example.com') {
    return { email, status: 'unknown', reason: 'unknown', reply: '421 4.7.0 Try again later', checks: states('passed', 'passed', 'passed', 'passed') };
  }
  if (NO_MAILBOX.test(local)) {
    return { email, status: 'invalid', reason: 'mailbox', reply: '550 5.1.1 User unknown', checks: states('passed', 'passed', 'passed', 'passed', 'failed') };
  }
  if (SHARED.has(local)) {
    return { email, status: 'risky', reason: 'shared', reply: '250 2.1.5 OK', checks: states('passed', 'passed', 'passed', 'failed', 'passed') };
  }
  return { email, status: 'valid', reason: 'valid', reply: '250 2.1.5 OK', checks: states('passed', 'passed', 'passed', 'passed', 'passed') };
}
