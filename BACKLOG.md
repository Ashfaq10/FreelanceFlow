# Backlog

The short queue. [PHASES.md](PHASES.md) is the full roadmap with details; this file only says **what to pick up next**.

Rules:
- **Now** holds at most 3 items. Finish (or move back) before pulling a new one.
- Pull from the top of **Next**. Refill **Next** from the first unchecked items in PHASES.md.
- When an item is done: tick it in PHASES.md, move it to **Done** here with the date, add a CHANGELOG line. Keep only the last 10 in Done.
- IDs link to [docs/AUDIT.md](docs/AUDIT.md).

## Now

1. [BUG-18](docs/AUDIT.md#bug-18) + [SEC-6](docs/AUDIT.md#sec-6) S3 logos in PDFs, signed URLs

## Next

2. [OPS-9](docs/AUDIT.md#ops-9) Sentry + structured logging
3. [TEST-5](docs/AUDIT.md#test-5) Playwright smoke; `pip-audit` in CI
4. Phase 6 features (one spec each in `docs/specs/`)
5. Phase 7 containers & deploy — **last** (owner's decision 2026-11-20); the prod compose/Caddy files exist but have never been run

## Later

- Nothing; Phase 7 is the end of the roadmap.

## Blocked / needs a decision

- One real Stripe test-mode payment (everything payment-related is mocked so far); moved to Phase 7
- Upload the repo's social preview image in GitHub settings
