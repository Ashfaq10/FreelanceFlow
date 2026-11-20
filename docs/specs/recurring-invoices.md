# Recurring invoices (FEAT-4)

**Goal:** a retainer client is invoiced every month without the owner re-typing the invoice.

**Behaviour**
- A `RecurringInvoice` is a schedule plus a template: client, `frequency` (weekly, monthly, quarterly, yearly), `start_date`, optional `end_date`, `net_days` (payment terms), `auto_send`, tax rate, notes, PDF look, and its own line items (with optional per-line tax).
- A daily Celery Beat task (06:00) creates an invoice for every active schedule whose `next_run` is today or earlier, dated now with `due_date = now + net_days`, then moves `next_run` forward. The invoice records which schedule made it (`Invoice.recurring_source`) and its timeline says so.
- Exactly one invoice per run: the schedule row is locked and advanced in the same transaction, so a retried or concurrent task cannot bill twice. If the system was down for several periods, one invoice is made and `next_run` jumps to the next future date (no flood of back-dated invoices).
- Months are anchored to the start day: Jan 31 -> Feb 28 -> Mar 31.
- A schedule past its `end_date` deactivates itself; so does one whose client was archived. Pause and resume with `is_active`.
- `auto_send`: the new invoice is queued for sending (subject to the verified-email gate); otherwise it stays a draft for review.
- API: `/api/recurring/` list/create/get/update/delete, scoped to the caller; the client must be the caller's. Deleting a schedule keeps the invoices it made.
- SPA: a "Recurring" page to list, pause/resume, delete and create schedules.

**Non-goals:** per-run price changes, proration, usage-based lines, "run now", catching up missed periods one by one, end after N runs.

**Tests:** creates one invoice with copied lines and totals; due date from net days; month-end anchor; idempotent re-run; downtime makes one; end date and archived client deactivate; cross-user client rejected; auto_send queues and respects the gate; not-due and paused skipped.
