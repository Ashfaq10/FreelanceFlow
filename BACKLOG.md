# Backlog

The short queue. [PHASES.md](PHASES.md) is the full roadmap with details; this file only says **what to pick up next**.

Rules:
- **Now** holds at most 3 items. Finish (or move back) before pulling a new one.
- Pull from the top of **Next**. Refill **Next** from the first unchecked items in PHASES.md.
- When an item is done: tick it in PHASES.md, move it to **Done** here with the date, add a CHANGELOG line. Keep only the last 10 in Done.
- IDs link to [docs/AUDIT.md](docs/AUDIT.md).

## Now

Phase 5 container work: tick OPS-3 after a real `docker compose -f docker-compose.prod.yml up` (OPS-5 once CI builds the proxy image), then Sentry + structured logging ([OPS-9](docs/AUDIT.md#ops-9)).

## Next

Phase 5 is only worth doing in part, for a live demo: a deploy, [OPS-3](docs/AUDIT.md#ops-3), [OPS-9](docs/AUDIT.md#ops-9), [TEST-5](docs/AUDIT.md#test-5). Needs the owner's decision on hosting.

## Later

- Phase 6 (growth features) only on user demand

## Blocked / needs a decision

- One real Stripe test-mode payment (everything payment-related is mocked so far)
- Upload the repo's social preview image in GitHub settings
