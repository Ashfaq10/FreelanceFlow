# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). Reference the [audit](docs/AUDIT.md) ID in each entry.

## [Unreleased]

### Security
- The SPA signs in with an HttpOnly session cookie plus a CSRF header instead of a never-expiring token in `localStorage`. Login/signup no longer return a token; `TokenAuthentication` and `rest_framework.authtoken` are gone; unauthenticated requests answer 401; a password reset now ends every other session (SEC-5).

### Changed
- Production stack: `docker-compose.prod.yml` builds `./backend`, runs `migrate` as a release step, and puts Caddy in front (SPA from a multi-stage `frontend/Dockerfile`, `/api` `/admin` `/static` proxied, automatic TLS). `nginx.conf` is gone; `.env.prod.example` documents every variable and replaces the undocumented `.env.prod.db`. The backend image runs `collectstatic` with production settings, and both images get a `.dockerignore`; CI builds the proxy image too (OPS-3, OPS-4, OPS-5).

### Fixed
- PDF download and send no longer crash for users with a logo on S3 storage: the logo is inlined as a `data:` URI instead of read from a local path (BUG-18).
- Production file URLs are signed and expire after an hour; the bucket can stay private (SEC-6).
- `POST /invoices/{id}/send/` and `/remind/` returned nothing for minutes when Redis was down; they now probe the broker and answer 503 (`config.celery.broker_reachable`) (OPS-9, part).

### Added
- Sentry for backend and SPA, switched on by `SENTRY_DSN` / `VITE_SENTRY_DSN` (no DSN, no Sentry); production logs are one JSON object per line; a React render crash shows a retry page instead of a blank screen (OPS-9).
- `GET /healthz/` reports database and broker status (200 or 503); the prod compose `web` healthcheck uses it (OPS-9, part).

### Added
- Accessibility guard: `eslint-plugin-jsx-a11y` runs in `npm run lint`, so unlabelled controls and icon-only buttons fail CI.
- OpenAPI schema: `GET /api/schema/` and a committed `docs/openapi.json` covering all 27 endpoints. A backend test fails when the file is stale, and a frontend test fails when the API stops offering a field the SPA reads (the BUG-2 class of bug).
- `config/settings/test.py`: in-memory SQLite by default, Postgres via `TEST_DATABASE_URL`; MD5 hasher, locmem email, eager Celery, temp media dir (TEST-2).
- Frontend tests: Vitest + React Testing Library + MSW, `npm test`, first test covers `api/client.js` token and 401/500 handling (TEST-4).
- CI frontend job (`npm ci`, lint, test, build) (OPS-1, TEST-4).
- `backend/pyproject.toml` black config (line length 120, single quotes kept) and `.git-blame-ignore-revs` (OPS-2).
- Password reset that works: `POST /api/auth/password/reset/` emails a tokenised link, `POST /api/auth/password/reset/confirm/` sets the password, and `/reset-password/:uid/:token` is a real page. The old endpoint returned 200 and sent nothing (BUG-6).
- Pagination that works: lists have page controls bound to `?page=`, the API accepts `?page_size=` (max 200), and screens that need every row (client selects, time-log totals) follow `next` through `fetchAllPages` (BUG-7).
- Stripe payment links reachable from the product: authenticated `POST /api/invoices/{id}/checkout/`, a "Payment Link" button on sent and overdue invoices, and the link created at send time so the email's "Pay now" button finally renders. The old checkout view had no authentication at all (PAY-2).
- Partial payments: record a deposit or instalment against an invoice (`POST /api/invoices/{id}/payments/`), see what is paid and what is still due, and have the invoice settle itself once the balance reaches zero. Dashboard revenue now counts money received instead of the totals of invoices flagged paid (PAY-3).
- Each invoice stores the currency it was written in. Switching the account from USD to EUR no longer re-renders and re-charges every past invoice in EUR with the same numbers (DATA-7).
- Tracked hours can be invoiced: tick the entries in the time tracker, press "Bill N entries", and they become a draft invoice (one line per entry, hours × rate) with the logs marked billed and linked. They can also be appended to an existing draft for the same client (FEAT-1).
- Stripe refunds are mirrored in the ledger: `charge.refunded` books a negative payment and puts the invoice back to sent or overdue, and `checkout.session.expired` drops the dead pay link. Redelivered events and second refunds only book the difference (PAY-4).
- Invoice actions that were missing: duplicate into a fresh draft, send again, send a reminder (overdue wording when late, due-soon otherwise) and cancel — all from the invoice menu. Re-sending an overdue invoice no longer pretends it is current again (FEAT-2).
- Sign in, sign up, forgot and reset password share one new design: a sample invoice that goes from sent to paid beside a plain, left-aligned form. The old login had an outlined headline overlapping its own icon, a grid overlay and a gradient; sign up looked like a different product. Labels are now linked to their inputs, errors are announced to screen readers, and the submit button is solid.
- Link preview card (`frontend/public/og-image.png`, 1200×630) and Open Graph/Twitter tags, so a shared link shows the project name, tagline and a dashboard shot instead of a bare URL.
- Invoice emails and reminders retry with exponential backoff (5 attempts) when the mail server refuses the connection, instead of being dropped (OPS-9, part).
- Clients get their own invoice page: every invoice carries a secret token behind `/pay/<token>`, where the client can read the invoice, download the PDF and pay — no account, no login. The invoice email, the due-soon reminder and the overdue notice all link to it, and the owner can copy the link from the invoice menu (FEAT-3).
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
- Accessibility pass (axe-core, 0 violations on 9 screens × light/dark × 6 templates): the invoice preview is white paper in dark mode (dark text was on a dark card), low-contrast greys and brand text fixed for both themes, named the remaining icon buttons and the timer's client select, labelled the two `nav` landmarks, card titles are `h2`, the Reports donut is hidden from screen readers and replaced by a text list. Tailwind now defines the `/3 /4 /6 /8` opacity steps the dark theme used, which were silently dropped (card footers stayed light in dark mode).
- The invoice template picker now changes the PDF too, not just the preview. The choice is saved on the invoice (`pdf_template`: professional, classic, modern, minimal, bold, compact), stays editable after sending, and applies to the downloaded and emailed PDF (BUG-16).
- Backend runs on Django 5.2 LTS (4.2 is out of support) with `STORAGES` settings, and Python dependencies are locked: edit `requirements.in`, compile `requirements.txt`. CI now fails when models and migrations disagree; the one existing drift (`User.bank_details`) has its migration (OPS-7).
- Dashboard and Reports charts show data: amounts arrive as strings and the chart library plotted nothing, so the revenue chart was empty and the bar chart drew every month at full height with axis labels like `$1k $1k $1k $0k`. Axis labels are compact (`$3K`) (BUG-19).
- Layouts fixed at tablet and phone widths: stat cards no longer overlap their icons, the clients list stacks on phones, the invoice and time-log tables fit at 768 px, the new-invoice form wraps, the donut is no longer clipped, and "New Invoice" no longer appears twice (BUG-19).
- The invoice preview and form say "Due Date" instead of "Payment Date", and the default Indigo colour shows up in the colour picker (BUG-19).
- Frontend tooling: ESLint 9 flat config and Prettier (`npm run format`); CI, `scripts/check.sh` and pre-commit check formatting. The whole `src/` was reformatted once (OPS-8).
- Big components split by job: one file per invoice template, one per Settings tab, and separate line-item and summary pieces for the invoice form and a timer and modal for the time tracker. No behaviour change (LEAN-5).
- One theme setting for the whole app: light, dark or follow-the-system, remembered, applied before the page paints, and the same from the header toggle, the sign-in pages and Settings (UX-5).
- Unknown addresses show a "Page not found" page with a way home instead of a blank screen (UX-3).
- Screen readers and keyboards: form labels are tied to their fields, invoice numbers are links you can Tab to, and icon-only buttons have names (UX-2).
- Dialogs are accessible: they are announced with their title, close on Escape, keep keyboard focus inside while open and give it back afterwards (UX-1).
- The app loads 267 KB of JavaScript up front instead of 860 KB: every page loads on demand, and the chart library only when you open the Dashboard or Reports (PERF-2).
- The client list runs a fixed number of queries instead of three per client (14 clients: 58 queries down to 10) (PERF-1).
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
- Removed controls that did nothing (the always-on notification bell, the "Pro Plan" card, the Notifications settings tab); Settings → Appearance now really switches the theme; the "New Invoice" button label shows on screens 480 px and wider (UX-4).
- Frontend dead code removed: one shared `StatusBadge` instead of four copies, an unused hook, API helpers that called endpoints that do not exist, an unused dev proxy and alias, and the duplicate Inter font request (LEAN-4).
- Dead backend helpers removed: `format_currency`, the `abs_value` template filter, `Invoice.days_until_due` and Celery's `debug_task` (LEAN-3).
- Unused packages: `sendgrid` (mail goes through SMTP), `@types/react` and `@types/react-dom` (no TypeScript) (LEAN-2).
- The unused server-rendered Django UI is deleted (about 1,000 lines), along with allauth and crispy forms. Those pages answered 500 because their templates never existed. The Stripe webhook is now `POST /api/payments/webhook/` — update the URL in the Stripe dashboard (LEAN-1).
- `TestInvoiceViews`: tests for the dead server-rendered invoice views (TEST-1, LEAN-1).
- `backend/fixtures/sample_data.json`: its only user had a placeholder password hash and could never log in (OPS-11).
- `backend/.env.example` (merged into the root file), stray `Untitled` file (Figma link moved to `docs/DESIGN.md`), empty `FreelanceFlow/` directory.
