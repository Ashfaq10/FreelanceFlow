# Backlog

The short queue. [PHASES.md](PHASES.md) is the full roadmap with details; this file only says **what to pick up next**.

Rules:
- **Now** holds at most 3 items. Finish (or move back) before pulling a new one.
- Pull from the top of **Next**. Refill **Next** from the first unchecked items in PHASES.md.
- When an item is done: tick it in PHASES.md, move it to **Done** here with the date, add a CHANGELOG line. Keep only the last 10 in Done.
- IDs link to [docs/AUDIT.md](docs/AUDIT.md).

## Now

Phase 4, in this order (see [PHASES.md](PHASES.md)):

- [ ] Remove unused dependencies — [LEAN-2](docs/AUDIT.md#lean-2)
- [ ] Remove dead backend helpers — [LEAN-3](docs/AUDIT.md#lean-3)
- [ ] Remove dead frontend code, one shared status badge — [LEAN-4](docs/AUDIT.md#lean-4)
- [ ] Client list in 2 queries instead of 61 — [PERF-1](docs/AUDIT.md#perf-1)
- [ ] Route-level code splitting — [PERF-2](docs/AUDIT.md#perf-2)

## Next

1. Accessibility: Modal, labels, keyboard rows, 404 — [UX-1](docs/AUDIT.md#ux-1) to [UX-3](docs/AUDIT.md#ux-3)
2. Fake settings, theme provider, big components — [UX-4](docs/AUDIT.md#ux-4), [UX-5](docs/AUDIT.md#ux-5), [LEAN-5](docs/AUDIT.md#lean-5)
3. Tooling and upgrades — [OPS-8](docs/AUDIT.md#ops-8), [OPS-7](docs/AUDIT.md#ops-7) (also fixes the `accounts` migration drift)
4. OpenAPI schema, PDF layouts for the six templates

## Later

- Phase 5 (production), only what a live demo needs: [OPS-3](docs/AUDIT.md#ops-3), [OPS-9](docs/AUDIT.md#ops-9), [TEST-5](docs/AUDIT.md#test-5), a deploy
- Phase 6 (growth features) only on user demand

## Blocked / needs a decision

- Rebuild the local `backend/venv` on Python 3.12 (3.13 is not supported by Django 4.2)
- One real Stripe test-mode payment (everything payment-related is mocked so far)
- Upload the repo's social preview image in GitHub settings
