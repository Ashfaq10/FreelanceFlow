# Activity timeline per invoice (FEAT-4)

**Goal:** the owner can see what happened to an invoice and when, without digging through email: created, sent, viewed by the client, reminded, paid in part or full, refunded, overdue, cancelled.

**Behaviour**
- `InvoiceEvent(invoice, kind, detail, created_at)`, append-only: nothing in the API edits or deletes events. Deleting a draft invoice removes its events with it (the only hard delete the product allows).
- Written where the thing happens, not from the UI:
  - `created`: `Invoice.save()` on insert (covers the API, duplicate and time billing).
  - `sent`: `send_invoice` after the email left, so a retried task logs once per successful send. `reminder`: after a reminder email left.
  - `paid`, `overdue`, `cancelled`: the model transition methods.
  - `payment`, `refund`: `record_payment` and the Stripe refund handler.
  - `viewed`: the public invoice page, at most once an hour per invoice (a refresh must not flood the log).
- `GET /api/invoices/{id}/` carries `activity`, oldest first. The invoice detail screen shows it as a timeline.

**Non-goals:** per-field edit history, who-did-what for multiple users (single-owner product), exposing events to the client.

**Tests:** each producer writes exactly one event; viewing twice within the hour logs once; a failed email logs no `sent`; another user's invoice never leaks events.
