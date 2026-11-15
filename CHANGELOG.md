# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). Reference the [audit](docs/AUDIT.md) ID in each entry.

## [Unreleased]

### Added
- `config/settings/test.py`: in-memory SQLite by default, Postgres via `TEST_DATABASE_URL`; MD5 hasher, locmem email, eager Celery, temp media dir (TEST-2).
- Frontend tests: Vitest + React Testing Library + MSW, `npm test`, first test covers `api/client.js` token and 401/500 handling (TEST-4).
- CI frontend job (`npm ci`, lint, test, build) (OPS-1, TEST-4).
- `backend/pyproject.toml` black config (line length 120, single quotes kept) and `.git-blame-ignore-revs` (OPS-2).
- Password reset that works: `POST /api/auth/password/reset/` emails a tokenised link, `POST /api/auth/password/reset/confirm/` sets the password, and `/reset-password/:uid/:token` is a real page. The old endpoint returned 200 and sent nothing (BUG-6).
- Pagination that works: lists have page controls bound to `?page=`, the API accepts `?page_size=` (max 200), and screens that need every row (client selects, time-log totals) follow `next` through `fetchAllPages` (BUG-7).
- Stripe payment links reachable from the product: authenticated `POST /api/invoices/{id}/checkout/`, a "Payment Link" button on sent and overdue invoices, and the link created at send time so the email's "Pay now" button finally renders. The old checkout view had no authentication at all (PAY-2).
- `python manage.py seed_demo [--reset]`: demo account with 6 clients, 19 invoices across all statuses, payments and time logs over the last 8 months (OPS-11). Refuses to run unless `DEBUG=True`, since the demo password is public.
- Agent guardrails: [.claude/rules/](.claude/rules/) (code style, security) and `.claude/settings.json` deny rules; [PLAN.md](PLAN.md), [BACKLOG.md](BACKLOG.md), [MEMORY.md](MEMORY.md), [SESSIONS.md](SESSIONS.md).
- Project tracking docs: [PHASES.md](PHASES.md) roadmap, [docs/AUDIT.md](docs/AUDIT.md) findings, [docs/API.md](docs/API.md), [docs/DESIGN.md](docs/DESIGN.md), [ADRs](docs/adr/), [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), PR template.
- `backend/static/.gitkeep` so fresh clones pass Django's `staticfiles.W004` check.

### Security
- Invoice and time-log writes only accept clients and invoices owned by the caller; a cross-user id now returns 400 instead of attaching (and emailing) someone else's client (SEC-1).
- Invoice `status` is read-only over the API: `POST {"status": "paid"}` no longer creates revenue without a payment. Transitions are enforced in the model (`draft→sent`, `sent|overdue→paid`, `draft|sent|overdue→cancelled`) and illegal ones return 400 (DATA-2).
- `config.settings.production` refuses to start without `SECRET_KEY` and `ALLOWED_HOSTS` (no more published-default fallback) and trusts `X-Forwarded-Proto`, so `SECURE_SSL_REDIRECT` cannot loop behind a TLS proxy (SEC-2).
- Deleting a client no longer cascades to its invoices, payments and revenue: `Invoice.client` is `PROTECT`, the API answers 409 when invoices exist, and the SPA offers "Archive Client" instead (DATA-1).
- The Stripe webhook is replay-safe: it verifies `payment_status` and the amount against the invoice total, records at most one payment per invoice (`update_or_create` inside a locked transaction) and stores `Decimal` cents. A redelivered event used to raise `IntegrityError` → 500, so Stripe retried for days (PAY-1).
- Logo uploads are decoded with Pillow and must be PNG, JPEG or WebP; an SVG with a script or HTML named `.png` is rejected instead of being served from `/media/`. The previous logo file is deleted (SEC-3).
- Auth endpoints are throttled (login 10/min, signup 5/hour), signup runs Django's password validators, emails are stored lower-case, and a signup race returns 400 instead of 500 (SEC-4).
- `default_currency` is a `ChoiceField`: `PATCH {"default_currency": "ZZZ"}` is rejected instead of stored and rendered on every invoice (SEC-8).
- `django-debug-toolbar` is a dev-only dependency; it is no longer installed into the production image (SEC-7).

### Changed
- Line quantities accept fractions (0.5 h is valid; `0` is not). Discounts must be between zero and the subtotal, tax between 0 and 100%, and the SPA sends decimal strings with `step="0.01"` instead of `parseInt`-ing quantities down (DATA-5).
- The SPA previews unsaved drafts in integer cents (`utils/money.js`) and displays the server's `line_total` for saved items, so the live total and the saved invoice agree to the cent (DATA-3, frontend half).
- Invoice create and update run in one transaction and insert items with `bulk_create`; a failed item write no longer leaves a numbered invoice with no items or a zero total. Totals are recomputed once per write instead of once per item, and the `InvoiceItem` signals are gone (DATA-4).
- Money is quantized to the cent with `ROUND_HALF_UP` before it is stored (`to_cents`), so `subtotal - discount + tax == total` always holds; Django's half-even rounding on save no longer loses a cent (DATA-3, backend half).
- `POST /api/invoices/{id}/cancel/` cancels a draft, sent or overdue invoice (DATA-2).
- CI runs backend jobs from `backend/`, tests against the Postgres service, builds the image from `./backend`, and pins flake8/black/isort (OPS-1, OPS-2).
- Backend formatted with black and isort; flake8 clean. `logout_view` catches `Token.DoesNotExist` instead of a bare `except` (OPS-2).
- Frontend lint clean: fetch-on-mount effects declare their dependencies; unused code removed (OPS-2).
- Celery defaults to `config.settings.local`, like `manage.py` (OPS-12).
- Dev tooling: `scripts/check.sh` runs every CI check locally (`--pg` for Postgres), pre-commit hooks for black/isort/flake8/eslint, and `npm audit` in CI (Dependabot was removed: one branch policy).
- `.gitignore` anchors `lib/`/`lib64/` to `/backend/` (OPS-13).
- README rewritten to match the code: correct ports and commands, honest project status, links to the roadmap (OPS-10).
- Single root `.env.example` covering SQLite/Postgres, SMTP/SendGrid, Stripe and S3 (OPS-6).

### Fixed
- A wrong password shows "Invalid email or password" instead of silently reloading the login page; the global 401 handler now redirects only for authenticated requests outside `/api/auth/*` (BUG-1).
- Client screens show real money: the API returns `total_billed`, `total_paid` and `outstanding` under the names the SPA reads, instead of always rendering $0.00 (BUG-2).
- Time logs save without an hourly rate, as the "optional" label promised; `total_amount` is empty for those entries (BUG-3).
- Money is shown in the user's currency everywhere: six screens, all six invoice templates, both chart axes and the three emails used to print `$` regardless of the account setting (BUG-5).
- "Mark Paid" appears on overdue invoices, not only sent ones (BUG-4).
- Sending an invoice is one task — mark sent, render the PDF, email it — so the status is never left at `draft` with the client already emailed, and the stored PDF no longer keeps its DRAFT look after payment. The button now says "Queued" (BUG-9).
- Delete is offered only on drafts, and every invoice action shows the API's own error text instead of a generic failure (BUG-10).
- Client search filters on the server across name, company and email; it did nothing before (BUG-11).
- "Create invoice" from a client page preselects that client (BUG-12).
- Time-log dates keep the day you picked west of UTC, and the date field defaults to your local today, not UTC's (BUG-13).
- Reports no longer shows `NaN%`/`Infinity%` before the first invoice is billed (BUG-14).
- A failed load shows an error with a Try again button instead of "No invoices yet"; the Dashboard keeps the parts that loaded and an unreachable API no longer bounces you to the login screen (BUG-15).
- Invoice PDFs label the due date "Due Date", only call themselves a receipt once paid, and use the accent colour you pick — which is now stored on the invoice, so the emailed copy matches the one you download (BUG-16).
- Nonsense query params (`?client=foo`, `?months=abc`, `?page=0`) answer 400 instead of 500 (BUG-17).
- A failed profile load no longer logs you out: only a 401 clears the stored token (BUG-8).
- Editing a draft keeps its saved issue and due dates instead of resetting them to today and today + 30 days (DATA-6).
- Backend test suite green: aware datetimes for `Invoice.due_date`, partial-payment test uses real items, webhook signature test keeps the real exception class, PDF task tests patch where the name is looked up (TEST-1).
- `ClientFactory.phone` stays within `Client.phone`'s `max_length=20`; Postgres rejected the longer Faker values that SQLite accepted (TEST-1).
- Dropped `libgdk-pixbuf2.0-0` from the CI test job and `backend/Dockerfile`: the package is gone from Ubuntu 26.04 and the slim base image, and WeasyPrint 60 does not use it (OPS-1).

### Removed
- `TestInvoiceViews`: tests for the dead server-rendered invoice views (TEST-1, LEAN-1).
- `backend/fixtures/sample_data.json`: its only user had a placeholder password hash and could never log in (OPS-11).
- `backend/.env.example` (merged into the root file), stray `Untitled` file (Figma link moved to `docs/DESIGN.md`), empty `FreelanceFlow/` directory.
