# Memory

Hard-won knowledge that isn't obvious from the code. Append entries; don't rewrite history. Newest first within each section.

- **Big, expensive-to-reverse decisions** → write an ADR in [docs/adr/](docs/adr/) and link it here.
- **Small decisions and lessons** → one entry here: date, what, why, where.
- Promote an entry to [AGENTS.md](AGENTS.md#gotchas) "Gotchas" when every session needs it.

## Decisions

- **2026-11-15 — Demo data via a management command, not JSON fixtures.** `apps/accounts/management/commands/seed_demo.py` builds data through the ORM, so it survives model changes and fires the same `save()`/signal logic as real usage. Fixtures drifted and shipped an unusable password hash. Rerun with `--reset`.
- **2026-11-15 — Demo/client emails use `example.com`.** Reserved domain, so a Celery reminder run against seed data can never mail a real person.
- **2026-11-15 — `AGENTS.md` is canonical; `CLAUDE.md` imports it with `@AGENTS.md`.** One file for every agent tool (Codex, Cursor, omp, Claude Code); Claude-only notes stay in CLAUDE.md.
- **2026-11-15 — Keep `backend/venv`, drop the root `venv/`.** The README documents `backend/venv`; two venvs caused tools to pick the wrong one.
- **2026-11-15 — Proposed: API-only backend ([ADR-0001](docs/adr/0001-api-only-backend.md)); session-cookie auth ([ADR-0002](docs/adr/0002-auth-session-cookies.md)).**

## Lessons

- **2026-11-15 — `Invoice.save()` computes totals from saved items only.** Creating an invoice, then items, leaves the in-memory invoice with zero totals; the `InvoiceItem` signal writes totals with `.update()`. Call `invoice.refresh_from_db()` before reading totals. (Seed command does this.)
- **2026-11-15 — Invoice numbers follow creation order, not `issue_date`.** Backdated invoices must be created oldest-first or numbers look shuffled (`seed_demo` sorts by `days_ago`).
- **2026-11-15 — Tests only use SQLite because `.env` sets `USE_SQLITE=True`.** The `'test' in sys.argv` branch in `local.py` never fires under pytest. Fix tracked as [TEST-2](docs/AUDIT.md#test-2).
- **2026-11-15 — `black --check` fails on 64 files** because the codebase uses single quotes and there is no black config. Don't reformat files piecemeal; one formatting-only commit ([OPS-2](docs/AUDIT.md#ops-2)).
- **2026-11-15 — `celery -A config …` loads production settings by default** (`config/celery.py`). Locally, export `DJANGO_SETTINGS_MODULE=config.settings.local` ([OPS-12](docs/AUDIT.md#ops-12)).
- **2026-11-15 — Windows: WeasyPrint prints `GLib-GIO-WARNING … UWP app` lines on every Django start.** Harmless; filter with `| grep -v GLib`.
- **2026-11-15 — Windows: a running Python process locks `venv\Scripts\python.exe`.** Deleting or recreating a venv fails with "Permission denied" until the process (often an editor's language server or an agent's Python kernel) is stopped. Find it with `Get-Process | ? Path -like '*venv*'`.
- **2026-11-15 — `npm run build` passes but warns about an 812 KB chunk;** that's [PERF-2](docs/AUDIT.md#perf-2), not a build failure.

## Debugging recipes

- **Is the API scoping by user?** `pytest -k cross` once Phase 1 tests exist; until then, log in as the demo user and request a UUID from another account → must be 404.
- **Totals look off by a cent:** compare `subtotal - discount_amount + tax_amount` with `total` in the shell; unquantized tax is [DATA-3](docs/AUDIT.md#data-3).
- **Emails not arriving locally:** expected — without `EMAIL_HOST_USER` they print in the `runserver`/worker console.
