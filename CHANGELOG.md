# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). Reference the [audit](docs/AUDIT.md) ID in each entry.

## [Unreleased]

### Added
- `config/settings/test.py`: in-memory SQLite by default, Postgres via `TEST_DATABASE_URL`; MD5 hasher, locmem email, eager Celery, temp media dir (TEST-2).
- Frontend tests: Vitest + React Testing Library + MSW, `npm test`, first test covers `api/client.js` token and 401/500 handling (TEST-4).
- CI frontend job (`npm ci`, lint, test, build) (OPS-1, TEST-4).
- `backend/pyproject.toml` black config (line length 120, single quotes kept) and `.git-blame-ignore-revs` (OPS-2).
- `python manage.py seed_demo [--reset]`: demo account with 6 clients, 19 invoices across all statuses, payments and time logs over the last 8 months (OPS-11). Refuses to run unless `DEBUG=True`, since the demo password is public.
- Agent guardrails: [.claude/rules/](.claude/rules/) (code style, security) and `.claude/settings.json` deny rules; [PLAN.md](PLAN.md), [BACKLOG.md](BACKLOG.md), [MEMORY.md](MEMORY.md), [SESSIONS.md](SESSIONS.md).
- Project tracking docs: [PHASES.md](PHASES.md) roadmap, [docs/AUDIT.md](docs/AUDIT.md) findings, [docs/API.md](docs/API.md), [docs/DESIGN.md](docs/DESIGN.md), [ADRs](docs/adr/), [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), PR template.
- `backend/static/.gitkeep` so fresh clones pass Django's `staticfiles.W004` check.

### Security
- Invoice and time-log writes only accept clients and invoices owned by the caller; a cross-user id now returns 400 instead of attaching (and emailing) someone else's client (SEC-1).
- Invoice `status` is read-only over the API: `POST {"status": "paid"}` no longer creates revenue without a payment. Transitions are enforced in the model (`draft→sent`, `sent|overdue→paid`, `draft|sent|overdue→cancelled`) and illegal ones return 400 (DATA-2).
- `config.settings.production` refuses to start without `SECRET_KEY` and `ALLOWED_HOSTS` (no more published-default fallback) and trusts `X-Forwarded-Proto`, so `SECURE_SSL_REDIRECT` cannot loop behind a TLS proxy (SEC-2).

### Changed
- The SPA previews unsaved drafts in integer cents (`utils/money.js`) and displays the server's `line_total` for saved items, so the live total and the saved invoice agree to the cent (DATA-3, frontend half).
- Invoice create and update run in one transaction and insert items with `bulk_create`; a failed item write no longer leaves a numbered invoice with no items or a zero total. Totals are recomputed once per write instead of once per item, and the `InvoiceItem` signals are gone (DATA-4).
- Money is quantized to the cent with `ROUND_HALF_UP` before it is stored (`to_cents`), so `subtotal - discount + tax == total` always holds; Django's half-even rounding on save no longer loses a cent (DATA-3, backend half).
- `POST /api/invoices/{id}/cancel/` cancels a draft, sent or overdue invoice (DATA-2).
- CI runs backend jobs from `backend/`, tests against the Postgres service, builds the image from `./backend`, and pins flake8/black/isort (OPS-1, OPS-2).
- Backend formatted with black and isort; flake8 clean. `logout_view` catches `Token.DoesNotExist` instead of a bare `except` (OPS-2).
- Frontend lint clean: fetch-on-mount effects declare their dependencies; unused code removed (OPS-2).
- Celery defaults to `config.settings.local`, like `manage.py` (OPS-12).
- Dev tooling: `scripts/check.sh` runs every CI check locally (`--pg` for Postgres), pre-commit hooks for black/isort/flake8/eslint, Dependabot for pip/npm/actions/docker.
- `.gitignore` anchors `lib/`/`lib64/` to `/backend/` (OPS-13).
- README rewritten to match the code: correct ports and commands, honest project status, links to the roadmap (OPS-10).
- Single root `.env.example` covering SQLite/Postgres, SMTP/SendGrid, Stripe and S3 (OPS-6).

### Fixed
- Backend test suite green: aware datetimes for `Invoice.due_date`, partial-payment test uses real items, webhook signature test keeps the real exception class, PDF task tests patch where the name is looked up (TEST-1).
- `ClientFactory.phone` stays within `Client.phone`'s `max_length=20`; Postgres rejected the longer Faker values that SQLite accepted (TEST-1).
- Dropped `libgdk-pixbuf2.0-0` from the CI test job and `backend/Dockerfile`: the package is gone from Ubuntu 26.04 and the slim base image, and WeasyPrint 60 does not use it (OPS-1).

### Removed
- `TestInvoiceViews`: tests for the dead server-rendered invoice views (TEST-1, LEAN-1).
- `backend/fixtures/sample_data.json`: its only user had a placeholder password hash and could never log in (OPS-11).
- `backend/.env.example` (merged into the root file), stray `Untitled` file (Figma link moved to `docs/DESIGN.md`), empty `FreelanceFlow/` directory.
