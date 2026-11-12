# Granska

Know an email is real before you hit send. A marketing website with a working email checker, built with Next.js and Tailwind. No email is ever sent. See [Email-Verifier-PRD.md](Email-Verifier-PRD.md) for the original spec.

## Run it

Needs Node.js 20 or later.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3001.

```bash
npm test
```

Most home and office networks block outgoing port 25. If yours does, an address that reaches the mailbox check waits about 10 seconds and comes back Unknown. To skip that wait while developing:

```bash
SKIP_MAILBOX=1 npm run dev
```

## How it works

| Path | What it is |
| --- | --- |
| `app/` | Pages for each language, plus `api/verify` and `healthz` |
| `lib/verify-engine.mjs` | The five checks, rate limit, lookup cache and counts |
| `lib/checks.ts` | The page's side of the check: types and the stream reader |
| `lib/auth.ts` | Sign-in and daily check counts through Supabase |
| `supabase/migrations/` | Database tables, access rules and functions |
| `lib/plans.ts` | Plan prices |
| `messages/*.json` | Every string, one file per language. `npm run check-i18n` confirms they match |
| `app/globals.css` | Colour tokens from the Figma file, type and motion |
| `data/disposable-domains.txt` | Throwaway domains, one per line |
| `scripts/update-disposable.js` | Refreshes that list from [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) |
| `scripts/check-port25.js` | Tests whether a server can reach mail servers |
| `test/verify.test.js` | Tests for the checks, including a fake mail server |

`POST /api/verify` takes `{ "email": "..." }` and returns the verdict. With `Accept: application/x-ndjson` it streams one JSON line per finished check, then the verdict, which is how the page shows its steps. `GET /healthz` returns anonymous counts, which reset when the server restarts.

The mailbox check stops at `RCPT TO` and quits, so `DATA` is never sent. Checked addresses are never logged or stored.

**Not real yet:** list upload and pricing checkout are simulated, and the daily limit is counted but not enforced. The result in the home page hero is a fixed example until the visitor runs a check. The API docs, Privacy and Terms pages are placeholders.

## Configuration

Copy `.env.example` to `.env.local`, or set these as environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | None | Full site address for canonical, hreflang and Open Graph links |
| `NEXT_PUBLIC_SUPABASE_URL` | None | Supabase project address |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | None | Supabase publishable key, safe to expose |
| `HELO_HOST` | Machine hostname | Name announced to mail servers |
| `MAIL_FROM` | `verify@<HELO_HOST>` | Envelope sender for the mailbox check |
| `SMTP_TIMEOUT_MS` | `8000` | Time cap per mail server |
| `SKIP_MAILBOX` | `0` | Set to `1` where port 25 is blocked |

## Deploying

### Vercel

Pushing to the connected branch deploys the site, with `NEXT_PUBLIC_SITE_URL` set in the project. Vercel blocks outgoing port 25, so the mailbox check is off there: checks 1 to 4 still run, and any address that passes them comes back Unknown. Vercel also runs several copies of the app, so the rate limit and `/healthz` counts apply per copy.

### A server of your own

Real mailbox results need a host that allows outgoing port 25, with reverse DNS for its IP set to `HELO_HOST`. Test that with `npm run check-port25` on the server, then run `npm run build` and `npm start`. Keep the app behind a reverse proxy that appends `X-Forwarded-For`, because the rate limit reads that header. Run one process, because the limit, cache and counts live in memory. Run `npm run update-disposable` on each deploy.
