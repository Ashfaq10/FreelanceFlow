# Quotes / estimates that convert to invoices (FEAT-4)

**Goal:** send a priced proposal, let the client accept it with one click, and turn it into an invoice without retyping.

**Behaviour**
- `Quote` + `QuoteItem` mirror an invoice's lines, per-line tax and fixed/percent discount, and use the same money code (`apps/invoices/totals.py`). Number `QT-<year>-NNN` per user; currency frozen at creation; `valid_until` defaults to 30 days.
- Statuses: `draft` -> `sent` -> `accepted` | `declined` -> `converted`. A sent quote past `valid_until` is shown as expired and can no longer be accepted.
- Only drafts can be edited or deleted. Sending (`POST /api/quotes/{id}/send/`) queues an email with the PDF and a link, and marks it sent once the email left; it obeys the verified-email gate and answers 503 when the broker is down, like invoices.
- The client opens `/quote/<token>` (no account; the token is the credential, throttled like the invoice page), sees the quote, and accepts or declines. Drafts are never visible there.
- `POST /api/quotes/{id}/convert/` makes a **draft** invoice from a draft, sent or accepted quote: lines, tax, discount, notes, currency copied; the quote becomes `converted` and links to the invoice. Declined and already-converted quotes refuse.
- SPA: a Quotes page (list with send, PDF, copy link, convert, delete), a create/edit form, and the client's public quote page.

**Non-goals:** deposits on acceptance, revisions/versions, e-signatures, auto-expiry notifications, converting to a recurring schedule.

**Tests:** totals equal the invoice maths; edit/delete only while draft; public page hides drafts, accepts once, refuses after expiry; convert copies everything exactly once; cross-user scoping; send gate, 503 and "sent only after the email left".
