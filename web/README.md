# Granska website

Marketing site, sign-up and log-in flow and a placeholder dashboard, built with Next.js and Tailwind. It is separate from the checker in the parent folder.

```bash
npm install
npm run dev
```

Then open http://localhost:3001.

| Path | What it is |
| --- | --- |
| `messages/*.json` | Every string, one file per language. `npm run check-i18n` confirms they match |
| `app/globals.css` | Colour tokens from the Figma file, type and motion |
| `lib/demoCheck.ts` | Simulated checker results. Replace with a call to the real `/api/verify` |
| `lib/auth.ts` | Mock sign-in behind an `AuthClient` interface, ready for Supabase or Clerk |
| `lib/plans.ts` | Plan prices |

Set `NEXT_PUBLIC_SITE_URL` before deploying so canonical, hreflang and Open Graph links are correct. To deploy on Vercel, create a separate project with its Root Directory set to `web`.

**Not real yet:** checker results, sign-in, credits, list upload and pricing checkout are all simulated. The API docs, Privacy and Terms pages are placeholders.
