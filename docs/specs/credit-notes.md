# Credit notes and voiding with an audit trail (FEAT-4)

**Goal:** correct an invoice that is already out (sent, overdue, or part-paid) without editing or deleting it, and keep a record of why.

**Behaviour**
- `CreditNote(user, invoice, number, amount, reason)`: numbered `CN-<year>-NNN` per user, append-only (no edit, no delete), kept with `PROTECT` like payments.
- `POST /api/invoices/{id}/credit-notes/ {amount, reason}` is allowed on `sent` and `overdue` invoices, for `0 < amount <= amount_due`; `reason` is required. `GET /api/credit-notes/{id}/pdf/` renders it.
- A credit lowers what is owed: `amount_due = total - paid - credited`. The invoice `total` never changes.
- When nothing is due any more the invoice settles through its normal transitions: `paid` if money was received, otherwise `cancelled` (a fully credited invoice with no payments is void).
- `POST /api/invoices/{id}/cancel/` takes an optional `reason`, written to the timeline.
- Every credit and cancellation is an activity event (`credit`, `cancelled`) with who-what-why in `detail`.
- Stripe: a checkout session charges `amount_due` (not `total`), the webhook accepts only a payment equal to `amount_due`, and any change to the balance (payment, credit) drops the stored pay link so a stale amount cannot be paid. This also fixes paying the full total after a deposit.
- Dashboard outstanding and overdue totals subtract credits.

**Non-goals:** crediting paid invoices (that is a refund, already modelled as a negative payment), emailing the credit note, credit balances carried to other invoices, the client list totals (still status-based, as for payments).

**Tests:** over-credit refused; reason required; credit settles an invoice (paid vs cancelled); cross-user 404; Stripe charges the reduced amount and a credit clears the stored link; dashboard outstanding drops.
