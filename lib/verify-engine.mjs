// The email check behind /api/verify. No dependencies. See Email-Verifier-PRD.md.
// Privacy rule for this file: never log or store a checked address.

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { domainToASCII } from 'node:url';

// ---------------------------------------------------------------- Config

const heloHost = process.env.HELO_HOST || os.hostname();

const config = {
  heloHost,
  mailFrom: process.env.MAIL_FROM || `verify@${heloHost}`,
  smtpTimeoutMs: Number(process.env.SMTP_TIMEOUT_MS) || 8000,
  // Vercel blocks outgoing port 25, so the mailbox check would only wait and time out.
  skipMailbox: process.env.SKIP_MAILBOX === '1' || Boolean(process.env.VERCEL),
};

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const MAX_BODY_BYTES = 1024;
const MX_CACHE_TTL_MS = 10 * 60 * 1000;
const MX_CACHE_MAX_ENTRIES = 10000;
const MAX_MAIL_HOSTS = 2;
const MAILBOX_BUDGET_MS = 10000; // Total across mail hosts, on top of the per-server cap.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MESSAGE = 'Too many checks. Wait a minute and try again.';
// Lists go through a separate allowance, counted per address, so one upload
// can't be used to probe mail servers in bulk.
const BATCH_SIZE = 25;
const BATCH_CONCURRENCY = 8;
const LIST_LIMIT = 1000;
const LIST_WINDOW_MS = 60 * 60 * 1000;
const LIST_LIMIT_MESSAGE = 'You’ve reached the list limit for this hour. Try again later.';

const DISPOSABLE_PATH = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'disposable-domains.txt');

// ---------------------------------------------------------------- Check 1: format

const LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

function parseEmail(input) {
  const email = String(input).trim();
  const fail = (reason) => ({ ok: false, email, reason });

  if (email.length > MAX_EMAIL_LENGTH) return fail('This address is longer than the 254 characters allowed.');
  const at = email.lastIndexOf('@');
  if (at === -1) return fail('This address is missing the @ sign.');

  const local = email.slice(0, at);
  const rawDomain = email.slice(at + 1);
  if (!local) return fail('This address has nothing before the @ sign.');
  if (!rawDomain) return fail('This address has nothing after the @ sign.');
  if (local.length > MAX_LOCAL_LENGTH || !LOCAL_PATTERN.test(local)) {
    return fail('The part before the @ sign has characters an address can’t use.');
  }

  // domainToASCII silently drops whitespace and control characters, which would
  // turn "example.com\r\nDATA" into a different domain than the one typed.
  const hasBadCharacters = /[\s\p{Cc}]/u.test(rawDomain);
  const domain = hasBadCharacters ? '' : domainToASCII(rawDomain.toLowerCase());
  if (!domain || !DOMAIN_PATTERN.test(domain)) {
    return fail(rawDomain.includes('.')
      ? 'The part after the @ sign isn’t a valid domain.'
      : 'The domain has no ending, such as .com.');
  }
  return { ok: true, email: `${local}@${domain}`, local, domain };
}

// ---------------------------------------------------------------- Check 2: disposable

function loadDisposableDomains(file = DISPOSABLE_PATH) {
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    return new Set(lines.map((line) => line.trim().toLowerCase()).filter(Boolean));
  } catch (err) {
    console.warn(JSON.stringify({ event: 'disposable_list_missing', code: err.code }));
    return new Set();
  }
}

// Also matches subdomains, so anything.mailinator.com counts as mailinator.com.
function isDisposable(domain, list) {
  const labels = domain.split('.');
  for (let i = 0; i < labels.length - 1; i += 1) {
    if (list.has(labels.slice(i).join('.'))) return true;
  }
  return false;
}

// ---------------------------------------------------------------- Check 3: domain

const resolver = new dns.Resolver({ timeout: 2000, tries: 2 });
const NO_RECORD_CODES = new Set(['ENODATA', 'ENOTFOUND']);

async function queryDns(fn) {
  try {
    return { records: await fn() };
  } catch (err) {
    return NO_RECORD_CODES.has(err.code) ? { records: [], code: err.code } : { failed: true };
  }
}

// Returns { status: 'ok', hosts } | { status: 'none' } | { status: 'error' }.
async function lookupMailHosts(domain, dnsClient = resolver) {
  const mx = await queryDns(() => dnsClient.resolveMx(domain));
  if (mx.failed) return { status: 'error' };
  if (mx.code === 'ENOTFOUND') return { status: 'none' };

  if (mx.records.length > 0) {
    const hosts = [...mx.records]
      .sort((a, b) => a.priority - b.priority)
      .map((record) => record.exchange.replace(/\.$/, ''))
      .filter(Boolean);
    // An empty exchange is a "null MX": the domain declares it takes no mail.
    return hosts.length > 0 ? { status: 'ok', hosts } : { status: 'none' };
  }

  const a = await queryDns(() => dnsClient.resolve4(domain));
  if (a.records?.length > 0) return { status: 'ok', hosts: [domain] };
  const aaaa = await queryDns(() => dnsClient.resolve6(domain));
  if (aaaa.records?.length > 0) return { status: 'ok', hosts: [domain] };
  return a.failed || aaaa.failed ? { status: 'error' } : { status: 'none' };
}

// DNS failures are not cached, so a passing outage doesn't stick for 10 minutes.
function createCachedLookup(lookup = lookupMailHosts, { ttlMs = MX_CACHE_TTL_MS, now = Date.now } = {}) {
  const cache = new Map();
  return async function cachedLookup(domain) {
    const hit = cache.get(domain);
    if (hit && hit.expires > now()) return hit.value;
    cache.delete(domain);

    const value = await lookup(domain);
    if (value.status !== 'error') {
      if (cache.size >= MX_CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(domain, { value, expires: now() + ttlMs });
    }
    return value;
  };
}

// ---------------------------------------------------------------- Check 4: personal inbox

const SHARED_NAMES = new Set([
  'abuse', 'accounting', 'accounts', 'admin', 'administrator', 'billing', 'careers', 'contact',
  'customerservice', 'enquiries', 'feedback', 'finance', 'hello', 'help', 'helpdesk', 'hi', 'hr',
  'info', 'inquiries', 'jobs', 'legal', 'mail', 'marketing', 'media', 'news', 'newsletter',
  'no-reply', 'noreply', 'office', 'orders', 'postmaster', 'press', 'privacy', 'reception',
  'sales', 'security', 'service', 'support', 'team', 'webmaster',
]);

function isSharedInbox(local) {
  return SHARED_NAMES.has(local.toLowerCase().split('+')[0]);
}

// ---------------------------------------------------------------- Check 5: mailbox

// Addresses a domain's mail records must never point this server at. Without this
// guard anyone could aim an MX record at internal hosts and probe them through us.
const blockedIps = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blockedIps.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
]) blockedIps.addSubnet(address, prefix, 'ipv6');

function isPrivateIp(ip) {
  const family = net.isIP(ip);
  if (family === 0) return true;
  return blockedIps.check(ip, family === 6 ? 'ipv6' : 'ipv4');
}

async function resolveHostIps(host, dnsClient = resolver) {
  if (net.isIP(host)) return [host];
  const [v4, v6] = await Promise.all([
    queryDns(() => dnsClient.resolve4(host)),
    queryDns(() => dnsClient.resolve6(host)),
  ]);
  return [...(v4.records || []), ...(v6.records || [])];
}

// Turns a socket into a queue of complete SMTP replies, joining multi-line replies.
function createReplyReader(socket) {
  const replies = [];
  let buffer = '';
  let lines = [];
  let waiter = null;
  let failure = null;

  const settle = () => {
    if (!waiter) return;
    const { resolve, reject } = waiter;
    if (replies.length > 0) {
      waiter = null;
      resolve(replies.shift());
    } else if (failure) {
      waiter = null;
      reject(failure);
    }
  };

  socket.setEncoding('latin1');
  socket.on('data', (chunk) => {
    buffer += chunk;
    if (buffer.length > 65536 || lines.length > 200) {
      socket.destroy(new Error('reply too long'));
      return;
    }
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      lines.push(line);
      if (/^\d{3}( |$)/.test(line)) {
        replies.push({ code: Number(line.slice(0, 3)), text: lines.join('\n') });
        lines = [];
      }
      newline = buffer.indexOf('\n');
    }
    settle();
  });
  socket.on('error', (err) => {
    failure = failure || err;
    settle();
  });
  socket.on('close', () => {
    failure = failure || new Error('connection closed');
    settle();
  });

  return {
    next: () => new Promise((resolve, reject) => {
      waiter = { resolve, reject };
      settle();
    }),
  };
}

// A 5xx is only a verdict on the mailbox if it's about the mailbox. Servers also
// use 5xx to refuse the checker itself (blocklists, policy), which proves nothing.
const MAILBOX_MISSING_CODE = /\b5\.1\.\d+\b|\b5\.2\.1\b/;
const POLICY_BLOCK_CODE = /\b5\.7\.\d+\b/;
const POLICY_BLOCK_TEXT = /block|blacklist|denylist|spamhaus|spamcop|barracuda|reputation|policy|not allowed|access denied|relay/i;

function classifyRecipientReply({ code, text }) {
  if (code >= 200 && code < 300) return 'accepted';
  if (code >= 500 && code < 600) {
    if (MAILBOX_MISSING_CODE.test(text)) return 'rejected';
    if (POLICY_BLOCK_CODE.test(text) || POLICY_BLOCK_TEXT.test(text)) return 'unknown';
    return 'rejected';
  }
  return 'unknown';
}

const isOk = (reply) => reply.code >= 200 && reply.code < 300;

// One SMTP conversation. Stops at RCPT and quits: DATA is never sent, so no email
// can go out. Returns 'accepted' | 'rejected' | 'catch-all' | 'unknown', or
// 'unreachable' if no connection was made, as happens when port 25 is blocked.
async function probeMailServer(ip, address, options) {
  const { port = 25, timeoutMs, heloHost: helo, mailFrom } = options;
  const socket = net.connect({ host: ip, port });
  const reader = createReplyReader(socket);
  let connected = false;
  socket.once('connect', () => { connected = true; });
  const timer = setTimeout(() => socket.destroy(new Error('timeout')), timeoutMs);

  const command = async (line) => {
    socket.write(`${line}\r\n`);
    return reader.next();
  };

  try {
    if (!isOk(await reader.next())) return 'unknown';

    let hello = await command(`EHLO ${helo}`);
    if (!isOk(hello)) hello = await command(`HELO ${helo}`);
    if (!isOk(hello)) return 'unknown';

    if (!isOk(await command(`MAIL FROM:<${mailFrom}>`))) return 'unknown';

    const target = classifyRecipientReply(await command(`RCPT TO:<${address.local}@${address.domain}>`));
    if (target !== 'accepted') return target;

    // A made-up address on the same domain shows whether the server says yes to everything.
    const madeUp = `nobody-${crypto.randomBytes(8).toString('hex')}@${address.domain}`;
    const control = classifyRecipientReply(await command(`RCPT TO:<${madeUp}>`));
    if (control === 'accepted') return 'catch-all';
    return control === 'rejected' ? 'accepted' : 'unknown';
  } catch {
    return connected ? 'unknown' : 'unreachable';
  } finally {
    clearTimeout(timer);
    if (socket.writable) socket.end('QUIT\r\n', () => socket.destroy());
    else socket.destroy();
  }
}

// Tries up to two mail hosts in priority order. Tests pass allowPrivate and port to
// reach a local fake server; neither can be set from the environment or a request.
async function checkMailbox(hosts, address, options = {}) {
  const {
    resolveIps = resolveHostIps,
    allowPrivate = false,
    port,
    timeoutMs = config.smtpTimeoutMs,
    heloHost: helo = config.heloHost,
    mailFrom = config.mailFrom,
    budgetMs = MAILBOX_BUDGET_MS,
  } = options;

  const deadline = Date.now() + budgetMs;
  let attempts = 0;
  let failedToConnect = 0;
  for (const host of hosts.slice(0, MAX_MAIL_HOSTS)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const ips = await resolveIps(host);
    const ip = ips.find((candidate) => allowPrivate || !isPrivateIp(candidate));
    if (!ip) continue;

    const outcome = await probeMailServer(ip, address, {
      port, heloHost: helo, mailFrom, timeoutMs: Math.min(timeoutMs, remaining),
    });
    attempts += 1;
    if (outcome === 'unreachable') failedToConnect += 1;
    else if (outcome !== 'unknown') return outcome;
  }
  return attempts > 0 && failedToConnect === attempts ? 'unreachable' : 'unknown';
}

// ---------------------------------------------------------------- Typo suggestions

const TYPO_TARGETS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'protonmail.com',
  'googlemail.com', 'aol.com', 'proton.me', 'zoho.com', 'gmx.com', 'ymail.com',
  'hotmail.co.uk', 'yahoo.co.uk',
];

// Real domains that sit close to a target and must not be "corrected" to it.
const NEVER_CORRECT = new Set([
  'mail.com', 'email.com', 'live.com', 'msn.com', 'me.com', 'mac.com', 'qq.com', 'pm.me',
  'hey.com', 'duck.com', 'fastmail.com', 'yandex.com', 'mail.ru', 'yahoo.ca', 'yahoo.co.in',
  'yahoo.co.jp', 'hotmail.ca', 'outlook.co', 'gmx.de', 'gmx.net',
]);

// Damerau-Levenshtein (optimal string alignment): a swap like gmial counts as one edit.
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function suggestDomain(domain) {
  if (TYPO_TARGETS.includes(domain) || NEVER_CORRECT.has(domain)) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const target of TYPO_TARGETS) {
    // Two edits away from a short domain like aol.com is usually a different real domain.
    const allowed = target.length >= 9 ? 2 : 1;
    const distance = editDistance(domain, target);
    if (distance <= allowed && distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

function suggestAddress(input) {
  const email = String(input).trim();
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  const domain = suggestDomain(email.slice(at + 1).toLowerCase());
  if (!domain) return null;
  const candidate = `${email.slice(0, at)}@${domain}`;
  return parseEmail(candidate).ok ? candidate : null;
}

// ---------------------------------------------------------------- Verdict

const CHECKS = [
  ['format', 'Format'],
  ['disposable', 'Disposable'],
  ['domain', 'Domain'],
  ['inbox', 'Personal inbox'],
  ['mailbox', 'Mailbox'],
];

const defaultDisposable = loadDisposableDomains();
const defaultLookup = createCachedLookup();

async function verifyEmail(input, deps = {}) {
  const {
    disposable = defaultDisposable,
    lookup = defaultLookup,
    mailbox = checkMailbox,
    skipMailbox = config.skipMailbox,
    onCheck = () => {},
  } = deps;

  const checks = CHECKS.map(([id, label]) => ({
    id, label, status: 'unknown', detail: 'Not run, an earlier check settled the answer.',
  }));
  // key names the message the page shows for this check. A check with no key didn't run.
  const mark = (id, status, detail, key) => {
    const check = Object.assign(checks.find((c) => c.id === id), { status, detail, key });
    onCheck({ ...check });
  };

  const parsed = parseEmail(input);
  const suggestion = suggestAddress(input);
  const finish = (status, reason, reasonKey) => ({ email: parsed.email, status, reason, reasonKey, suggestion, checks });

  // 1. Format
  if (!parsed.ok) {
    mark('format', 'failed', parsed.reason, 'format');
    return finish('invalid', parsed.reason, 'format');
  }
  mark('format', 'passed', 'Written like a real address.');

  // 2. Disposable
  if (isDisposable(parsed.domain, disposable)) {
    mark('disposable', 'failed', `${parsed.domain} is a throwaway email provider.`, 'disposable');
    return finish('risky', 'This address uses a throwaway email provider, so it may stop working soon.', 'disposable');
  }
  mark('disposable', 'passed', 'Not a throwaway email provider.');

  // 3. Domain
  const mail = await lookup(parsed.domain);
  if (mail.status === 'none') {
    const detail = `${parsed.domain} has no way to receive email.`;
    mark('domain', 'failed', detail, 'noDomain');
    return finish('invalid', `This address can’t receive mail because ${detail}`, suggestion ? 'typo' : 'noDomain');
  }
  if (mail.status === 'error') {
    mark('domain', 'unknown', 'The domain lookup didn’t answer in time.', 'dnsError');
    return finish('unknown', 'The domain lookup didn’t answer, so this address couldn’t be confirmed. Try again shortly.', 'dnsError');
  }
  mark('domain', 'passed', `${parsed.domain} can receive email.`);

  // 4. Personal inbox. Flags the address but doesn't stop: a shared name on a
  // mailbox the server rejects should still come back Invalid.
  const shared = isSharedInbox(parsed.local);
  if (shared) mark('inbox', 'failed', 'This looks like a shared team inbox.', 'shared');
  else mark('inbox', 'passed', 'Looks like a person’s own inbox.');
  const sharedReason = 'This is a shared team inbox, so it may not reach one particular person.';

  // 5. Mailbox
  const outcome = skipMailbox ? 'unreachable' : await mailbox(mail.hosts, parsed);

  if (outcome === 'rejected') {
    mark('mailbox', 'failed', 'The mail server says this mailbox doesn’t exist.', 'mailbox');
    return finish('invalid', 'The mail server says this mailbox doesn’t exist.', 'mailbox');
  }
  if (outcome === 'catch-all') {
    mark('mailbox', 'unknown', 'This server accepts every address, so this one can’t be confirmed.', 'catchAll');
    return finish('risky', 'The mail server accepts every address, so mail may arrive but this inbox can’t be confirmed.', 'catchAll');
  }
  if (outcome === 'accepted') {
    mark('mailbox', 'passed', 'The mail server would accept mail for this address.');
    return shared
      ? finish('risky', sharedReason, 'shared')
      : finish('valid', 'The mail server confirmed it would accept mail for this address.', 'valid');
  }
  const unreachable = outcome === 'unreachable';
  const key = unreachable ? 'unreachable' : 'unknown';
  mark('mailbox', 'unknown', unreachable
    ? 'Couldn’t reach the mail server.'
    : 'The mail server didn’t answer or blocked the check.', key);
  return shared
    ? finish('risky', sharedReason, 'shared')
    : finish('unknown', unreachable
      ? 'The domain is real, but its mail server couldn’t be reached.'
      : 'The domain is real, but its mail server didn’t answer or blocked the check.', key);
}

// ---------------------------------------------------------------- Rate limit

function createRateLimiter({ limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS, now = Date.now } = {}) {
  const hits = new Map();
  let nextSweep = now() + windowMs;

  return function hit(key, count = 1) {
    const time = now();
    if (time >= nextSweep) {
      for (const [ip, entry] of hits) if (entry.resetAt <= time) hits.delete(ip);
      nextSweep = time + windowMs;
    }
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs };
      hits.set(key, entry);
    }
    entry.count += count;
    return {
      allowed: entry.count <= limit,
      retryAfterSeconds: Math.ceil((entry.resetAt - time) / 1000),
    };
  };
}

// The rightmost X-Forwarded-For entry is the one the host's proxy added. Earlier
// entries come from the visitor, who could use them to dodge the limit. Next.js fills
// this header itself, so outside Vercel the site must sit behind a proxy that appends it.
function clientIp(headers) {
  return headers.get('x-forwarded-for')?.split(',').pop().trim() || 'unknown';
}

// ---------------------------------------------------------------- Anonymous metrics

// Counts only: this is what the PRD's success metrics are read from.
function createMetrics() {
  const recent = [];
  const counts = {
    checks: 0,
    valid: 0,
    risky: 0,
    invalid: 0,
    unknown: 0,
    suggestionsShown: 0,
    suggestionsAccepted: 0,
    firstChecks: 0,
    repeatVisitors: 0,
    rateLimited: 0,
    serverErrors: 0,
  };
  return {
    counts,
    record(result, source, durationMs) {
      counts.checks += 1;
      counts[result.status] += 1;
      if (result.suggestion) counts.suggestionsShown += 1;
      if (source === 'suggestion') counts.suggestionsAccepted += 1;
      if (source === 'first') counts.firstChecks += 1;
      if (source === 'repeat') counts.repeatVisitors += 1;
      recent.push(durationMs);
      if (recent.length > 1000) recent.shift();
    },
    snapshot() {
      const sorted = [...recent].sort((a, b) => a - b);
      const medianMs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
      return { ...counts, medianMs };
    },
  };
}

// ---------------------------------------------------------------- HTTP

const SOURCES = new Set(['first', 'repeat', 'suggestion', 'list']);
const STREAM_TYPE = 'application/x-ndjson';
const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Try again.';
const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

const sendJson = (status, body, headers = {}) => Response.json(body, { status, headers: { ...NO_STORE, ...headers } });

async function readBody(request, maxBytes = MAX_BODY_BYTES) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return Buffer.concat(chunks).toString('utf8');
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error('body too large'), { statusCode: 413 });
    }
    chunks.push(value);
  }
}

// Runs tasks with at most `limit` at a time, keeping results in order.
async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function createHandlers(deps = {}) {
  const {
    verify = verifyEmail,
    limiter = createRateLimiter(),
    listLimiter = createRateLimiter({ limit: LIST_LIMIT, windowMs: LIST_WINDOW_MS }),
    metrics = createMetrics(),
  } = deps;

  async function post(request) {
    const limit = limiter(clientIp(request.headers));
    if (!limit.allowed) {
      metrics.counts.rateLimited += 1;
      return sendJson(429, { error: RATE_LIMIT_MESSAGE }, { 'Retry-After': String(limit.retryAfterSeconds) });
    }

    let body;
    try {
      body = JSON.parse(await readBody(request));
    } catch (err) {
      return err.statusCode === 413
        ? sendJson(413, { error: 'That address is too long to check.' })
        : sendJson(400, { error: 'Enter an email address to check.' });
    }

    const email = body?.email;
    if (typeof email !== 'string' || !email.trim()) return sendJson(400, { error: 'Enter an email address to check.' });

    const started = Date.now();
    const source = SOURCES.has(body.source) ? body.source : null;
    const finish = (result) => {
      const durationMs = Date.now() - started;
      metrics.record(result, source, durationMs);
      console.log(JSON.stringify({ event: 'check', status: result.status, durationMs, source }));
      return { ...result, durationMs };
    };
    const fail = (err) => {
      metrics.counts.serverErrors += 1;
      console.error(JSON.stringify({ event: 'server_error', message: err.message }));
    };

    if (!String(request.headers.get('accept')).includes(STREAM_TYPE)) {
      try {
        return sendJson(200, finish(await verify(email)));
      } catch (err) {
        fail(err);
        return sendJson(500, { error: SERVER_ERROR_MESSAGE });
      }
    }

    // One JSON object per line: each check as it finishes, then the verdict.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          const result = await verify(email, { onCheck: (check) => send({ type: 'check', check }) });
          send({ type: 'result', ...finish(result) });
        } catch (err) {
          fail(err);
          send({ type: 'error', error: SERVER_ERROR_MESSAGE });
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...NO_STORE, 'Content-Type': `${STREAM_TYPE}; charset=utf-8` } });
  }

  // Checks up to BATCH_SIZE addresses from an uploaded list and returns each verdict.
  async function batch(request) {
    let body;
    try {
      body = JSON.parse(await readBody(request, BATCH_SIZE * (MAX_EMAIL_LENGTH + 8) + 64));
    } catch (err) {
      return err.statusCode === 413
        ? sendJson(413, { error: 'Send at most 25 addresses at a time.' })
        : sendJson(400, { error: 'Send a list of addresses.' });
    }

    const emails = body?.emails;
    if (!Array.isArray(emails) || emails.length === 0 || emails.length > BATCH_SIZE || !emails.every((e) => typeof e === 'string')) {
      return sendJson(400, { error: 'Send between 1 and 25 addresses.' });
    }

    const limit = listLimiter(clientIp(request.headers), emails.length);
    if (!limit.allowed) {
      metrics.counts.rateLimited += 1;
      return sendJson(429, { error: LIST_LIMIT_MESSAGE }, { 'Retry-After': String(limit.retryAfterSeconds) });
    }

    const results = await mapLimit(emails, BATCH_CONCURRENCY, async (email) => {
      const started = Date.now();
      try {
        const result = await verify(email);
        metrics.record(result, 'list', Date.now() - started);
        return { email: result.email, status: result.status, reasonKey: result.reasonKey, suggestion: result.suggestion };
      } catch (err) {
        metrics.counts.serverErrors += 1;
        console.error(JSON.stringify({ event: 'server_error', message: err.message }));
        return { email: email.trim(), status: 'unknown', reasonKey: 'unknown', suggestion: null };
      }
    });
    console.log(JSON.stringify({ event: 'list_batch', size: emails.length }));
    return sendJson(200, { results });
  }

  const health = () => sendJson(200, { status: 'ok', ...metrics.snapshot() });

  return { post, batch, health };
}

// Next.js bundles each route on its own, so the counts and limit live on globalThis
// to stay shared between /api/verify and /healthz.
// A dev server keeps globalThis across reloads, so a copy missing a newer handler is replaced.
function getHandlers() {
  if (!globalThis.granskaHandlers?.batch) globalThis.granskaHandlers = createHandlers();
  return globalThis.granskaHandlers;
}

export {
  checkMailbox,
  classifyRecipientReply,
  clientIp,
  createCachedLookup,
  createHandlers,
  createMetrics,
  createRateLimiter,
  editDistance,
  getHandlers,
  isDisposable,
  isPrivateIp,
  isSharedInbox,
  lookupMailHosts,
  parseEmail,
  suggestAddress,
  suggestDomain,
  verifyEmail,
};
