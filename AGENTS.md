# AGENTS.md

Instructions for AI coding agents and new contributors. Humans: start with [README.md](README.md).

## What this is

FreelanceFlow: invoicing for freelancers. Django 4.2 + DRF API (`backend/`), React 18 + Vite + Tailwind SPA (`frontend/`), Celery + Redis for email/PDF/reminders, WeasyPrint PDFs, Stripe payments.

The SPA is the only real UI. The server-rendered Django views (`views.py`, `urls.py`, `forms.py` in each app) are dead: their templates do not exist. Do not extend them; put new behaviour in `api_views.py` / `api_urls.py` / `serializers.py` ([ADR-0001](docs/adr/0001-api-only-backend.md)).

## Before you change anything

1. Read the latest entry in [SESSIONS.md](SESSIONS.md) — where the last session stopped and what's open.
2. Take the top item of **Now** in [BACKLOG.md](BACKLOG.md) (full context per phase in [PHASES.md](PHASES.md)). Check it doesn't contradict [PLAN.md](PLAN.md) goals/non-goals.
3. Read its finding in [docs/AUDIT.md](docs/AUDIT.md) — it names the files, the failure case and the intended fix. Skim [MEMORY.md](MEMORY.md) for related lessons.
4. Reference the ID in the branch, commit and PR: `fix(invoices): quantize tax (DATA-3)`.
5. When done: tick the box in PHASES.md, move the item to **Done** in BACKLOG.md, add a line under `Unreleased` in [CHANGELOG.md](CHANGELOG.md).
6. Before ending a session: append a lesson to MEMORY.md if you learned something non-obvious, and add a handoff entry to SESSIONS.md.

## Commands

Run backend commands from `backend/`, frontend commands from `frontend/`. The `.env` lives in the repo root.

Everything CI runs, from the repo root: `bash scripts/check.sh` (add `--pg` to run the backend tests against the compose Postgres, as CI does).

```bash
# Backend (Windows: venv\Scripts\python; macOS/Linux: venv/bin/python)
python -m venv venv && venv/Scripts/python -m pip install -r requirements-dev.txt
venv/Scripts/python manage.py migrate
venv/Scripts/python manage.py seed_demo --reset      # demo@freelanceflow.dev / demo-pass-2026
venv/Scripts/python manage.py runserver               # http://localhost:8000
venv/Scripts/python -m pytest                         # all backend tests
venv/Scripts/python -m pytest tests/test_invoices.py -k totals   # one area
venv/Scripts/python -m flake8 apps && venv/Scripts/python -m black --check apps && venv/Scripts/python -m isort --check-only apps
venv/Scripts/python manage.py makemigrations --check --dry-run   # model/migration drift

# Celery (needs Redis)
venv/Scripts/celery -A config worker -l info --pool=solo   # --pool=solo on Windows

# Frontend
npm install
npm run dev       # http://localhost:3000, proxies /api → :8000
npm run lint      # --max-warnings 0
npm test          # Vitest
npm run build

# Everything in Docker
docker compose up --build
```

Baseline is green (2026-11-15): `pytest`, `npm test`, `npm run lint`, `npm run build`, backend `black`/`isort`/`flake8`; CI runs all of them. Keep it green. Backend style is black with single quotes (`backend/pyproject.toml`). Install the hooks once with `venv/Scripts/pre-commit install` and black/isort/flake8/eslint run on every commit.

## Layout

```
backend/
  config/settings/{base,local,production,test}.py   manage.py→local, celery.py→local, wsgi.py→production, pytest→test
  config/urls.py                               /api/** is live; everything else except /admin and /payments/webhook is dead
  apps/accounts/      custom User (email login, business profile, currency), auth API, seed_demo command
  apps/clients/       Client (per user, unique email per user, is_archived)
  apps/invoices/      Invoice, InvoiceItem, numbering, totals, PDF (utils.py), Celery tasks
  apps/payments/      Payment (OneToOne → Invoice), Stripe webhook + checkout (template side)
  apps/time_tracker/  TimeLog (DRF ViewSet)
  apps/dashboard/     summary + monthly revenue aggregates (no models)
  templates/invoices/ invoice_pdf.html + email/*.html — the only real templates
  tests/              pytest + factory_boy (conftest.py, factories.py)
frontend/src/
  api/client.js       axios instance, token header, global 401 handler
  api/endpoints.js    API helpers (several unused/dead — LEAN-4)
  context/AuthContext.jsx
  pages/<Area>/       one folder per screen
  components/ui/      shared primitives — reuse before writing new markup
docs/                 AUDIT.md (findings), API.md, DESIGN.md, adr/
```

## Rules that protect money and data

- **Money is `Decimal`, end to end.** Backend: `DecimalField`, quantize to `Decimal('0.01')` with `ROUND_HALF_UP`. Frontend: display the server's `line_total`/`subtotal`/`total`; never sum floats for anything that is saved or shown as final ([DATA-3](docs/AUDIT.md#data-3)).
- **Every queryset and every related-field queryset is scoped to `request.user`.** That includes serializer `PrimaryKeyRelatedField`s, not only `get_queryset` ([SEC-1](docs/AUDIT.md#sec-1)). Add a cross-user test for every new write endpoint.
- **Invoice status changes only through model methods** (`mark_as_sent`, `mark_as_paid`, `mark_as_overdue`, `cancel`), never by writing `status` from a serializer ([DATA-2](docs/AUDIT.md#data-2)).
- **Never hard-delete accounting records.** Invoices with payments, and clients with invoices, are archived/voided, not deleted ([DATA-1](docs/AUDIT.md#data-1)).
- **Multi-row writes go in `transaction.atomic()`** (invoice + items, payments + status).
- **Webhooks and Celery tasks must be idempotent** — they are retried ([PAY-1](docs/AUDIT.md#pay-1)).
- **Currency comes from the invoice/user, never a literal `$`** ([BUG-5](docs/AUDIT.md#bug-5)).
- **Datetimes are timezone-aware** (`USE_TZ=True`, `timezone.now()`); date-only strings in JS are parsed as local dates ([BUG-13](docs/AUDIT.md#bug-13)).

## Gotchas

- `Invoice.save()` recalculates totals from `self.items.all()`. There are no `InvoiceItem` signals (DATA-4): after creating or deleting items, call `invoice.save()` yourself, or the stored totals stay stale.
- Invoice numbers are `INV-<current year>-NNN` per user, generated in `Invoice.save()` with a retry loop on `IntegrityError`.
- `pytest` uses `config/settings/test.py`: in-memory SQLite, or Postgres when `TEST_DATABASE_URL` is set (CI). `config/settings/local.py` uses SQLite only when `USE_SQLITE=True`; the root `.env` sets this for local dev.
- `.env` is loaded by `python-dotenv` from the repo root (found by walking up from `config/settings/`). There is no `backend/.env`.
- Emails print to the console unless `EMAIL_HOST_USER` is set (local) — safe to run reminder tasks locally. Demo clients use `example.com` addresses.
- WeasyPrint needs Pango/Cairo system libraries. On Windows it logs harmless `GLib-GIO-WARNING` lines; filter them, don't fix them.
- The frontend has no TypeScript; the `@` import alias in `vite.config.js` is unused — use relative imports to match the codebase.
- Frontend tests: Vitest + Testing Library + MSW, `*.test.js` beside the code. `src/test/server.js` has no default handlers; declare responses per test with `server.use()` (unhandled requests fail).

## Testing expectations

- Bug fix → a test that fails before the fix, in `backend/tests/test_<area>.py` or a Vitest `*.test.js` beside the frontend code.
- Use factories from `tests/factories.py`; aware datetimes only (`timezone.now() + timedelta(...)`).
- Mock Stripe and email at the boundary; patch the name where it is looked up (`apps.invoices.tasks.<name>` only if `tasks.py` imports it at module level).
- No tests for wiring, copies, or snapshot text. Test behaviour: totals, transitions, scoping, idempotency, validation errors.

## Do not

Full lists: [.claude/rules/security.md](.claude/rules/security.md) (secrets, destructive commands, weakening protections) and [.claude/rules/code-style.md](.claude/rules/code-style.md) (naming and idioms). Every agent follows them, not only Claude Code.

- Do not read or print `.env*` files; do not commit `.env`, `db.sqlite3`, `media/`, `venv/`, `node_modules/`, `dist/`.
- Do not force-push, `reset --hard`, delete data, or `git push` without being asked.
- Do not add dependencies for what a few lines or the standard library can do; justify every new one in the PR.
- Do not create migrations that rewrite existing migration files; add a new one.
- Do not "fix" a `Must` finding without its regression test.
