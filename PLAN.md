# Product Plan

The shape of the product. Read before proposing features or architecture; if a change contradicts this file, change this file first (in its own PR) or don't make the change.

## Vision

A solo freelancer goes from tracked work to money in the bank without spreadsheets: log time → invoice → client pays online → reminders chase late payers automatically.

## Users

- **Primary:** solo freelancers and one-person studios (designers, developers, consultants) billing 5–50 clients, 5–100 invoices a month, in one currency per invoice.
- **Secondary:** their clients, who only receive emails, view an invoice and pay. Clients never get accounts.

## Goals (in priority order)

1. **Correct money.** Every amount right to the cent, every payment recorded once, no record silently lost.
2. **Private by default.** A user can never see or change another user's data.
3. **Fast path to paid.** Create and send an invoice in under 2 minutes; client pays in 2 clicks from the email.
4. **Zero-touch follow-up.** Overdue detection and reminders run without the user doing anything.
5. **Cheap to run.** One small server: Django + Postgres + Redis + Celery behind nginx.

## Non-goals

Say no to these unless this file is changed first:

- Teams, roles, multi-user workspaces, approvals.
- Full accounting: double-entry ledger, bank feeds, payroll, expense management, tax filing.
- Client portals with logins (a tokenized public invoice page is enough).
- Native mobile apps (responsive web only).
- Payment providers other than Stripe; crypto.
- Multi-tenant white-labelling or a public API for third parties.
- Real-time collaboration, chat, comments.

## Boundaries (current architecture)

| Boundary | Decision | Record |
|---|---|---|
| UI | React SPA is the only UI; Django serves `/api/**`, `/admin/`, webhook | [ADR-0001](docs/adr/0001-api-only-backend.md) |
| Auth | Email + password; moving to HttpOnly session cookies | [ADR-0002](docs/adr/0002-auth-session-cookies.md) |
| Money | `Decimal(10,2)`, half-up rounding to cents, computed on the server only | [AGENTS.md](AGENTS.md#rules-that-protect-money-and-data) |
| Currency | One currency per invoice (fixed at creation); no FX conversion | [DATA-7](docs/AUDIT.md#data-7) |
| Payments | Stripe Checkout + webhooks; manual payments recorded by the user | [PAY-1](docs/AUDIT.md#pay-1), [PAY-2](docs/AUDIT.md#pay-2) |
| Background work | Celery + Redis; every task idempotent and retryable | [OPS-9](docs/AUDIT.md#ops-9) |
| Records | Invoices with payments and clients with invoices are never hard-deleted | [DATA-1](docs/AUDIT.md#data-1) |
| Hosting | Single Docker Compose stack; S3 for files in production | [OPS-3](docs/AUDIT.md#ops-3) |

## Success measures

- 0 open `Must` findings in [docs/AUDIT.md](docs/AUDIT.md) before the first production deploy.
- Invoice-to-paid median under 14 days for the demo flow (measured once payments ship).
- CI green on `main` at all times after Phase 0.

## Where things live

| Question | File |
|---|---|
| Why does this exist, what won't we build? | this file |
| What are we doing right now? | [BACKLOG.md](BACKLOG.md) |
| What is the whole roadmap? | [PHASES.md](PHASES.md) |
| What is broken and why? | [docs/AUDIT.md](docs/AUDIT.md) |
| What did we learn / decide in small? | [MEMORY.md](MEMORY.md) |
| Where did the last session stop? | [SESSIONS.md](SESSIONS.md) |
