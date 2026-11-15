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
- **2026-11-15 — Backend keeps single quotes.** Owner's call: black runs with `skip-string-normalization` (`backend/pyproject.toml`). Black does not read `setup.cfg`; its config must stay in `pyproject.toml`.
- **2026-11-15 — Tests select Postgres with `TEST_DATABASE_URL`, not `DATABASE_URL`.** The root `.env` sets `DATABASE_URL` for Postgres, so reusing it would make local `pytest` need a database server.
- **2026-11-15 — The product is FreelanceFlow; Penough is the maker.** Owner's call. The expensive identifiers (repo, database, Celery app, demo domain, docs) already said FreelanceFlow; only logo images and the page title said Penough. Use `components/ui/Wordmark.jsx` for the brand mark — never a second copy ([UX-6](docs/AUDIT.md#ux-6)). Domain and trademark are unverified.

## Lessons

- **2026-11-15 — `Invoice.save()` computes totals from saved items only.** Create the items first, then call `invoice.save()`. The `InvoiceItem` post-save signal that used to do this implicitly was deleted with [DATA-4](docs/AUDIT.md#data-4), so nothing recomputes totals behind your back.
- **2026-11-15 — Invoice numbers follow creation order, not `issue_date`.** Backdated invoices must be created oldest-first or numbers look shuffled (`seed_demo` sorts by `days_ago`).
- **2026-11-15 — Tests only use SQLite because `.env` sets `USE_SQLITE=True`.** The `'test' in sys.argv` branch in `local.py` never fires under pytest. Fix tracked as [TEST-2](docs/AUDIT.md#test-2). *(Fixed same day: pytest uses `config.settings.test`.)*
- **2026-11-15 — `black --check` fails on 64 files** because the codebase uses single quotes and there is no black config. Don't reformat files piecemeal; one formatting-only commit ([OPS-2](docs/AUDIT.md#ops-2)). *(Fixed same day.)*
- **2026-11-15 — `celery -A config …` loads production settings by default** (`config/celery.py`). Locally, export `DJANGO_SETTINGS_MODULE=config.settings.local` ([OPS-12](docs/AUDIT.md#ops-12)). *(Fixed same day: defaults to local.)*
- **2026-11-15 — Windows: WeasyPrint prints `GLib-GIO-WARNING … UWP app` lines on every Django start.** Harmless; filter with `| grep -v GLib`.
- **2026-11-15 — Windows: a running Python process locks `venv\Scripts\python.exe`.** Deleting or recreating a venv fails with "Permission denied" until the process (often an editor's language server or an agent's Python kernel) is stopped. Find it with `Get-Process | ? Path -like '*venv*'`.
- **2026-11-15 — `npm run build` used to warn about an 812 KB chunk.** Every page is lazy-loaded now (initial JS 267 KB, recharts only on Dashboard/Reports) ([PERF-2](docs/AUDIT.md#perf-2)). A new page must be `lazy()` in `App.jsx` or it lands back in the entry chunk.
- **2026-11-15 — Patching `apps.payments.views.stripe` also replaces `stripe.error`.** `except stripe.error.SignatureVerificationError` then catches a MagicMock and raises `TypeError`; put the real exception class back on the mock.
- **2026-11-15 — Vitest/jsdom: stubbing `window.location` as `{ href: '/' }` breaks axios** ("Invalid base URL"). Copy `href`, `origin`, `protocol`, `host`, `hostname`, `port`, `pathname` into the stub (see `api/client.test.js`).
- **2026-11-15 — CI pins flake8/black/isort to the local venv versions.** Unpinned tools in CI reformat differently from local runs; bump the pin in `ci.yml` when the venv upgrades.
- **2026-11-15 — `bulk_create` skips `Model.save()`.** `InvoiceItem.line_total` must be set explicitly before the call (`item.compute_line_total()`), or the column is written as NULL/stale.
- **2026-11-15 — Removing a package from `requirements.txt` can break the image build.** `backend/Dockerfile` runs `collectstatic` through `manage.py`, which loads *local* settings; anything those settings import must exist in the production image, or be guarded (see `debug_toolbar` in `config/settings/local.py`). Proper fix is [OPS-4](docs/AUDIT.md#ops-4).
- **2026-11-15 — DRF throttles count in the Django cache.** Tests that hit `/api/auth/*` leak counters into later tests; `tests/conftest.py` clears the cache around every test.
- **2026-11-15 — An `IntegrityError` inside a test's transaction poisons it.** Wrap the failing write in `transaction.atomic()` (savepoint) before catching, as `signup_view` does, or the next query raises `TransactionManagementError`.
- **2026-11-15 — A `<select>` silently drops a value whose `<option>` has not loaded yet.** React Hook Form `defaultValues.client` from `?client=` was lost because the client list arrives later; re-apply with `setValue` after the options are in state ([BUG-12](docs/AUDIT.md#bug-12)).
- **2026-11-15 — DRF sends decimals as strings, and `"0.00"` is truthy.** `stats.total_revenue && stats.total_billed ? … : 0` therefore divided by zero and printed `Infinity%`. Guard with `Number(x) > 0` ([BUG-14](docs/AUDIT.md#bug-14)).
- **2026-11-15 — `.delay()` hangs when Redis is down.** `task_publish_retry=False`, `broker_connection_retry=False` and `socket_connect_timeout` did not make it raise on Windows; the request just waits. The send endpoint already turns `kombu.exceptions.OperationalError` into a 503 for the day the publish does fail fast ([OPS-9](docs/AUDIT.md#ops-9)).
- **2026-11-15 — Stale `runserver` processes keep port 8000.** Restarting a "service" that Windows already lost leaves the old server answering, so new code looks missing while tests pass. Kill them all (`pkill -f "manage.py runserver"`) and start one.
- **2026-11-15 — Stripe's `amount_refunded` is cumulative.** `charge.refunded` repeats after every later refund; book `amount_refunded - already_booked`, never the raw value ([PAY-4](docs/AUDIT.md#pay-4)).
- **2026-11-15 — Add a unique column in three steps.** Add it blank, backfill each row with its own value in `RunPython`, then `AlterField(unique=True)`. A single `AddField(unique=True)` fails on existing rows (`public_token`, migration `0011`).
- **2026-11-15 — Emails must link the permanent page, not the Stripe URL.** A Checkout session expires after 24 h; `/pay/<token>` mints a fresh one on demand ([FEAT-3](docs/AUDIT.md#feat-3)).
- **2026-11-15 — Automated browsers may report `prefers-reduced-motion: reduce`.** Motion then never plays; emulate `no-preference` before judging an animation.
- **2026-11-15 — The Impeccable detector (`impeccable detect --json <files>`) runs once, after the UI is built.** It reads the changed files and prints `[]` when clean.
- **2026-11-15 — `black apps tests` reformats 20 test files.** CI and `scripts/check.sh` only check `apps`; format new test files individually or you ship a 500-line unrelated diff.

## Debugging recipes

- **Is the API scoping by user?** `pytest -k cross` once Phase 1 tests exist; until then, log in as the demo user and request a UUID from another account → must be 404.
- **Totals look off by a cent:** compare `subtotal - discount_amount + tax_amount` with `total` in the shell; unquantized tax is [DATA-3](docs/AUDIT.md#data-3).
- **Emails not arriving locally:** expected — without `EMAIL_HOST_USER` they print in the `runserver`/worker console.
