# API Reference

Base URL: `http://localhost:8000` in development (the Vite dev server on `:3000` proxies `/api`).

**Auth:** `Authorization: Token <token>` (returned by login/signup) or a Django session cookie. Every endpoint except login, signup, password reset and the Stripe webhook requires authentication. Moving to session cookies is proposed in [ADR-0002](adr/0002-auth-session-cookies.md).

**Pagination:** list endpoints return `{count, next, previous, results}` with 20 items per page (`?page=N`). The SPA currently ignores `next` ([BUG-7](AUDIT.md#bug-7)).

**Money:** decimal strings (`"1250.00"`). Never parse them with floating point for arithmetic ([DATA-3](AUDIT.md#data-3)).

Routes are defined in `backend/config/urls.py` and each app's `api_urls.py`. Known defects are linked inline; this table describes the code as of 2026-11-15.

## Auth — `apps/accounts/api_urls.py`

| Method | Path | Description | Known issues |
|---|---|---|---|
| POST | `/api/auth/signup/` | Create account (email lower-cased, Django password validators), returns token + user; throttled 5/hour | |
| POST | `/api/auth/login/` | Email + password → token + user (401 on bad credentials); throttled 10/min | [BUG-1](AUDIT.md#bug-1) |
| POST | `/api/auth/logout/` | Deletes the token | |
| GET / PATCH | `/api/auth/user/` | Current user profile and business/invoice settings; `default_currency` limited to the supported list | |
| POST | `/api/auth/logo/` | Upload business logo (multipart `logo`): PNG/JPEG/WebP, ≤ 2 MB, decoded by Pillow; replaces and deletes the old file | |
| POST | `/api/auth/password/reset/` | **Stub: returns 200, sends nothing** | [BUG-6](AUDIT.md#bug-6) |

## Clients — `apps/clients/api_urls.py`

| Method | Path | Description | Known issues |
|---|---|---|---|
| GET | `/api/clients/` | Active clients with `invoice_count`, `total_billed` (sent + overdue + paid), `total_paid`, `outstanding`; `?archived=true` lists archived ones | `?search=` ignored ([BUG-11](AUDIT.md#bug-11)); N+1 ([PERF-1](AUDIT.md#perf-1)) |
| POST | `/api/clients/` | Create client (`email` unique per user) | |
| GET / PATCH / PUT | `/api/clients/{id}/` | Detail / update; `PATCH {"is_archived": true}` is the supported way to retire a client | |
| DELETE | `/api/clients/{id}/` | Only for clients with no invoices and no time logs; 409 otherwise | |

## Invoices — `apps/invoices/api_urls.py`

| Method | Path | Description | Known issues |
|---|---|---|---|
| GET | `/api/invoices/` | List; filters `?status=`, `?client=` | invalid `?client=` → 500 ([BUG-17](AUDIT.md#bug-17)) |
| POST | `/api/invoices/` | Create with nested `items[]` (`description`, `quantity`, `rate`); one transaction; number auto-assigned `INV-YYYY-NNN` per user; `status` is ignored (always `draft`) | [DATA-5](AUDIT.md#data-5) |
| GET / PATCH / PUT | `/api/invoices/{id}/` | Detail / update (items replaced wholesale); `client` must be yours, `status` read-only | same as above |
| DELETE | `/api/invoices/{id}/` | Drafts only (400 otherwise) | |
| POST | `/api/invoices/{id}/send/` | Queues PDF generation + email (drafts and sent only) | [BUG-9](AUDIT.md#bug-9) |
| POST | `/api/invoices/{id}/mark-paid/` | Records a manual full payment; sent or overdue only (400 otherwise) | |
| POST | `/api/invoices/{id}/cancel/` | Cancels a draft, sent or overdue invoice (400 otherwise) | |
| GET | `/api/invoices/{id}/pdf/` | PDF download; `?regenerate=true` re-renders | stale cache ([BUG-9](AUDIT.md#bug-9)) |

**Statuses:** `draft` → `sent` → (`overdue`) → `paid`; `cancelled`. `overdue` is set daily by Celery. Transitions are enforced in `Invoice` model methods and nowhere else ([DATA-2](AUDIT.md#data-2)): `draft|sent→sent`, `sent|overdue→paid`, `draft|sent|overdue→cancelled`.

## Time logs — `apps/time_tracker/api_urls.py` (DRF router)

| Method | Path | Description | Known issues |
|---|---|---|---|
| GET / POST | `/api/time-logs/` | List / create (`client`, `description`, `date`, `hours`; `hourly_rate` optional — `total_amount` is null without it) | |
| GET / PATCH / PUT / DELETE | `/api/time-logs/{id}/` | Detail / update / delete | |

## Dashboard — `apps/dashboard/api_urls.py`

| Method | Path | Description | Known issues |
|---|---|---|---|
| GET | `/api/dashboard/summary/` | Totals: billed, paid, outstanding, overdue, counts | |
| GET | `/api/dashboard/monthly-revenue/` | Revenue per month; `?months=N` | `?months=abc` → 500 ([BUG-17](AUDIT.md#bug-17)) |

## Payments — `apps/payments/urls.py` (not under `/api/`)

| Method | Path | Description | Known issues |
|---|---|---|---|
| POST | `/payments/webhook/` | Stripe webhook (signature-verified, no auth) | [PAY-1](AUDIT.md#pay-1) |
| GET | `/payments/checkout/{invoice_id}/` | Creates a Stripe Checkout session — **not reachable from the SPA, no auth check** | [PAY-2](AUDIT.md#pay-2) |
| GET | `/payments/success/{invoice_id}/`, `/payments/cancelled/{invoice_id}/` | Redirect targets for Checkout (render dead templates) | [PAY-2](AUDIT.md#pay-2), [LEAN-1](AUDIT.md#lean-1) |

Local webhook testing:

```bash
stripe listen --forward-to localhost:8000/payments/webhook/
```

## Background tasks — `apps/invoices/tasks.py`

| Task | Trigger | What it does |
|---|---|---|
| `check_overdue_invoices` | Celery Beat, daily 08:00 UTC | `sent` + past due → `overdue`, queues `send_overdue_reminder` |
| `send_overdue_reminder` | queued by the task above | Emails the client an overdue notice |
| `send_due_soon_reminders` | Celery Beat, daily 08:30 UTC | Emails clients whose invoice is due in 3 days |
| `generate_and_store_pdf` | `POST /send/` | Renders the WeasyPrint PDF and stores it in `pdf_file` |
| `send_invoice_email` | `POST /send/` | Emails the PDF to the client, then marks the invoice `sent` |

Schedules are defined in `backend/config/celery.py` and synced into `django_celery_beat` (editable in the admin).
