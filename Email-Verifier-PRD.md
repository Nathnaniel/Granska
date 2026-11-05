# Email Verifier — PRD

Nov 5, 2026 · Nathaniel Tibitus

## Overview

Email Verifier is a single web page where anyone types an email address and learns in a few seconds whether it is real, with no account, no sign-up and no email sent to the person.

**Problem.** Sending to fake, mistyped or throwaway addresses wastes money, hurts sender reputation and loses real customers to typos like `gmial.com`. Existing verification tools ask you to create an account, buy credits or upload a list before you can check a single address.

**Product.** One input, one button, one clear answer: **Valid**, **Risky**, **Invalid** or **Unknown**, with a plain-language reason and the checks behind it.

**Principle: no login.** The page works for anyone who opens it. There are no accounts, passwords, saved history or personal dashboards. Every rule in this PRD has to hold without knowing who the visitor is.

## Goals and non-goals

Version 1 does one thing well: check a single address, instantly, for anyone.

**Goals**

- Give a clear verdict for one email address in under 5 seconds for most checks.
- Explain every verdict in plain language, with the individual checks visible.
- Catch typos and offer a one-tap fix.
- Work with no login, no payment and nothing to install.
- Never send an email to the address being checked.

**Non-goals for version 1**

- Accounts, logins, saved history or team workspaces.
- Bulk list upload (CSV) or exporting cleaned lists.
- A public developer API or API keys.
- Payments, credits or usage plans.
- Guaranteeing 100% accuracy; some mail servers refuse to answer, and the page says so.

## Users and use cases

The users are people who are about to send something important and want to be sure it lands.

| User | Use case |
| --- | --- |
| Founder or freelancer | Checks a lead's address before a cold email or proposal |
| Recruiter or sales rep | Confirms a contact found online before reaching out |
| Small business owner | Checks a customer's address before sending an invoice or order details |
| Marketer | Spot-checks a suspicious signup before adding it to a list |

## User flow

The whole experience is three steps on one page, with no redirects.

1. **Land.** The visitor sees a heading ("Is this email real?"), one input and a **Verify** button. Below it, the five checks are listed in a waiting state so they know what will happen.
2. **Check.** They type or paste an address and press Enter or Verify. The button shows a spinner and "Checking"; the input stays editable.
3. **Read the result.** A card appears with:
   - a status pill (Valid, Risky, Invalid or Unknown),
   - the address checked,
   - a one-sentence reason,
   - a "Did you mean …?" suggestion when a typo is likely (tap to re-check),
   - the five checks, each marked passed, failed or couldn't check.

To check another address, they edit the input and press Verify again. The new result replaces the old one.

## Functional requirements

The server runs five checks in order and stops at the first one that settles the answer.

**The checks**

| # | Check | How it works | Fails when |
| --- | --- | --- | --- |
| 1 | Format | Pattern match on the address, max 254 characters | Missing @, bad characters, no domain ending |
| 2 | Disposable | Domain matched against a list of throwaway providers | Domain is on the list (e.g. mailinator.com) |
| 3 | Domain | DNS lookup for mail (MX) records, falling back to the domain's address record | Domain has no way to receive email |
| 4 | Personal inbox | First part matched against shared names (info, admin, support, sales…) | Address is a shared team inbox |
| 5 | Mailbox | Connects to the domain's mail server and asks if it would accept mail for the address, then disconnects before sending anything | Server replies that the mailbox doesn't exist |

Typo suggestions run alongside the checks: when the domain is one or two letters away from a common provider (gmail.com, outlook.com, yahoo.com and others), the result offers the corrected address.

**Result states**

| Status | Meaning | Shown when |
| --- | --- | --- |
| Valid | Real inbox that can receive mail | All checks pass |
| Risky | Probably delivers, but with a catch | Disposable domain, shared team inbox, or a server that accepts every address (catch-all) |
| Invalid | Will not receive mail | Bad format, domain can't receive email, or mailbox rejected |
| Unknown | Domain is real, mailbox couldn't be confirmed | Mail server didn't answer, timed out or blocked the check |

**Page behaviour**

- Pressing Enter in the input runs the check.
- An empty input shows no request; focus returns to the input.
- While checking, the button is disabled and shows a spinner, so a check can't be sent twice.
- Errors (network down, too many checks) appear in place of the result card, in plain language, with what to do next.
- The page works at phone width and in light and dark mode.
- Nothing is stored in the browser between visits.

## Non-functional requirements

With no login, abuse protection and privacy have to work without knowing who the visitor is.

| Area | Requirement |
| --- | --- |
| Speed | Format, disposable and domain checks return in under 1 second; the full check, including mailbox, in under 5 seconds for most domains, with an 8-second cap per mail server |
| Abuse protection | Limit each IP address to 20 checks per minute; show "Too many checks. Wait a minute and try again." when exceeded. Add a bot challenge (e.g. Cloudflare Turnstile) only if abuse appears |
| Caching | Cache each domain's mail-server lookup for 10 minutes to cut repeat DNS calls |
| Privacy | Don't store checked addresses. Logs keep counts and outcomes only, never the address itself. No cookies or trackers that need a consent banner |
| Hosting | The mailbox check needs outgoing port 25, which most cloud hosts block. Host on a server that allows it, with a clean IP and matching reverse DNS. If port 25 is unavailable, the page still runs checks 1–4 and returns Unknown for the mailbox |
| Stack | One Node.js server file with no dependencies, plus one HTML page. No database |
| Accessibility | Labelled input, visible keyboard focus, results announced to screen readers, reduced-motion respected |

## Success metrics

The page succeeds when people get a confident answer fast and come back to use it again.

| Metric | Target for the first 30 days |
| --- | --- |
| Checks that return a definite answer (not Unknown) | 80% or more |
| Median time to result | Under 3 seconds |
| Typo suggestions accepted | 40% or more of those shown |
| Visitors who run a second check | 30% or more |
| Error responses (5xx) | Under 1% |

These targets are starting guesses to revisit after the first month of real traffic. All metrics come from anonymous counts, with no visitor tracking.

## Risks, open questions and milestones

The biggest risk is the mailbox check: it depends on a host that allows port 25 and on mail servers being willing to answer.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Host blocks port 25 | No mailbox check; more Unknown results | Pick a host that allows it, or send only the mailbox step to a paid verification API |
| Server IP gets blacklisted from too many checks | Mail servers stop answering | Rate limit per IP, cache per domain, use a clean dedicated IP |
| Big providers (Gmail, Outlook, Yahoo) don't answer honestly | Some Valid or Unknown results are wrong | Say so on the page; never claim certainty |
| Bots use the free page to clean spam lists | Load and IP reputation suffer | Rate limits first; add a bot challenge if needed |
| Disposable list goes stale | New throwaway domains slip through | Pull from a maintained open-source list on each deploy |

**Open questions**

- [ ] Product name and domain for the page
- [ ] Which host to use, and whether it allows port 25
- [ ] Stay fully API-free, or use a paid API for the mailbox step
- [ ] Should a version 2 add bulk CSV checks, and would that need accounts?

**Milestones**

1. **Build:** page and server with all five checks (code drafted).
2. **Test:** run against known valid, invalid, disposable, typo and catch-all addresses; tune timeouts.
3. **Deploy:** host on a port-25-friendly server with the domain, HTTPS and rate limiting live.
4. **Launch:** share publicly, watch the success metrics for 30 days.
5. **Review:** decide on version 2 (bulk checks, API) from real usage.
