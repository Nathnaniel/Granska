# Granska

One page where anyone can check whether an email address is real. No login, and no email is ever sent. See [Email-Verifier-PRD.md](Email-Verifier-PRD.md) for the full spec.

## Run it

Needs Node.js 20 or later. There is nothing to install.

```bash
npm run dev
```

Then open http://localhost:3000.

```bash
npm test
```

Most home and office networks block outgoing port 25. If yours does, every address that reaches the mailbox check waits about 10 seconds and then comes back Unknown. To skip that wait while developing:

```bash
SKIP_MAILBOX=1 npm run dev
```

## How it works

| Path | What it is |
| --- | --- |
| `server.js` | The whole server: the five checks, rate limit, cache and metrics |
| `api/index.js`, `vercel.json` | Entry point and routing for Vercel |
| `web/` | Marketing site and sign-in flow, a separate Next.js app. See [web/README.md](web/README.md) |
| `public/index.html` | The whole page, with inline CSS and JS |
| `public/assets/` | Icons, artwork and fonts from the Figma design |
| `data/disposable-domains.txt` | Throwaway domains, one per line |
| `scripts/update-disposable.js` | Refreshes that list from [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) |
| `scripts/check-port25.js` | Tests whether a server can reach mail servers |
| `deploy/` | Service, Caddy and settings files for a VPS |
| `test/server.test.js` | Tests, including a fake mail server |

`POST /api/verify` takes `{ "email": "..." }` and returns the verdict. With `Accept: application/x-ndjson` it streams one JSON line per finished check, then the verdict, which is how the page shows its steps. `GET /healthz` returns anonymous counts, which is where the PRD's success metrics are read from. They reset when the server restarts.

The mailbox check stops at `RCPT TO` and quits, so `DATA` is never sent.

## Configuration

Set these as environment variables, or copy `.env.example` to `.env` and run `node --env-file=.env server.js`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `HOST` | All interfaces | Address to listen on. Use `127.0.0.1` behind a proxy |
| `HELO_HOST` | Machine hostname | Name announced to mail servers |
| `MAIL_FROM` | `verify@<HELO_HOST>` | Envelope sender for the mailbox check |
| `TRUST_PROXY` | `0` | Set to `1` only behind your own reverse proxy |
| `SMTP_TIMEOUT_MS` | `8000` | Time cap per mail server |
| `SKIP_MAILBOX` | `0` | Set to `1` where port 25 is blocked |

## Deploying

The app needs a server that can open outgoing connections on port 25. Hosts change these rules, so test before you rely on one.

1. **Rent a small VPS** running Ubuntu or Debian, and point your domain's A record at it.
2. **Install Node.js 20 or later and Caddy** on the server. Caddy provides HTTPS.
3. **Copy the project over**, then test port 25 on the server:
   ```bash
   rsync -av --exclude .git --exclude .claude ./ root@YOUR_SERVER:/opt/granska/
   ```
   ```bash
   cd /opt/granska && npm run check-port25
   ```
   If it fails, ask the host to open port 25, or use another host. Describe the use honestly: the server talks to mail servers to check addresses and sends no mail.
4. **Set reverse DNS** for the server's IP to your domain in the host's control panel. Then rerun the check with the name set:
   ```bash
   cd /opt/granska && HELO_HOST=granska.example.com npm run check-port25
   ```
5. **Set up the service**, replacing `granska.example.com` in both copied files:
   ```bash
   useradd --system --no-create-home granska
   cp /opt/granska/deploy/granska.env.example /etc/granska.env
   cp /opt/granska/deploy/granska.service /etc/systemd/system/
   cp /opt/granska/deploy/Caddyfile /etc/caddy/Caddyfile
   ```
   ```bash
   systemctl daemon-reload && systemctl enable --now granska && systemctl reload caddy
   ```
6. **Refresh the throwaway list** on each deploy, then restart the service:
   ```bash
   cd /opt/granska && npm run update-disposable && systemctl restart granska
   ```
7. **Open the page and check an address you own.** Reading `/healthz` shows the running counts.

The app must listen only on 127.0.0.1 behind Caddy, which the example settings do. If it were reachable directly, visitors could fake `X-Forwarded-For` and get around the rate limit.

If port 25 can't be opened, set `SKIP_MAILBOX=1`. Checks 1 to 4 still run and the mailbox shows as Unknown.

The rate limit, lookup cache and counts live in memory, so run one server process.

### Vercel

Pushing to the connected branch deploys the app with no extra settings. Vercel blocks outgoing port 25, so [api/index.js](api/index.js) turns the mailbox check off there. Checks 1 to 4 still run, and any address that passes them comes back Unknown. Vercel also runs several copies of the app, so the rate limit and `/healthz` counts apply per copy rather than to the whole site. Use a VPS for real mailbox results.
