# Backlog

The short queue. [PHASES.md](PHASES.md) is the full roadmap with details; this file only says **what to pick up next**.

Rules:
- **Now** holds at most 3 items. Finish (or move back) before pulling a new one.
- Pull from the top of **Next**. Refill **Next** from the first unchecked items in PHASES.md.
- When an item is done: tick it in PHASES.md, move it to **Done** here with the date, add a CHANGELOG line. Keep only the last 10 in Done.
- IDs link to [docs/AUDIT.md](docs/AUDIT.md).

## Now

- [ ] Pagination controls and server-side totals — [BUG-7](docs/AUDIT.md#bug-7)
- [ ] Single send pipeline; UI shows queued state — [BUG-9](docs/AUDIT.md#bug-9)
- [ ] Delete only on drafts; show API error messages — [BUG-10](docs/AUDIT.md#bug-10)

## Next

1. Client search filters on the backend — [BUG-11](docs/AUDIT.md#bug-11)
2. `?client=` preselects the client on new invoices — [BUG-12](docs/AUDIT.md#bug-12)
3. Date-only values parsed as local dates — [BUG-13](docs/AUDIT.md#bug-13)
4. Reports: no `NaN%` — [BUG-14](docs/AUDIT.md#bug-14)
5. Error + retry states; `Promise.allSettled` on the Dashboard — [BUG-15](docs/AUDIT.md#bug-15)

## Later

- Rest of Phase 1 (security & money), then Phase 2 (broken flows) — see [PHASES.md](PHASES.md)
- Phases 3–6: core product, code health, production, growth

## Blocked / needs a decision

- Product name: Penough vs FreelanceFlow — [UX-6](docs/AUDIT.md#ux-6), see [SESSIONS.md](SESSIONS.md#open-questions)
- Accept or reject [ADR-0001](docs/adr/0001-api-only-backend.md) and [ADR-0002](docs/adr/0002-auth-session-cookies.md)

## Done

- [x] 2026-11-15 — Phase 0 baseline: test settings, green pytest, CI paths + frontend job, lint green both sides, Celery local default, `lib/` ignore, Vitest + MSW (TEST-2, TEST-1, OPS-1, OPS-2, OPS-12, OPS-13, TEST-4)
- [x] 2026-11-15 — Dev tooling: `scripts/check.sh`, pre-commit hooks, Dependabot
- [x] 2026-11-15 — Cross-tenant related fields scoped to the caller (SEC-1)
- [x] 2026-11-15 — Money quantized to cents on the backend (DATA-3); invoice status locked to its state machine with a cancel endpoint (DATA-2)
- [x] 2026-11-15 — Production refuses the published default `SECRET_KEY`; `ALLOWED_HOSTS` required; proxy TLS header (SEC-2)
- [x] 2026-11-15 — SPA money matches the server to the cent (DATA-3, frontend half)
- [x] 2026-11-15 — Invoice writes are one transaction; totals computed once (DATA-4)
- [x] 2026-11-15 — Fractional quantities and bounded discount/tax end to end (DATA-5); editing a draft keeps its dates (DATA-6)
- [x] 2026-11-15 — Clients with invoices can no longer be deleted; the UI archives them (DATA-1)
- [x] 2026-11-15 — Phase 1 closed: idempotent Stripe webhook (PAY-1), logo upload validation (SEC-3), auth throttling and password rules (SEC-4), debug toolbar out of prod (SEC-7), currency `ChoiceField` (SEC-8)
- [x] 2026-11-15 — Phase 2 started: login errors visible (BUG-1), client totals real (BUG-2), optional hourly rate (BUG-3)
- [x] 2026-11-15 — Repo cleanup, `seed_demo`, single `.env.example`, docs set (OPS-6, OPS-10, OPS-11)
