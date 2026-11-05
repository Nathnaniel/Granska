'use strict';
const assert = require('node:assert/strict');
const net = require('node:net');
const { after, before, describe, test } = require('node:test');

const {
  checkMailbox,
  classifyRecipientReply,
  clientIp,
  createApp,
  createCachedLookup,
  createRateLimiter,
  editDistance,
  isDisposable,
  isPrivateIp,
  isSharedInbox,
  lookupMailHosts,
  parseEmail,
  suggestAddress,
  suggestDomain,
  verifyEmail,
} = require('../server.js');
const { readGreeting } = require('../scripts/check-port25.js');

const dnsError = (code) => Object.assign(new Error(code), { code });

describe('format', () => {
  test('accepts ordinary addresses', () => {
    for (const email of ['a@example.com', 'first.last+tag@sub.example.co.uk', "o'neil@example.org"]) {
      assert.equal(parseEmail(email).ok, true, email);
    }
  });

  test('trims and lowercases the domain only', () => {
    assert.equal(parseEmail('  Jo@EXAMPLE.com ').email, 'Jo@example.com');
  });

  test('converts international domains', () => {
    assert.equal(parseEmail('a@münchen.de').domain, 'xn--mnchen-3ya.de');
  });

  test('rejects malformed addresses', () => {
    const bad = [
      'plain', '@example.com', 'a@', 'a@example', 'a b@example.com', 'a..b@example.com',
      '.a@example.com', 'a.@example.com', 'a@-example.com', 'a@example..com', 'a@example.c',
      'a@1.2.3.4', 'a@[127.0.0.1]', `${'x'.repeat(65)}@example.com`,
      `a@${'x'.repeat(250)}.com`,
    ];
    for (const email of bad) assert.equal(parseEmail(email).ok, false, email);
  });

  test('rejects anything that could inject an SMTP command', () => {
    for (const email of ['a\r\nDATA@example.com', 'a@example.com\r\nDATA', 'a@exam\nple.com', 'a>@example.com', 'a<b@example.com']) {
      assert.equal(parseEmail(email).ok, false, JSON.stringify(email));
    }
  });
});

describe('disposable', () => {
  const list = new Set(['mailinator.com']);

  test('matches the domain and its subdomains', () => {
    assert.equal(isDisposable('mailinator.com', list), true);
    assert.equal(isDisposable('foo.mailinator.com', list), true);
  });

  test('ignores other domains', () => {
    assert.equal(isDisposable('notmailinator.com', list), false);
  });
});

describe('shared inbox', () => {
  test('matches shared names, any case, with or without a tag', () => {
    for (const local of ['info', 'SALES', 'support+web']) assert.equal(isSharedInbox(local), true, local);
  });

  test('leaves personal names alone', () => {
    for (const local of ['maria', 'info.maria', 'salesforce']) assert.equal(isSharedInbox(local), false, local);
  });
});

describe('typo suggestions', () => {
  test('counts a swap as one edit', () => {
    assert.equal(editDistance('gmial.com', 'gmail.com'), 1);
  });

  test('corrects one and two letter mistakes', () => {
    assert.equal(suggestDomain('gmial.com'), 'gmail.com');
    assert.equal(suggestDomain('gmal.con'), 'gmail.com');
    assert.equal(suggestDomain('hotmial.com'), 'hotmail.com');
    assert.equal(suggestDomain('yaho.com'), 'yahoo.com');
    assert.equal(suggestDomain('outlok.com'), 'outlook.com');
  });

  test('leaves correct and unrelated domains alone', () => {
    for (const domain of ['gmail.com', 'mail.com', 'live.com', 'acme.com', 'yahoo.ca']) {
      assert.equal(suggestDomain(domain), null, domain);
    }
  });

  test('allows only one edit from a short domain', () => {
    assert.equal(suggestDomain('aol.co'), 'aol.com');
    assert.equal(suggestDomain('axl.co'), null);
  });

  test('keeps the first part of the address', () => {
    assert.equal(suggestAddress('Jo.Smith@gmial.com'), 'Jo.Smith@gmail.com');
  });

  test('offers a fix for a domain with no ending', () => {
    assert.equal(suggestAddress('jo@gmailcom'), 'jo@gmail.com');
  });

  test('offers nothing when the first part is also broken', () => {
    assert.equal(suggestAddress('a b@gmial.com'), null);
  });
});

describe('domain lookup', () => {
  const client = (overrides) => ({
    resolveMx: async () => { throw dnsError('ENODATA'); },
    resolve4: async () => { throw dnsError('ENODATA'); },
    resolve6: async () => { throw dnsError('ENODATA'); },
    ...overrides,
  });

  test('returns mail hosts by priority', async () => {
    const result = await lookupMailHosts('x.com', client({
      resolveMx: async () => [{ priority: 20, exchange: 'b.x.com' }, { priority: 10, exchange: 'a.x.com' }],
    }));
    assert.deepEqual(result, { status: 'ok', hosts: ['a.x.com', 'b.x.com'] });
  });

  test('falls back to the address record', async () => {
    const result = await lookupMailHosts('x.com', client({ resolve4: async () => ['93.184.216.34'] }));
    assert.deepEqual(result, { status: 'ok', hosts: ['x.com'] });
  });

  test('treats a domain with no records as unable to receive mail', async () => {
    assert.deepEqual(await lookupMailHosts('x.com', client()), { status: 'none' });
  });

  test('treats a nonexistent domain as unable to receive mail', async () => {
    const result = await lookupMailHosts('x.com', client({ resolveMx: async () => { throw dnsError('ENOTFOUND'); } }));
    assert.deepEqual(result, { status: 'none' });
  });

  test('honours a null MX record', async () => {
    const result = await lookupMailHosts('x.com', client({ resolveMx: async () => [{ priority: 0, exchange: '' }] }));
    assert.deepEqual(result, { status: 'none' });
  });

  test('reports a DNS failure as an error, not as no mail', async () => {
    const result = await lookupMailHosts('x.com', client({ resolveMx: async () => { throw dnsError('ETIMEOUT'); } }));
    assert.deepEqual(result, { status: 'error' });
  });
});

describe('lookup cache', () => {
  test('reuses a result for 10 minutes, then looks up again', async () => {
    let time = 0;
    let calls = 0;
    const cached = createCachedLookup(async () => { calls += 1; return { status: 'ok', hosts: ['m'] }; }, { now: () => time });

    await cached('x.com');
    time = 10 * 60 * 1000 - 1;
    await cached('x.com');
    assert.equal(calls, 1);

    time = 10 * 60 * 1000;
    await cached('x.com');
    assert.equal(calls, 2);
  });

  test('does not cache DNS failures', async () => {
    let calls = 0;
    const cached = createCachedLookup(async () => { calls += 1; return { status: 'error' }; });
    await cached('x.com');
    await cached('x.com');
    assert.equal(calls, 2);
  });
});

describe('private address guard', () => {
  test('blocks internal addresses', () => {
    for (const ip of ['10.1.2.3', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:10.0.0.1', 'nonsense']) {
      assert.equal(isPrivateIp(ip), true, ip);
    }
  });

  test('allows public addresses', () => {
    for (const ip of ['8.8.8.8', '172.32.0.1', '2606:4700::1111']) assert.equal(isPrivateIp(ip), false, ip);
  });

  test('never connects to a mail host on a private address', async () => {
    const smtp = await fakeSmtp({ rcpt: () => '250 ok' });
    const outcome = await checkMailbox(['internal.example'], { local: 'a', domain: 'x.com' }, {
      resolveIps: async () => ['127.0.0.1'], port: smtp.port, timeoutMs: 500,
    });
    assert.equal(outcome, 'unknown');
    assert.deepEqual(smtp.commands, []);
    await smtp.close();
  });
});

describe('recipient replies', () => {
  const classify = (code, text) => classifyRecipientReply({ code, text: `${code} ${text}` });

  test('reads a missing mailbox as rejected', () => {
    assert.equal(classify(550, '5.1.1 User unknown'), 'rejected');
    assert.equal(classify(550, 'No such user'), 'rejected');
  });

  test('reads a refusal of the checker as unknown, not as a missing mailbox', () => {
    assert.equal(classify(550, '5.7.1 Client host rejected'), 'unknown');
    assert.equal(classify(554, 'Blocked using zen.spamhaus.org'), 'unknown');
  });

  test('lets the mailbox code win over block-like words', () => {
    assert.equal(classify(550, '5.1.1 Recipient not found, see policy page'), 'rejected');
  });

  test('reads temporary failures as unknown', () => {
    assert.equal(classify(451, 'Greylisted, try later'), 'unknown');
  });
});

// A scriptable mail server that records every command it receives.
function fakeSmtp({ rcpt, greeting = '220 fake ready', silent = false }) {
  const commands = [];
  const sockets = new Set();
  let rcptCount = 0;

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    if (silent) return;
    socket.write(`${greeting}\r\n`);

    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk;
      let newline = buffer.indexOf('\r\n');
      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        commands.push(line);
        const verb = line.split(/[ :]/)[0].toUpperCase();
        if (verb === 'EHLO') socket.write('250-fake\r\n250 SIZE 1000\r\n');
        else if (verb === 'MAIL') socket.write('250 ok\r\n');
        else if (verb === 'RCPT') {
          rcptCount += 1;
          socket.write(`${rcpt(rcptCount)}\r\n`);
        } else if (verb === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('250 ok\r\n');
        newline = buffer.indexOf('\r\n');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        commands,
        port: server.address().port,
        close: () => new Promise((done) => {
          for (const socket of sockets) socket.destroy();
          server.close(done);
        }),
      });
    });
  });
}

describe('mailbox check over SMTP', () => {
  const address = { local: 'jo', domain: 'example.com' };

  async function run(script, options = {}) {
    const smtp = await fakeSmtp(script);
    const outcome = await checkMailbox(['mx.example.com'], address, {
      resolveIps: async () => ['127.0.0.1'],
      allowPrivate: true,
      port: smtp.port,
      timeoutMs: 1000,
      heloHost: 'verifier.test',
      mailFrom: 'verify@verifier.test',
      ...options,
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await smtp.close();
    return { outcome, commands: smtp.commands };
  }

  const reject = '550 5.1.1 No such user';

  test('confirms a real mailbox', async () => {
    const { outcome } = await run({ rcpt: (n) => (n === 1 ? '250 ok' : reject) });
    assert.equal(outcome, 'accepted');
  });

  test('reports a missing mailbox', async () => {
    const { outcome } = await run({ rcpt: () => reject });
    assert.equal(outcome, 'rejected');
  });

  test('detects a server that accepts every address', async () => {
    const { outcome } = await run({ rcpt: () => '250 ok' });
    assert.equal(outcome, 'catch-all');
  });

  test('reads greylisting as unknown', async () => {
    const { outcome } = await run({ rcpt: () => '451 4.7.1 Greylisted' });
    assert.equal(outcome, 'unknown');
  });

  test('reads a temporary reply to the made-up address as unknown', async () => {
    const { outcome } = await run({ rcpt: (n) => (n === 1 ? '250 ok' : '451 try later') });
    assert.equal(outcome, 'unknown');
  });

  test('reads a refused greeting as unknown', async () => {
    const { outcome } = await run({ rcpt: () => '250 ok', greeting: '554 go away' });
    assert.equal(outcome, 'unknown');
  });

  test('gives up on a silent server at the time cap', async () => {
    const started = Date.now();
    const { outcome } = await run({ silent: true, rcpt: () => '250 ok' }, { timeoutMs: 150 });
    assert.equal(outcome, 'unknown');
    assert.ok(Date.now() - started < 1000);
  });

  test('reports a failed connection as unreachable', async () => {
    const outcome = await checkMailbox(['mx.example.com'], address, {
      resolveIps: async () => ['127.0.0.1'], allowPrivate: true, port: 1, timeoutMs: 500,
    });
    assert.equal(outcome, 'unreachable');
  });

  test('never sends DATA, and always quits', async () => {
    for (const rcpt of [() => '250 ok', () => reject, (n) => (n === 1 ? '250 ok' : reject)]) {
      const { commands } = await run({ rcpt });
      assert.ok(!commands.some((line) => /^(DATA|BDAT)/i.test(line)), commands.join(' | '));
      assert.equal(commands.at(-1), 'QUIT');
    }
  });

  test('announces the configured name and sender, then the address', async () => {
    const { commands } = await run({ rcpt: () => reject });
    assert.deepEqual(commands, [
      'EHLO verifier.test',
      'MAIL FROM:<verify@verifier.test>',
      'RCPT TO:<jo@example.com>',
      'QUIT',
    ]);
  });

  test('moves to the next mail host when the first gives no answer', async () => {
    // The reply counter spans connections, so host one gets 451 and host two gets 550.
    const smtp = await fakeSmtp({ rcpt: (n) => (n === 1 ? '451 try later' : reject) });
    const outcome = await checkMailbox(['a.test', 'b.test'], address, {
      resolveIps: async () => ['127.0.0.1'], allowPrivate: true, port: smtp.port, timeoutMs: 500,
    });
    assert.equal(outcome, 'rejected');
    await smtp.close();
  });

  test('tries at most two mail hosts', async () => {
    const tried = [];
    await checkMailbox(['a.test', 'b.test', 'c.test'], address, {
      resolveIps: async (host) => { tried.push(host); return []; },
    });
    assert.deepEqual(tried, ['a.test', 'b.test']);
  });
});

describe('port 25 check script', () => {
  test('reads a greeting, then quits without sending anything else', async () => {
    const smtp = await fakeSmtp({ rcpt: () => '250 ok' });
    assert.equal(await readGreeting('127.0.0.1', smtp.port), '220 fake ready');
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.deepEqual(smtp.commands, ['QUIT']);
    await smtp.close();
  });

  test('fails when the port can’t be reached', async () => {
    await assert.rejects(readGreeting('127.0.0.1', 1, 500));
  });

  test('fails on a silent server at the time cap', async () => {
    const smtp = await fakeSmtp({ silent: true, rcpt: () => '250 ok' });
    await assert.rejects(readGreeting('127.0.0.1', smtp.port, 100), /timed out/);
    await smtp.close();
  });
});

describe('verdicts', () => {
  const disposable = new Set(['mailinator.com']);
  const ok = async () => ({ status: 'ok', hosts: ['mx.test'] });
  const verify = (email, outcome, lookup = ok) => verifyEmail(email, {
    disposable, lookup, mailbox: async () => outcome, skipMailbox: false,
  });
  const statuses = (result) => Object.fromEntries(result.checks.map((c) => [c.id, c.status]));

  test('Valid when every check passes', async () => {
    const result = await verify('jo@example.com', 'accepted');
    assert.equal(result.status, 'valid');
    assert.ok(result.checks.every((c) => c.status === 'passed'));
  });

  test('Invalid for a bad format, without touching DNS', async () => {
    const result = await verify('nope', 'accepted', async () => assert.fail('looked up DNS'));
    assert.equal(result.status, 'invalid');
    assert.equal(statuses(result).format, 'failed');
  });

  test('Risky for a disposable domain, and stops there', async () => {
    const result = await verify('x@mailinator.com', 'accepted', async () => assert.fail('looked up DNS'));
    assert.equal(result.status, 'risky');
    assert.equal(statuses(result).disposable, 'failed');
    assert.equal(statuses(result).mailbox, 'unknown');
  });

  test('Invalid when the domain can’t receive mail', async () => {
    const result = await verify('jo@example.com', 'accepted', async () => ({ status: 'none' }));
    assert.equal(result.status, 'invalid');
    assert.equal(statuses(result).domain, 'failed');
  });

  test('Unknown when DNS fails', async () => {
    const result = await verify('jo@example.com', 'accepted', async () => ({ status: 'error' }));
    assert.equal(result.status, 'unknown');
  });

  test('Invalid when the mailbox is rejected', async () => {
    assert.equal((await verify('jo@example.com', 'rejected')).status, 'invalid');
  });

  test('Risky for a catch-all server', async () => {
    const result = await verify('jo@example.com', 'catch-all');
    assert.equal(result.status, 'risky');
    assert.equal(statuses(result).mailbox, 'unknown');
  });

  test('Unknown when the mail server doesn’t answer', async () => {
    assert.equal((await verify('jo@example.com', 'unknown')).status, 'unknown');
  });

  test('names our own connection, not the mail server, when it can’t be reached', async () => {
    const result = await verify('jo@example.com', 'unreachable');
    assert.equal(result.status, 'unknown');
    assert.match(result.reason, /couldn’t be reached/);
    assert.equal((await verify('info@example.com', 'unreachable')).status, 'risky');
  });

  test('a shared inbox is Risky when accepted or unanswered', async () => {
    assert.equal((await verify('info@example.com', 'accepted')).status, 'risky');
    assert.equal((await verify('info@example.com', 'unknown')).status, 'risky');
  });

  test('a shared inbox the server rejects is Invalid', async () => {
    assert.equal((await verify('info@example.com', 'rejected')).status, 'invalid');
  });

  test('skips the mailbox step when port 25 is unavailable', async () => {
    const result = await verifyEmail('jo@example.com', {
      disposable, lookup: ok, mailbox: async () => assert.fail('connected'), skipMailbox: true,
    });
    assert.equal(result.status, 'unknown');
    assert.deepEqual(result.checks.slice(0, 4).map((c) => c.status), ['passed', 'passed', 'passed', 'passed']);
  });

  test('includes a suggestion alongside the verdict', async () => {
    const result = await verify('jo@gmial.com', 'rejected');
    assert.equal(result.suggestion, 'jo@gmail.com');
  });
});

describe('rate limit', () => {
  test('allows 20 per minute, blocks the 21st, then resets', () => {
    let time = 0;
    const hit = createRateLimiter({ now: () => time });
    for (let i = 0; i < 20; i += 1) assert.equal(hit('1.1.1.1').allowed, true);
    assert.equal(hit('1.1.1.1').allowed, false);
    assert.equal(hit('2.2.2.2').allowed, true);
    time = 60000;
    assert.equal(hit('1.1.1.1').allowed, true);
  });

  test('ignores X-Forwarded-For unless told to trust it', () => {
    const req = { headers: { 'x-forwarded-for': '6.6.6.6' }, socket: { remoteAddress: '9.9.9.9' } };
    assert.equal(clientIp(req, false), '9.9.9.9');
  });

  test('takes the entry our own proxy added, not one the visitor sent', () => {
    const req = { headers: { 'x-forwarded-for': '6.6.6.6, 7.7.7.7' }, socket: { remoteAddress: '9.9.9.9' } };
    assert.equal(clientIp(req, true), '7.7.7.7');
  });
});

describe('HTTP', () => {
  let server;
  let base;
  const logged = [];
  const originalLog = console.log;

  before(async () => {
    console.log = (line) => logged.push(String(line));
    server = createApp({
      verify: (email) => verifyEmail(email, {
        disposable: new Set(),
        lookup: async () => ({ status: 'ok', hosts: ['mx.test'] }),
        mailbox: async () => 'accepted',
        skipMailbox: false,
      }),
      limiter: createRateLimiter({ limit: 6 }),
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    console.log = originalLog;
    await new Promise((resolve) => server.close(resolve));
  });

  const post = (body) => fetch(`${base}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

  test('serves the page with a nonce-based content policy', async () => {
    const res = await fetch(base);
    const html = await res.text();
    const policy = res.headers.get('content-security-policy');
    const nonce = policy.match(/script-src 'nonce-([^']+)'/)[1];
    assert.equal(res.status, 200);
    assert.ok(html.includes(`<script nonce="${nonce}">`));
    assert.ok(!html.includes('__NONCE__'));
    assert.equal(res.headers.get('set-cookie'), null);
  });

  test('returns a verdict and logs no address', async () => {
    const res = await post({ email: 'secret.person@example.com', source: 'first' });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, 'valid');
    assert.equal(data.checks.length, 5);
    assert.ok(logged.length > 0);
    assert.ok(!logged.join('\n').includes('secret.person'));
    assert.ok(!logged.join('\n').includes('example.com'));
  });

  test('counts checks anonymously', async () => {
    const health = await (await fetch(`${base}/healthz`)).json();
    assert.equal(health.status, 'ok');
    assert.equal(health.checks, 1);
    assert.equal(health.firstChecks, 1);
    assert.ok(!JSON.stringify(health).includes('example.com'));
  });

  test('rejects an empty address, bad JSON and an oversized body', async () => {
    assert.equal((await post({ email: '  ' })).status, 400);
    assert.equal((await post('not json')).status, 400);
    assert.equal((await post({ email: 'x'.repeat(2000) })).status, 413);
  });

  test('serves design assets with the right type', async () => {
    const res = await fetch(`${base}/assets/mail.svg`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/svg+xml');
  });

  test('serves nothing else from the assets path', async () => {
    assert.equal((await fetch(`${base}/assets/missing.svg`)).status, 404);
    assert.equal((await fetch(`${base}/assets/%2e%2e%2fserver.js`)).status, 404);
    assert.equal((await fetch(`${base}/assets/..%2f..%2fserver.js`)).status, 404);
  });

  test('refuses other methods and paths', async () => {
    assert.equal((await fetch(`${base}/api/verify`)).status, 405);
    assert.equal((await fetch(`${base}/server.js`)).status, 404);
    assert.equal((await fetch(`${base}/data/disposable-domains.txt`)).status, 404);
  });

  test('shows the PRD message past the limit', async () => {
    let res;
    for (let i = 0; i < 7; i += 1) res = await post({ email: 'a@example.com' });
    const data = await res.json();
    assert.equal(res.status, 429);
    assert.equal(data.error, 'Too many checks. Wait a minute and try again.');
    assert.ok(Number(res.headers.get('retry-after')) > 0);
  });
});
