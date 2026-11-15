# API Reference

The machine-readable version is [openapi.json](openapi.json), generated from the code (`GET /api/schema/`) and checked in CI. This page adds the behaviour the schema cannot express.

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
| POST | `/api/auth/password/reset/` | Emails a reset link to `FRONTEND_URL/reset-password/<uid>/<token>`; same 200 whether or not the account exists; throttled 5/hour | |
| POST | `/api/auth/password/reset/confirm/` | `{uid, token, new_password}` → sets the password, revokes existing API tokens; 400 on a used, tampered or expired link | |

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
| GET | `/api/invoices/` | List; filters `?status=`, `?client=`, `?search=`, `?page=`, `?page_size=` — all validated (400 on nonsense) | |
| POST | `/api/invoices/` | Create with nested `items[]` (`description`, `quantity`, `rate`); one transaction; number auto-assigned `INV-YYYY-NNN` per user; `status` is ignored (always `draft`); `currency` is frozen from your account setting | [DATA-5](AUDIT.md#data-5) |
| GET / PATCH / PUT | `/api/invoices/{id}/` | Detail / update (items replaced wholesale); `client` must be yours, `status` read-only; `pdf_color` (one of `indigo`, `blue`, `slate`, `emerald`, `rose`, `amber`, `cyan`) and `pdf_template` (one of `professional`, `classic`, `modern`, `minimal`, `bold`, `compact`) stay editable after sending | [DATA-5](AUDIT.md#data-5) |
| DELETE | `/api/invoices/{id}/` | Drafts only (400 otherwise) | |
| POST | `/api/invoices/{id}/send/` | Queues one task: mark sent → render PDF → email (draft, sent or overdue; an overdue invoice stays overdue; 400 without line items; 503 if the queue is unreachable) | |
| POST | `/api/invoices/{id}/mark-paid/` | Settles the remaining balance with a manual payment; sent or overdue only (400 otherwise) | |
| POST | `/api/invoices/{id}/cancel/` | Cancels a draft, sent or overdue invoice (400 otherwise) | |
| POST | `/api/invoices/{id}/duplicate/` | Copies client, lines, tax, discount, notes, currency and colour into a new draft | |
| POST | `/api/invoices/{id}/remind/` | Queues a chaser email: overdue wording when late, due-soon otherwise; sent or overdue only | |
| GET | `/api/invoices/{id}/pdf/` | PDF download in the invoice's `pdf_template` layout and `pdf_color`; `?regenerate=true` re-renders, `?timezone=` formats the dates. The stored copy is dropped on every status or colour change | |

**Statuses:** `draft` → `sent` → (`overdue`) → `paid`; `cancelled`. `overdue` is set daily by Celery. Transitions are enforced in `Invoice` model methods and nowhere else ([DATA-2](AUDIT.md#data-2)): `draft|sent→sent`, `sent|overdue→paid`, `draft|sent|overdue→cancelled`, and `paid→sent|overdue` when a Stripe refund arrives ([PAY-4](AUDIT.md#pay-4)).

## Public invoice page — `apps/invoices/public_views.py` (no authentication)

The token in the URL is the credential; the SPA serves it at `/pay/<token>`. Only `sent`, `overdue` and `paid` invoices resolve — anything else is a 404. All three are throttled at 60/hour per IP ([FEAT-3](AUDIT.md#feat-3)).

| Method | Path | Description |
|---|---|---|
| GET | `/api/public/invoices/{token}/` | The invoice as the client sees it: number, dates, lines, totals, balance, sender name and email |
| GET | `/api/public/invoices/{token}/pdf/` | PDF download |
| POST | `/api/public/invoices/{token}/checkout/` | Starts a Stripe payment: `{url}`; 400 once paid, 503 if Stripe is unavailable |


## Time logs — `apps/time_tracker/api_urls.py` (DRF router)

| Method | Path | Description | Known issues |
|---|---|---|---|
| GET / POST | `/api/time-logs/` | List / create (`client`, `description`, `date`, `hours`; `hourly_rate` optional — `total_amount` is null without it) | |
| POST | `/api/time-logs/bill/` | `{time_logs: [id...], invoice?: id}` → the draft invoice holding those hours. 400 on mixed clients, already-billed logs, a missing hourly rate or a non-draft invoice | |
| GET / PATCH / PUT / DELETE | `/api/time-logs/{id}/` | Detail / update / delete | |

## Dashboard — `apps/dashboard/api_urls.py`

| Method | Path | Description | Known issues |
|---|---|---|---|
| GET | `/api/dashboard/summary/` | Totals: billed, paid, outstanding, overdue, counts | |
| GET | `/api/dashboard/monthly-revenue/` | Revenue per month; `?months=N` (1–120, default 12; 400 otherwise) | |

## Payments — `apps/payments/api_urls.py` (checkout, payments) and `apps/payments/urls.py` (webhook)

| Method | Path | Description | Known issues |
|---|---|---|---|
| POST | `/api/invoices/{id}/checkout/` | Stripe Checkout link for your own sent/overdue invoice: `{url}`. Reuses the open session; 400 on a draft, 503 when Stripe is unconfigured or refuses | |
| POST | `/api/invoices/{id}/payments/` | Record a full or partial payment: `{amount, method?, paid_on?, notes?}`. 400 if it exceeds the balance; the invoice becomes `paid` when nothing is due | |
| POST | `/api/payments/webhook/` | Stripe webhook (signature-verified, no auth): handles `checkout.session.completed`, `charge.refunded`, `checkout.session.expired` | |

Local webhook testing:

```bash
stripe listen --forward-to localhost:8000/api/payments/webhook/
```

## Background tasks — `apps/invoices/tasks.py`

| Task | Trigger | What it does |
|---|---|---|
| `check_overdue_invoices` | Celery Beat, daily 08:00 UTC | `sent` + past due → `overdue`, queues `send_overdue_reminder` |
| `send_overdue_reminder` | queued by the task above | Emails the client an overdue notice |
| `send_due_soon_reminders` | Celery Beat, daily 08:30 UTC | Emails clients whose invoice is due in 3 days |
| `send_invoice` | `POST /send/` | Marks the invoice `sent` (an overdue one stays overdue), renders and stores the PDF, creates the Stripe pay link, then emails the PDF to the client |
| `send_reminder` | `POST /remind/` | Emails the overdue notice when the invoice is late, the due-soon notice otherwise |

Schedules are defined in `backend/config/celery.py` and synced into `django_celery_beat` (editable in the admin).
