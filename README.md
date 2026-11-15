<h1 align="center">FreelanceFlow</h1>

<p align="center">
  <img src="frontend/public/og-image.png" alt="FreelanceFlow: invoicing that gets you paid" width="720">
</p>

<p align="center">
  Invoicing for freelancers: manage clients, track time, send branded PDF invoices, collect Stripe payments, and chase overdue invoices automatically.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Django-5.2-092E20?style=flat-square&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Celery-5-37814A?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

> [!WARNING]
> **Status: feature-complete, not yet deployable.** Phases 0–3 of the 2026-11-15 audit roadmap are done: security and money integrity, broken flows, payments, per-invoice currency, time billing and a public invoice page. What remains is code health, accessibility and the production setup (Docker/TLS, monitoring, backups, session auth). Stripe has only been tested against mocks. Progress is tracked in **[PHASES.md](PHASES.md)**; findings are in **[docs/AUDIT.md](docs/AUDIT.md)**.

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Development](#development)
- [Roadmap: what we're fixing and why](#roadmap-what-were-fixing-and-why)
- [Documentation](#documentation)

## Features

| Area | What works today | Known gaps (audit ID) |
|---|---|---|
| **Invoices** | Line items, fractional quantities, tax and discount rounded to the cent, auto numbers (`INV-2026-001`), statuses Draft → Sent → Overdue → Paid / Cancelled enforced in the model, duplicate, send again, reminders, one currency per invoice | The six templates change the on-screen preview only; the PDF uses one layout and your accent colour ([BUG-16](docs/AUDIT.md#bug-16)) |
| **Clients** | Profiles, archive instead of delete, server-side search, per-client billed / paid / outstanding totals | |
| **Time tracking** | Timer and manual entries, optional hourly rate, bill selected entries onto a new draft invoice | Fixed-price work has to be invoiced by hand (no rate to bill) |
| **PDF** | WeasyPrint PDF with logo, business and bank details, status, due date and your chosen accent colour | Logo breaks PDFs on S3 ([BUG-18](docs/AUDIT.md#bug-18), Phase 5) |
| **Email & reminders** | One send pipeline (mark sent, render PDF, email), manual and scheduled reminders, retries with backoff, emails link to the client page | With Redis down, "Send" hangs instead of failing ([OPS-9](docs/AUDIT.md#ops-9)) |
| **Payments** | Stripe Checkout from the app and from the client page, deposits and instalments, refunds mirrored, replay-safe webhook | Only tested against mocks; no live Stripe run yet |
| **Client page** | `/pay/<token>`: no account, shows one invoice, downloads the PDF, pays | The link is permanent and cannot be revoked |
| **Dashboard & reports** | Revenue from money received, outstanding after deposits, monthly chart, error and retry states | Totals add different currencies together ([FEAT-4](docs/AUDIT.md#feat-4)) |
| **Accounts** | Email + password signup/login, working password reset, business profile, logo, currency, throttled auth | API tokens never expire ([SEC-5](docs/AUDIT.md#sec-5), Phase 5) |

## Quick start

**Prerequisites:** Python 3.12 (pinned in `.python-version`, Dockerfile and CI; 3.13 also works with Django 5.2), Node.js 20+. Redis is only needed for Celery (email/PDF/reminders). WeasyPrint needs Pango; on Windows install the [GTK runtime](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows).

```bash
git clone https://github.com/<you>/freelanceflow.git
cd freelanceflow
cp .env.example .env              # defaults use SQLite and print emails to the console

# Backend: http://localhost:8000
cd backend
python -m venv venv
venv\Scripts\activate             # macOS/Linux: source venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo        # demo account with realistic data (see below)
python manage.py runserver

# Frontend: http://localhost:3000 (new terminal)
cd frontend
npm install
npm run dev
```

Log in with **`demo@freelanceflow.dev` / `demo-pass-2026`**. The demo account has 6 clients (one archived), 19 invoices over the last 8 months in every status (paid, sent, overdue, draft, cancelled), 11 payments and 16 time logs. Re-create it any time with `python manage.py seed_demo --reset`. All demo client emails use `example.com`, so reminders can never reach a real person.

Optional background worker (needs Redis):

```bash
# backend/, with the venv active
celery -A config worker -l info --pool=solo           # --pool=solo is required on Windows
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Docker (development)

```bash
cp .env.example .env              # set USE_SQLITE=False and DB_HOST=db to use the compose Postgres
docker compose up --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py seed_demo
```

| Service | URL |
|---|---|
| React SPA | http://localhost:3000 |
| Django API | http://localhost:8000/api/ |
| Django admin | http://localhost:8000/admin/ (`python manage.py createsuperuser`) |

`docker-compose.prod.yml` does not deploy the app correctly yet ([OPS-3](docs/AUDIT.md#ops-3), Phase 5).

## Architecture

```mermaid
flowchart LR
  SPA["React SPA<br/>Vite · Tailwind"] -->|"REST /api (Token)"| API["Django + DRF"]
  API --> DB[(PostgreSQL / SQLite)]
  API -->|queue| Redis[(Redis)]
  Redis --> Worker["Celery worker"]
  Beat["Celery Beat<br/>08:00 overdue · 08:30 due-soon"] --> Redis
  Worker --> PDF["WeasyPrint PDF"]
  Worker --> Mail["SMTP / SendGrid"]
  Stripe["Stripe"] -->|webhook| API
  PDF --> Storage[("Local media / S3")]
```

```mermaid
erDiagram
  USER ||--o{ CLIENT : owns
  USER ||--o{ INVOICE : issues
  USER ||--o{ TIMELOG : logs
  CLIENT ||--o{ INVOICE : billed
  CLIENT ||--o{ TIMELOG : "work for"
  INVOICE ||--|{ INVOICEITEM : contains
  INVOICE ||--o| PAYMENT : "paid by"
  INVOICE ||--o{ TIMELOG : "bills (optional)"
```

All primary keys are UUIDs; money fields are `Decimal(10,2)`; every record is scoped to its owning user. The backend also contains server-rendered Django views whose templates don't exist; they are dead code scheduled for removal ([ADR-0001](docs/adr/0001-api-only-backend.md)).

## Project structure

```
freelanceflow/
├── backend/                  Django project (run commands from here)
│   ├── config/               settings/{base,local,production}.py, urls.py, celery.py
│   ├── apps/
│   │   ├── accounts/         custom User, auth API, `seed_demo` command
│   │   ├── clients/          Client CRUD API
│   │   ├── invoices/         Invoice + items, numbering, totals, PDF, Celery tasks
│   │   ├── payments/         Payment model, Stripe webhook
│   │   ├── time_tracker/     TimeLog API
│   │   └── dashboard/        summary and chart aggregates
│   ├── templates/invoices/   invoice_pdf.html + email templates
│   └── tests/                pytest + factory_boy
├── frontend/                 React SPA
│   └── src/{api,context,pages,components,hooks,utils}
├── docs/                     AUDIT.md, API.md, DESIGN.md, adr/
├── PLAN.md · BACKLOG.md      product boundaries · the short "now / next" queue
├── PHASES.md                 full roadmap and progress tracker
├── MEMORY.md · SESSIONS.md   lessons and decisions · session handoff log
├── AGENTS.md / CLAUDE.md     guide for AI agents and new contributors
├── .claude/                  agent rules (code style, security) and enforced permission denies
├── docker-compose.yml        dev stack: web, frontend, db, redis, celery, beat
└── .env.example              every setting, with local-friendly defaults
```

## Development

```bash
# backend/
pytest                                   # tests (config.settings.test, in-memory SQLite)
pytest --cov=apps --cov-report=html      # coverage
flake8 apps && black --check apps && isort --check-only apps

# frontend/
npm run lint
npm test                                 # Vitest
npm run build
```

Conventions, commit format and the definition of done are in [CONTRIBUTING.md](CONTRIBUTING.md). Rules that protect money and data (Decimal everywhere, per-user scoping, status transitions only through model methods) are in [AGENTS.md](AGENTS.md#rules-that-protect-money-and-data).

## Roadmap: what we're fixing and why

The 2026-11-15 audit produced **72 findings**: 8 security, 7 data/money, 4 payments, 18 broken-flow bugs, and 35 covering features, performance, lean code, UX/accessibility, tests and ops. They are grouped into phases. Each phase has exit criteria, and each item has an ID so every commit and PR can be traced back to its finding.

| Phase | Goal | Highlights |
|---|---|---|
| **0 · Baseline** ✅ | Green tests, working CI, honest docs | Fix 9 failing tests, CI paths, frontend lint; test settings; Vitest setup |
| **1 · Security & money** ✅ | No cross-user access; every amount correct to the cent | Scope serializers to the user, require `SECRET_KEY`, validate uploads, throttle auth, protect invoices from cascade delete, lock status transitions, quantize money, atomic writes, idempotent Stripe webhook |
| **2 · Broken flows** ✅ | Every screen does what its label says | Login errors, client totals, currency everywhere, real password reset, pagination, send pipeline, date handling |
| **3 · Core product** ✅ | Bill time, pay online, partial payments | Stripe checkout from the app, pay link in emails, per-invoice currency, time → invoice, public invoice page |
| **4 · Code health** | Less code, current deps, accessible | Delete dead server-rendered UI (~1,000 lines), Django 5.2 LTS, N+1 fixes, code splitting, accessible modal/forms, one brand name |
| **5 · Production** | Secure, observable deploy | Working prod compose + TLS, session-cookie auth, signed S3 URLs, Sentry, backups, Playwright smoke test |
| **6 · Growth** | Features users ask for | Recurring invoices, quotes, credit notes, CSV export, multi-tax |

Details, checkboxes and sizes: **[PHASES.md](PHASES.md)**.

## Documentation

| Document | Purpose |
|---|---|
| [PLAN.md](PLAN.md) | Vision, goals, non-goals, architectural boundaries |
| [BACKLOG.md](BACKLOG.md) | Now / next / later queue: what to pick up next |
| [PHASES.md](PHASES.md) | Full roadmap with exit criteria and progress |
| [MEMORY.md](MEMORY.md) | Small decisions, lessons learned, debugging recipes |
| [SESSIONS.md](SESSIONS.md) | Handoff log between sessions; open questions |
| [docs/AUDIT.md](docs/AUDIT.md) | Every finding: problem, location, fix, severity |
| [docs/API.md](docs/API.md) | REST endpoints, Celery tasks, known issues per endpoint |
| [docs/DESIGN.md](docs/DESIGN.md) | Figma source, UI conventions, open design decisions |
| [docs/adr/](docs/adr/) | Architecture decision records |
| [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) | Commands, layout, invariants and gotchas for agents and new contributors |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow, commit format, definition of done |
| [.claude/rules/](.claude/rules/) | Code style and security rules for agents (enforced denies in `.claude/settings.json`) |
| [SECURITY.md](SECURITY.md) | Reporting vulnerabilities; known open security issues |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes |

## License

MIT, see [LICENSE](LICENSE).
