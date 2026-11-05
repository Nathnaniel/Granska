# Email Verifier

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
| `public/index.html` | The whole page, with inline CSS and JS |
| `public/assets/` | Icons, artwork and fonts from the Figma design |
| `data/disposable-domains.txt` | Throwaway domains, one per line |
| `scripts/update-disposable.js` | Refreshes that list from [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) |
| `scripts/check-port25.js` | Tests whether a server can reach mail servers |
| `deploy/` | Service, Caddy and settings files for a VPS |
| `test/server.test.js` | Tests, including a fake mail server |

`POST /api/verify` takes `{ "email": "..." }` and returns the verdict. `GET /healthz` returns anonymous counts, which is where the PRD's success metrics are read from. They reset when the server restarts.

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
   rsync -av --exclude .git --exclude .claude ./ root@YOUR_SERVER:/opt/email-verifier/
   ```
   ```bash
   cd /opt/email-verifier && npm run check-port25
   ```
   If it fails, ask the host to open port 25, or use another host. Describe the use honestly: the server talks to mail servers to check addresses and sends no mail.
4. **Set reverse DNS** for the server's IP to your domain in the host's control panel. Then rerun the check with the name set:
   ```bash
   cd /opt/email-verifier && HELO_HOST=verifier.example.com npm run check-port25
   ```
5. **Set up the service**, replacing `verifier.example.com` in both copied files:
   ```bash
   useradd --system --no-create-home emailverifier
   cp /opt/email-verifier/deploy/email-verifier.env.example /etc/email-verifier.env
   cp /opt/email-verifier/deploy/email-verifier.service /etc/systemd/system/
   cp /opt/email-verifier/deploy/Caddyfile /etc/caddy/Caddyfile
   ```
   ```bash
   systemctl daemon-reload && systemctl enable --now email-verifier && systemctl reload caddy
   ```
6. **Refresh the throwaway list** on each deploy, then restart the service:
   ```bash
   cd /opt/email-verifier && npm run update-disposable && systemctl restart email-verifier
   ```
7. **Open the page and check an address you own.** Reading `/healthz` shows the running counts.

The app must listen only on 127.0.0.1 behind Caddy, which the example settings do. If it were reachable directly, visitors could fake `X-Forwarded-For` and get around the rate limit.

If port 25 can't be opened, set `SKIP_MAILBOX=1`. Checks 1 to 4 still run and the mailbox shows as Unknown.

The rate limit, lookup cache and counts live in memory, so run one server process.
