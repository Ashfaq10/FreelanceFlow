# Backlog

The short queue. [PHASES.md](PHASES.md) is the full roadmap with details; this file only says **what to pick up next**.

Rules:
- **Now** holds at most 3 items. Finish (or move back) before pulling a new one.
- Pull from the top of **Next**. Refill **Next** from the first unchecked items in PHASES.md.
- When an item is done: tick it in PHASES.md, move it to **Done** here with the date, add a CHANGELOG line. Keep only the last 10 in Done.
- IDs link to [docs/AUDIT.md](docs/AUDIT.md).

## Now

- [ ] Add `config/settings/test.py`; point `pytest.ini` at it — [TEST-2](docs/AUDIT.md#test-2)
- [ ] Make the backend suite green (delete 4 dead-view tests, fix 5) — [TEST-1](docs/AUDIT.md#test-1)
- [ ] Fix CI paths and add a frontend job — [OPS-1](docs/AUDIT.md#ops-1)

## Next

1. Lint green both sides (one formatting-only commit for backend) — [OPS-2](docs/AUDIT.md#ops-2)
2. Celery defaults to local settings; anchor `.gitignore` `lib/` — [OPS-12](docs/AUDIT.md#ops-12), [OPS-13](docs/AUDIT.md#ops-13)
3. Vitest + RTL + MSW with one test in CI — [TEST-4](docs/AUDIT.md#test-4)
4. Scope serializer querysets to the user — [SEC-1](docs/AUDIT.md#sec-1)
5. Quantize money on the backend — [DATA-3](docs/AUDIT.md#data-3)
6. Lock invoice status transitions — [DATA-2](docs/AUDIT.md#data-2)
7. `PROTECT` invoices from client deletion; archive in the UI — [DATA-1](docs/AUDIT.md#data-1)
8. Idempotent Stripe webhook — [PAY-1](docs/AUDIT.md#pay-1)

## Later

- Rest of Phase 1 (security & money), then Phase 2 (broken flows) — see [PHASES.md](PHASES.md)
- Phases 3–6: core product, code health, production, growth

## Blocked / needs a decision

- Product name: Penough vs FreelanceFlow — [UX-6](docs/AUDIT.md#ux-6), see [SESSIONS.md](SESSIONS.md#open-questions)
- Accept or reject [ADR-0001](docs/adr/0001-api-only-backend.md) and [ADR-0002](docs/adr/0002-auth-session-cookies.md)

## Done

- [x] 2026-11-15 — Repo cleanup, `seed_demo`, single `.env.example`, docs set (OPS-6, OPS-10, OPS-11)
