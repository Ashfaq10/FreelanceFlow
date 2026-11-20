# Account data export, deletion, and email verification (FEAT-4)

**Goal:** a user can take their data with them, close their account, and prove the address they sign up with.

**Export**
- `GET /api/auth/export/` returns one JSON attachment with the profile, clients, invoices (items, payments, credit notes, activity) and time logs, all scoped to the caller. No files (logo, stored PDFs) are inlined.

**Deletion** (`POST /api/auth/delete/ {password}`, current password required)
- This is erasure of the person, not of the books. AGENTS.md forbids hard-deleting accounting records, and the invoice terms tell clients to keep them for five years, so issued invoices, payments, credit notes and the clients they name stay, owned by an inert account.
- What goes: the profile (name, business details, address, phone, tax number, bank details, website, logo file, terms), the email (replaced by an unusable `deleted-<id>@deleted.invalid`), the password, all sessions, draft invoices, time logs, clients with no invoices, and every stored invoice PDF. Reminders are switched off. The public pay link of a retained invoice keeps working and shows "Deleted account".
- Irreversible. There is no grace period.

**Email verification**
- `User.email_verified`; existing users are migrated as verified. Signup sends a link `FRONTEND_URL/verify-email/<token>` (signed, 3 days, bound to the address); `POST /api/auth/verify-email/ {token}` confirms, `POST /api/auth/verify-email/resend/` sends it again (throttled).
- Until verified, `POST /api/invoices/{id}/send/` answers 403: the app must not mail clients on behalf of an address nobody has confirmed. Everything else works. `EMAIL_VERIFICATION_REQUIRED=False` switches the gate off (the Playwright smoke does, because it cannot read mail).
- The SPA shows a banner with a "Resend" button until verified.

**Non-goals:** changing the email address, a deletion grace period, anonymising client PII inside retained invoices, exporting binary files.

**Tests:** export is scoped and complete; deletion needs the password, keeps invoices with payments, removes drafts/time logs/empty clients, blocks login and ends sessions; token tamper/expiry; gate on send; resend throttled.
