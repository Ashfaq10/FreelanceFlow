# Per-user invoice number prefix (FEAT-4)

**Goal:** numbers read `ACME-2026-007` instead of the hard-coded `INV-2026-007`.

**Behaviour**
- `User.invoice_prefix`, default `INV`, 1-10 letters or digits, stored upper-case. Edited under Settings → Invoicing; exposed on `/api/auth/user/`.
- New invoices are numbered `<prefix>-<year>-NNN`. The counter is per user, prefix and year, so switching prefix starts again at 001 and past invoices keep their numbers.
- Duplicate numbers stay impossible: the existing `(user, invoice_number)` constraint and retry loop still apply.

**Non-goals:** free-form formats, hyphens in the prefix (the sequence is parsed after the last `-`), renumbering old invoices.

**Tests:** custom prefix is used; counter is independent per prefix; invalid prefix is a 400; stored upper-case.
