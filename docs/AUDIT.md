# Codebase Audit — 2026-11-15

Full-repo audit of FreelanceFlow (Django REST backend, React SPA, Docker/CI). Every finding has a stable ID used by [PHASES.md](../PHASES.md), commit messages and PRs (`fix(invoices): quantize tax (DATA-3)`).

- **Severity:** `Must` = security hole, data loss, or a core flow broken for every user. `Should` = wrong behaviour in a common case, missing test on risky code, real slowness. `Nice` = polish.
- **Status:** a finding is closed when its PHASES.md checkbox is ticked *and* a regression test covers it (where testable). Do not delete closed findings; strike them through and note the PR.
- Line numbers are from commit `eb7b16e` and drift as code changes; search by symbol.

## Baseline measured during the audit

| Check | Result |
|---|---|
| `pytest` (backend, SQLite) | **9 failed / 23 passed** — see [TEST-1](#test-1) |
| `npm run lint` (frontend) | **16 errors, 12 warnings** — see [OPS-2](#ops-2) |
| `black` / `isort` / `flake8` (backend `apps/`) | **64 files to reformat / 14 import-order errors / 154 issues** — see [OPS-2](#ops-2) |
| `npm run build` | passes; single 812 KB JS chunk — see [PERF-2](#perf-2) |
| GitHub Actions CI | cannot pass as written — see [OPS-1](#ops-1) |
| Frontend tests | none exist — see [TEST-4](#test-4) |

## Architecture facts that drive many findings

1. **The SPA is the only real UI.** `frontend/src/api/endpoints.js` calls only `/api/...`. The server-rendered Django views (`views.py`, `urls.py`, `forms.py` in every app) render templates that do not exist (only `invoice_pdf.html` and 3 email templates exist), so every non-API page returns `TemplateDoesNotExist`. ~1,000 lines of dead duplicate code — [LEAN-1](#lean-1).
2. **Stripe checkout lives only on that dead side.** Nothing in the SPA can create a payment link — [PAY-2](#pay-2).
3. **Money is `Decimal` on the backend but recomputed with JS floats in the SPA** — [DATA-3](#data-3).
4. **Settings modules differ per entry point:** `manage.py` → `local`, `wsgi.py` → `production`, `config/celery.py` → `production`. A locally started Celery worker therefore runs with production settings (S3 storage, SSL redirect) — [OPS-12](#ops-12).

---

## Security

### <a id="sec-1"></a>SEC-1 — Cross-tenant foreign keys on invoice and time-log writes
`Must` · Phase 1 · `apps/invoices/serializers.py` (`InvoiceWriteSerializer.client`), `apps/time_tracker/serializers.py` (`client`, `invoice`) · **Done 2026-11-15**: both serializers scope their querysets in `__init__`; `tests/test_scoping.py` covers create, update and read.
**Problem:** `client`/`invoice` are default `PrimaryKeyRelatedField`s over `.objects.all()`. User A can POST an invoice with user B's client UUID; the response then returns B's client email/phone/address and "Send" would email B's client.
**Fix:** In the serializer `__init__`, restrict `fields['client'].queryset` to `request.user.clients.all()` and `fields['invoice'].queryset` to `request.user.invoices.all()`. Test: cross-user POST returns 400.

### <a id="sec-2"></a>SEC-2 — Production can boot with the public default `SECRET_KEY`
`Must` · Phase 1 · `config/settings/base.py:L14`, `config/settings/production.py` · **Done 2026-11-15**: production reads both from the environment with no default and sets `SECURE_PROXY_SSL_HEADER`.
**Problem:** Missing `SECRET_KEY` falls back to `'django-insecure-change-me-in-production'` (published in the repo) → forged sessions and password-reset tokens. No `SECURE_PROXY_SSL_HEADER`, so `SECURE_SSL_REDIRECT=True` behind a TLS-terminating proxy redirects forever.
**Fix:** `SECRET_KEY = os.environ['SECRET_KEY']` in `production.py`; set `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`; parse `ALLOWED_HOSTS` from env with no default.

### <a id="sec-3"></a>SEC-3 — Logo upload trusts the client-sent content type
`Must` · Phase 1 · `apps/accounts/api_views.py` (`upload_logo_view`) · **Done 2026-11-15**: Pillow decodes the upload, PNG/JPEG/WebP only, old file deleted; `tests/test_accounts.py`.
**Problem:** Only `content_type.startswith('image/')` is checked; Pillow validation never runs. An SVG with `<script>` or an HTML file labelled `image/png` is stored and served from `/media/` or S3 → stored XSS / hosted phishing page. Old logos are never deleted.
**Fix:** Validate with `django.forms.ImageField().clean(file)`; allow PNG/JPEG/WebP only; cap size; delete the previous file.

### <a id="sec-4"></a>SEC-4 — Weak auth endpoints
`Must` · Phase 1 · `apps/accounts/api_views.py:L13-75`, `config/settings/base.py` (`REST_FRAMEWORK`) · **Done 2026-11-15**: login 10/min, signup 5/hour, `validate_password`, lower-cased emails, `IntegrityError` → 400; `tests/test_auth.py`. The password-reset stub stays throttle-free until it does something ([BUG-6](#bug-6)).
**Problem:** No throttling on login/signup/reset (brute force). Signup only checks `len >= 8` and skips `AUTH_PASSWORD_VALIDATORS` ("password1" accepted). Emails are not lower-cased, so `Bob@x.com` and `bob@x.com` become two accounts. The exists-then-create race returns 500.
**Fix:** `ScopedRateThrottle` on auth views; `validate_password()`; lower-case email on signup and login; catch `IntegrityError` → 400.

### <a id="sec-5"></a>SEC-5 — Non-expiring tokens stored in `localStorage`
`Should` · Phase 5 · `frontend/src/api/client.js`, `frontend/src/context/AuthContext.jsx`, DRF `TokenAuthentication`
**Problem:** DRF tokens never expire. Any XSS or malicious dependency that reads `localStorage.token` gets permanent API access. "Remember me" on the login page is not wired to anything.
**Fix:** See [ADR-0002](adr/0002-auth-session-cookies.md): HttpOnly `SameSite=Lax` session cookies + CSRF (already configured), or expiring tokens. Remove or implement "Remember me".

### <a id="sec-6"></a>SEC-6 — S3 file URLs are unsigned
`Should` · Phase 5 · `config/settings/production.py:L24`
**Problem:** `AWS_S3_CUSTOM_DOMAIN` disables signed URLs. With a private bucket every PDF/logo link 403s; with a public bucket `invoices/pdfs/INV-2026-001.pdf` is guessable.
**Fix:** Remove `AWS_S3_CUSTOM_DOMAIN`, keep the bucket private, use `querystring_auth` (default) with a short expiry.

### <a id="sec-7"></a>SEC-7 — `django-debug-toolbar` ships in production requirements
`Should` · Phase 1 · `backend/requirements.txt:L10` · **Done 2026-11-15**: dev-only now.
**Problem:** Listed in both `requirements.txt` and `requirements-dev.txt`; installed into the production image.
**Fix:** Remove from `requirements.txt`.

### <a id="sec-8"></a>SEC-8 — `default_currency` accepts any string
`Must` · Phase 1 · `apps/accounts/serializers.py:L6` · **Done 2026-11-15**: `ChoiceField`; `tests/test_accounts.py`.
**Problem:** Declared as a plain `CharField(source='currency')`, which skips model `choices`. `PATCH {default_currency:'JPY'}` is saved and Stripe would charge `total*100` yen (100× too much, JPY is zero-decimal). `'ABCD'` overflows `varchar(3)` → 500 on Postgres.
**Fix:** `serializers.ChoiceField(source='currency', choices=User.CURRENCY_CHOICES, required=False)`.

---

## Data integrity & money

### <a id="data-1"></a>DATA-1 — Deleting a client deletes its paid invoices and payments
`Must` · Phase 1 · `apps/invoices/models.py` (`Invoice.client` `on_delete=CASCADE`), `apps/clients/api_views.py`, `frontend/src/pages/Clients/ClientDetail.jsx` · **Done 2026-11-15**: `PROTECT` + migration 0008, DELETE returns 409 for a client with invoices *or* time logs, SPA archives; `tests/test_clients.py`.
**Problem:** "Delete Client" removes every invoice (including paid), their `Payment` rows and time logs — accounting records gone. The SPA's `clients.archive` calls `/api/clients/{id}/archive/`, which does not exist.
**Fix:** `on_delete=PROTECT` (migration); API delete returns 409 when invoices exist; replace the UI delete with archive (`PATCH {is_archived:true}` already works); add an archived filter.

### <a id="data-2"></a>DATA-2 — Invoice status bypasses the state machine
`Must` · Phase 1 · `apps/invoices/serializers.py` (`InvoiceWriteSerializer.status`), `apps/invoices/api_views.py` (`InvoiceMarkPaidView`) · **Done 2026-11-15**: `status` read-only, transitions enforced in model methods, `POST /api/invoices/{id}/cancel/` added; `tests/test_transitions.py`.
**Problem:** `status` is writable: `POST {status:'paid'}` creates a "paid" invoice with no `Payment` (counted as revenue); `{status:'sent'}` marks sent without emailing. `mark-paid` accepts `draft` and `cancelled`.
**Fix:** Make `status` read-only. Allowed transitions: `draft→sent` (send), `sent|overdue→paid` (mark-paid / webhook), `draft|sent|overdue→cancelled` (new cancel endpoint). Enforce in model methods; test each illegal transition.

### <a id="data-3"></a>DATA-3 — Tax and totals are not rounded explicitly; SPA recomputes with floats
`Must` · Phase 1 · `apps/invoices/models.py` (`calculate_totals`, `InvoiceItem.save`), `frontend/src/components/ui/InvoicePreview.jsx`, `InvoiceCreate.jsx` · **Done 2026-11-15**: backend `to_cents` + `tests/test_money.py`; SPA previews drafts in integer cents (`utils/money.js`) and shows the server's `line_total` for saved items.
**Problem:** `tax_amount = taxable * rate/100` is unquantized; Django rounds each field half-even on save, so subtotal + tax ≠ total (1.25 @ 10% → tax 0.12, total 1.38). The SPA multiplies `quantity * rate` in JS floats (`1.50 × 0.33` → `$0.49` vs server `$0.50`).
**Fix:** Quantize `line_total`, `tax_amount` to `0.01` with `ROUND_HALF_UP`, then `total = taxable + tax_amount`. SPA displays server `line_total`/`subtotal`/`total` and only previews unsaved drafts with integer-cent math.

### <a id="data-4"></a>DATA-4 — Invoice create/update is not atomic
`Must` · Phase 1 · `apps/invoices/serializers.py:L67-100`, `apps/invoices/signals.py` · **Done 2026-11-15**: `transaction.atomic` on create/update, `bulk_create`, one `calculate_totals()`, signals deleted; `tests/test_invoice_writes.py`. The numbering retry still runs outside a savepoint.
**Problem:** Invoice saved first, items after; `update` deletes all items before recreating. A failed item insert leaves a numbered invoice with no items or a 0 total. Each item save fires a signal that recomputes totals (n+1 queries).
**Fix:** `transaction.atomic` on `create`/`update`; `bulk_create` items; call `calculate_totals()` once; drop the per-item signal; wrap the numbering retry in `Invoice.save` in a savepoint.

### <a id="data-5"></a>DATA-5 — Item/amount validation is wrong on both sides
`Must` · Phase 1 · `apps/invoices/serializers.py:L19`, `apps/invoices/models.py`, `frontend/src/pages/Invoices/InvoiceCreate.jsx:L177,L307-316` · **Done 2026-11-15**: `tests/test_invoice_validation.py`; SPA sends decimal strings with `step="0.01"`.
**Problem:** Backend `quantity min_value=1` rejects 1.5 hours; SPA forces `step="1"` and `parseInt`, so 2.5 h × $100 is saved as $200 while the live total showed $250. Negative `discount_amount`/`tax_rate` are accepted (`-50` discount *adds* 50; the PDF hides the row).
**Fix:** `min_value=Decimal('0.01')` on quantity; `MinValueValidator(0)` on discount/tax, tax ≤ 100, discount ≤ subtotal; SPA uses `step="0.01"` and sends decimal strings.

### <a id="data-6"></a>DATA-6 — Editing a draft silently overwrites its dates
`Must` · Phase 1 · `frontend/src/pages/Invoices/InvoiceCreate.jsx:L80-83` · **Done 2026-11-15**: the edit form pre-fills from the saved dates.
**Problem:** `fetchInvoice` resets the form with `issue_date = now` and `due_date = now + 30d`, ignoring the saved values. A draft dated Nov 1/Dec 1 edited on Nov 15 is saved as Nov 15/Dec 15.
**Fix:** Pre-fill from `invoice.issue_date` / `invoice.due_date`.

### <a id="data-7"></a>DATA-7 — Currency lives on the user, not the invoice
`Should` · Phase 3 · `apps/invoices/serializers.py` (`currency = CharField(source='user.currency')`), `apps/invoices/utils.py`, `apps/payments/views.py` · **Done 2026-11-15**: `Invoice.currency` is frozen from the user's setting at creation (migration `0010` backfills existing rows) and read by the PDF, the three emails, Stripe Checkout, both serializers and the SPA lists. Dashboard totals still add different currencies together — tracked under [FEAT-4](#feat-4).
**Problem:** Switching the account from USD to EUR re-renders and re-charges every past invoice in EUR with the same numbers.
**Fix:** Add `Invoice.currency` (default from user at create) + data migration; read it everywhere.

---

## Payments

### <a id="pay-1"></a>PAY-1 — Stripe webhook is not idempotent and trusts the event blindly
`Must` · Phase 1 · `apps/payments/views.py:L78-100` · **Done 2026-11-15**: atomic + `select_for_update`, `payment_status` and amount verified, `update_or_create`, `Decimal` cents, replays return 200 without a second payment; `tests/test_webhook.py`.
**Problem:** `Payment` is OneToOne and the handler calls `Payment.objects.create`. A redelivered `checkout.session.completed`, or one for an invoice already marked paid manually, raises `IntegrityError` → 500, so Stripe retries for days. No check of `payment_status == 'paid'` or amount vs `total`; amount stored as float (`amount_total / 100`).
**Fix:** `transaction.atomic` + `select_for_update`; return 200 early if already paid; `update_or_create`; `Decimal(amount_total) / 100`; verify `payment_status` and amount; log mismatches.

### <a id="pay-2"></a>PAY-2 — Stripe checkout is unreachable from the product
`Must` · Phase 3 · `apps/payments/views.py:L15-50`, `config/urls.py:L16` · **Done 2026-11-15**: authenticated `POST /api/invoices/{id}/checkout/` returns `{url}` for your own sent/overdue invoices; `apps/payments/services.py` reuses an open session, charges `to_cents(total)`, and points success/cancel at the SPA. `send_invoice` creates the link before emailing, so the "Pay now" block renders; Stripe being down logs and still sends. The anonymous template-side `create_checkout_session` is deleted.
**Problem:** Only the dead template side creates checkout sessions; nothing in the SPA calls it. `create_checkout_session` has no auth (anonymous GET → 500). `success_url` points to a dead template page. `stripe_payment_url` is never set, so the "Pay now" block in emails never renders.
**Fix:** Authenticated `POST /api/invoices/{id}/checkout/` returning `{url}`; create the session when the invoice is sent so the email carries the link; success/cancel URLs point to the SPA (or the public invoice page, [FEAT-3](#feat-3)).

### <a id="pay-3"></a>PAY-3 — No partial or multiple payments
`Should` · Phase 3 · `apps/payments/models.py` (`invoice = OneToOneField`) · **Done 2026-11-15**: `Payment.invoice` is a `ForeignKey` (migration `payments/0002`); `Invoice.amount_paid`/`amount_due` drive the paid transition; `POST /api/invoices/{id}/payments/` records a deposit or instalment and refuses more than the balance; "Mark Paid" settles only what is left; the dashboard counts money received, not invoice totals; the SPA has a Payments panel with a Record Payment form (`tests/test_partial_payments.py`).
**Problem:** One payment per invoice; "Mark Paid" always records the full total. Deposits and instalments are impossible; `is_full_payment` exists but can never be false in practice.
**Fix:** `ForeignKey` + `amount_due = total - sum(payments)`; status becomes `paid` when `amount_due <= 0`; add a "Record payment" form.

### <a id="pay-4"></a>PAY-4 — Refunds and expired sessions are ignored
`Nice` · Phase 3 · `apps/payments/views.py` (`handle_payment_intent_succeeded` is `pass`) · **Done 2026-11-15**: `charge.refunded` records the refund as a negative payment (cumulative amounts, so a redelivery or a second refund only books the difference) and reopens a paid invoice as `sent`/`overdue`; `checkout.session.expired` clears the dead pay link so the next request mints a fresh session. The empty `payment_intent.succeeded` handler is gone (`tests/test_refunds.py`).
**Fix:** Handle `charge.refunded` and `checkout.session.expired`; delete the empty handler.

## Broken user flows

### <a id="bug-1"></a>BUG-1 — Wrong password reloads the page with no error
`Must` · Phase 2 · `frontend/src/api/client.js:L30-33` · **Done 2026-11-15**: the interceptor redirects only when a token was sent and the URL is not `/api/auth/*`; `api/client.test.js` covers both paths.
**Problem:** Login returns 401 for bad credentials; the global interceptor treats every 401 as "session expired", deletes the token and does `window.location.href='/login'`, wiping the error toast.
**Fix:** Redirect only when a token was sent and the URL is not `/api/auth/*`; use router navigation and clear auth state.

### <a id="bug-2"></a>BUG-2 — Client money totals always show $0.00
`Must` · Phase 2 · `frontend/src/pages/Clients/ClientList.jsx:L135`, `ClientDetail.jsx:L235-243`, `apps/clients/serializers.py` · **Done 2026-11-15**: the serializer now returns `total_billed` (sent + overdue + paid), `total_paid` and `outstanding`; `tests/test_time_logs.py`.
**Problem:** SPA reads `total_billed`, `total_paid`, `outstanding`; the API returns `total_revenue`, `outstanding_amount`, `invoice_count`.
**Fix:** Align names (add `total_billed` to the serializer if "billed" ≠ "paid").

### <a id="bug-3"></a>BUG-3 — Saving a time log without an hourly rate always fails
`Must` · Phase 2 · `frontend/src/pages/TimeTracker/TimeTracker.jsx:L124,L375-381`, `apps/time_tracker/models.py:L30` · **Done 2026-11-15**: `hourly_rate` is nullable (migration 0002) and `total_amount` is `None` without it, matching the "optional" label.
**Problem:** Field labelled "optional" sends `null`; model column is non-null → 400 "Failed to save time log".
**Fix:** Default the rate from client or user settings on the backend, or make it required in the form.

### <a id="bug-4"></a>BUG-4 — Overdue invoices cannot be marked paid in the UI
`Must` · Phase 2 · `frontend/src/pages/Invoices/InvoiceDetail.jsx:L158-162` · **Done 2026-11-15**: the button renders for `sent` and `overdue`.
**Fix:** Show "Mark Paid" for `['sent','overdue']`.

### <a id="bug-5"></a>BUG-5 — Currency hardcoded to USD in the SPA and emails
`Must` · Phase 2 · `Dashboard.jsx`, `InvoiceList.jsx`, `ClientList.jsx`, `ClientDetail.jsx`, `Reports.jsx`, `TimeTracker.jsx`, 5 of 6 templates in `InvoicePreview.jsx`, `templates/invoices/email/*.html` · **Done 2026-11-15**: every screen formats through `utils/formatters.formatCurrency` with `useCurrency()`; `InvoicePreview` passes the invoice currency in all templates and chart axes follow it; emails render `currency_symbol` (`tests/test_emails.py`).
**Problem:** EUR/BDT users see `$`; the same invoice shows `€` in one preview template and `$` in the others; emails always say `$`.
**Fix:** One `formatCurrency(amount, currency)` in `utils/formatters.js` (exists, unused) used everywhere; pass currency into email context and use the existing `currency` template filter.

### <a id="bug-6"></a>BUG-6 — "Forgot password" pretends to send an email
`Must` · Phase 2 · `apps/accounts/api_views.py:L137-150`, `frontend/src/pages/Auth/ForgotPassword.jsx` · **Done 2026-11-15**: real token email + `POST /api/auth/password/reset/confirm/` + `/reset-password/:uid/:token` page; throttled, identical response for unknown emails, API tokens revoked on reset (`tests/test_password_reset.py`).
**Problem:** Endpoint returns 200 and sends nothing; there is no confirm endpoint or reset page. Locked-out users cannot recover.
**Fix:** Django `PasswordResetForm` with a link to `/reset-password/:uid/:token`; confirm endpoint with `default_token_generator` + `SetPasswordForm`; throttle (SEC-4); same response whether or not the email exists.

### <a id="bug-7"></a>BUG-7 — Pagination ignored: only the first 20 records ever load
`Must` · Phase 2 · `InvoiceCreate.jsx:L67-69`, `TimeTracker.jsx:L47-48,L174-177`, `InvoiceList.jsx`, `ClientList.jsx`, `Dashboard.jsx:L22` · **Done 2026-11-15**: `config.pagination.DefaultPagination` adds `?page_size=` (max 200); lists have page controls bound to `?page=`; selects and time-log totals use `utils/pagination.fetchAllPages`; the Dashboard asks for `page_size=5`. The client select is still a plain `<select>`, not a search box.
**Problem:** DRF pages at 20; the SPA reads `results` and ignores `next`. Client #21 cannot be picked on a new invoice; "Total Hours" sums only 20 logs; Dashboard's `{limit: 5}` is ignored.
**Fix:** Pagination controls on lists; `page_size_query_param` on the backend; searchable client select; totals computed server-side.

### <a id="bug-8"></a>BUG-8 — Any error during page load logs the user out
`Should` · Phase 2 · `frontend/src/context/AuthContext.jsx:L14-26` · **Done 2026-11-15**: only a 401 clears the token.
**Fix:** Clear the token only on `401`.

### <a id="bug-9"></a>BUG-9 — "Send" reports success while only queued; stored PDF is stale
`Should` · Phase 2 · `InvoiceDetail.jsx:L56-63`, `apps/invoices/api_views.py` (`InvoiceSendView`), `apps/invoices/tasks.py` · **Done 2026-11-15**: one `send_invoice` task marks sent → renders the PDF → emails it; the UI says "Queued"; `mark_as_paid`/`mark_as_overdue`/`cancel` drop the stored PDF so the next download re-renders. Sending with no items returns 400. Broker-down behaviour: see [OPS-9](#ops-9).
**Problem:** Send queues `generate_and_store_pdf` and `send_invoice_email` in parallel; `mark_as_sent` runs later. UI says "sent", status is still `draft`, a second click emails twice, and the stored PDF is rendered as DRAFT and served forever after (also after payment).
**Fix:** Single task (or `chain`) that marks sent → renders PDF → emails; UI shows "Queued", disables Send until status changes; regenerate or invalidate `pdf_file` on every status change.

### <a id="bug-10"></a>BUG-10 — Delete offered for sent/paid invoices; API error text discarded
`Should` · Phase 2 · `InvoiceDetail.jsx:L96-104,L166-183` · **Done 2026-11-15**: the delete menu renders only for drafts and every action shows the API's own error text.
**Fix:** Render Delete only for drafts; show `error.response.data.error`.

### <a id="bug-11"></a>BUG-11 — Client search does nothing
`Should` · Phase 2 · `apps/clients/api_views.py:L11-12` · **Done 2026-11-15**: `?search=` filters name, company and email (`tests/test_client_search.py`).
**Fix:** Filter `name|company|email__icontains` on `?search=`.

### <a id="bug-12"></a>BUG-12 — "Create invoice" from a client does not preselect that client
`Should` · Phase 2 · `ClientDetail.jsx:L144,L268`, `InvoiceCreate.jsx` · **Done 2026-11-15**: `?client=` is the form default and is re-applied once the client options have loaded (a `<select>` drops a value whose option does not exist yet).
**Fix:** Read `useSearchParams().get('client')` as the default.

### <a id="bug-13"></a>BUG-13 — Date-only values shift by a day
`Should` · Phase 2 · `TimeTracker.jsx:L25,L105,L159-165,L297` · **Done 2026-11-15**: `utils/dates.js` (`parseDateOnly`, `todayISO`) with tests pinned to a western timezone. `TimeLog.work_date` is the only date-only field; invoice dates are `DateTimeField`.
**Problem:** `new Date('2026-11-15')` is UTC midnight → shows Nov 14 west of UTC; default date uses `toISOString()` (UTC), pre-filling tomorrow/yesterday near midnight.
**Fix:** Parse date-only strings as local dates; build defaults from local `getFullYear/getMonth/getDate`.

### <a id="bug-14"></a>BUG-14 — Reports shows "NaN%" for new users
`Should` · Phase 2 · `frontend/src/pages/Reports/Reports.jsx:L255-268` · **Done 2026-11-15**: `Number(...) > 0` guards the collected-percentage and average-invoice maths; the string `"0.00"` is truthy, so the old `&&` guard produced `Infinity%`.
**Fix:** `Number(stats.total_billed) > 0 ? … : 0`.

### <a id="bug-15"></a>BUG-15 — Load failures render the empty state; Dashboard is all-or-nothing
`Should` · Phase 2 · `InvoiceList.jsx`, `ClientList.jsx`, `TimeTracker.jsx`, `Dashboard.jsx`, `Reports.jsx` · **Done 2026-11-15**: shared `ui/ErrorState` (retry) on all five pages; the Dashboard uses `Promise.allSettled`, so a single failing endpoint leaves the rest of the page intact behind a "Some of this page could not be loaded" banner. `PrivateRoute` also keeps you on the page when the profile request fails for anything other than a 401 — before, an unreachable API bounced you to the login screen.
**Fix:** Error state with retry; `Promise.allSettled` on the Dashboard.

### <a id="bug-16"></a>BUG-16 — PDF labels and options are wrong
`Should` · Phase 2 · `templates/invoices/invoice_pdf.html:L143-144`, `apps/invoices/utils.py` · **Done 2026-11-15**: label is "Due Date"; the receipt sentence appears only on paid invoices (otherwise "Please settle this invoice by the due date shown"); the colour is now `Invoice.pdf_color` (migration `0009`), validated against `PDF_COLORS`, editable after sending, and used by the downloaded *and* the emailed PDF. The ignored `?template=`/`?color=` query params are gone. The six template layouts remain preview-only, which the picker now says; building them for the PDF is a Phase 4 item.
**Problem:** Due date labelled "Payment Date"; unpaid invoices with empty notes say "This invoice serves as your official receipt"; the template/colour picker in `InvoiceDetail.jsx` has no effect on the PDF.
**Fix:** Label "Due Date"; receipt text only when paid; implement or remove template/colour params.

### <a id="bug-17"></a>BUG-17 — Bad query params return 500
`Should` · Phase 2 · `apps/dashboard/api_views.py:L75` (`?months=abc`), `apps/invoices/api_views.py:L34` (`?client=foo`) · **Done 2026-11-15**: `InvoiceFilterSerializer` and `MonthlyRevenueQuerySerializer` validate the params (`tests/test_query_params.py`).
**Fix:** Validate with serializer fields or `django-filter`; return 400.

### <a id="bug-19"></a>BUG-19 — Charts drew nothing; layouts broke at tablet and phone widths
`Should` · Phase 4 · `Dashboard.jsx`, `Reports.jsx`, `StatsCard.jsx`, `ClientList.jsx`, `InvoiceList.jsx`, `TimeTracker.jsx`, `InvoiceCreate.jsx`, `PublicInvoice.jsx` · **Done 2026-11-15** (found by screenshotting every page at 1920, 1440, 1024, 768, 390 and 320 px): the API sends amounts as strings and recharts plots nothing for a string, so the Dashboard chart was empty and the Reports bars were all full height with axis labels `$1k $1k $1k $0k` (`toChartRows`, `formatCompactCurrency`; `utils/formatters.test.js`); four-up stat cards overlapped their icons at 1024 px (now 4-up only from 1280 px); the Reports donut was clipped; the clients list overlapped email, phone and total on phones; the invoice and time-log tables ran past the screen at 768 px (tighter padding, date without time, least useful columns hidden); the new-invoice form crammed six fields into one row; the preview and the form still said "Payment Date" for the due date; the default PDF colour (indigo) was missing from the picker; "New Invoice" appeared twice on the Dashboard and the invoice list. No horizontal page overflow was found at any width.
**Problem:** nobody had looked at the app below desktop width, and the chart bug hid behind "no data yet".
**Fix:** as above.

### <a id="bug-18"></a>BUG-18 — Production PDFs crash for users with a logo
`Must` · Phase 5 · `apps/invoices/utils.py:L39-48`
**Problem:** `user.logo.path` raises `NotImplementedError` on S3 storage, which is not caught → every PDF download/send fails in production for users with a logo.
**Fix:** Embed the logo as a data URI from `user.logo.open().read()`.

---

## Payments-adjacent product gaps (core features)

### <a id="feat-1"></a>FEAT-1 — Bill unbilled time logs onto an invoice
`Should` · Phase 3 · `TimeLog.is_billed`, `TimeLog.link_to_invoice` (unused), no SPA flow · **Done 2026-11-15**: `POST /api/time-logs/bill/` turns selected logs into one draft invoice (or appends to an existing draft for the same client), marks them billed and links them; the time tracker has checkboxes and a "Bill N entries" button. Logs without an hourly rate, already-billed logs and mixed clients are refused (`tests/test_time_billing.py`).

### <a id="feat-2"></a>FEAT-2 — Invoice actions missing from the API
`Should` · Phase 3 · duplicate (only the dead view has it, and it mutates on GET), cancel/void, re-send and manual reminder for overdue invoices (`InvoiceSendView` rejects `overdue`) · **Done 2026-11-15**: `POST /{id}/duplicate/` copies lines and terms into a new draft, `/{id}/remind/` queues the overdue or due-soon email by status, and `/{id}/send/` accepts `overdue` without resetting it to `sent`. `/{id}/cancel/` arrived with [DATA-2](#data-2); all four are in the invoice menu (`tests/test_invoice_actions.py`).

### <a id="feat-3"></a>FEAT-3 — Public, tokenized invoice page for clients
`Should` · Phase 3 · Clients currently have no way to view or pay an invoice except the PDF attachment · **Done 2026-11-15**: `Invoice.public_token` (migration `0011`, backfilled) powers `/pay/:token` in the SPA and `GET|POST /api/public/invoices/<token>/{,pdf/,checkout/}`. The page needs no account, shows one invoice (sent, overdue or paid only — never a draft or a cancelled one), and its Pay button creates the Stripe session. Rate-limited at 60/hour per IP against token guessing; Stripe misconfiguration is not quoted at the client. The three client emails link to it, and the owner's invoice menu has "Copy client link" (`tests/test_public_invoice.py`).

### <a id="feat-4"></a>FEAT-4 — Growth features
`Nice` · Phase 6 · recurring invoices, quotes/estimates, credit notes, CSV export, per-line and multiple taxes, percentage discounts, per-user invoice prefix, activity/audit log, notification settings, GDPR export/delete, email verification, i18n.
---

## Performance

### <a id="perf-1"></a>PERF-1 — Client list runs 3 queries per client
`Should` · Phase 4 · `apps/clients/serializers.py:L21-28` · **Done 2026-11-15**: `with_totals()` annotates invoice count, billed, paid and outstanding in the list query itself. 14 clients went from 58 queries to 10 (the same 10 for any number of clients) (`tests/test_client_query_count.py`). Totals keep their old meaning (status-based), so a deposit on a sent invoice is not subtracted here, unlike on the dashboard.
**Problem:** `get_invoice_count`, `get_total_revenue`, `get_outstanding_amount` each query per row → 61 queries per page of 20.
**Fix:** `annotate(Count(...), Sum(..., filter=Q(...)))` in `get_queryset`.

### <a id="perf-2"></a>PERF-2 — Single 812 KB JS bundle
`Should` · Phase 4 · `frontend/src/App.jsx` (every page eagerly imported, incl. recharts) · **Done 2026-11-15**: every page is `React.lazy` behind one `Suspense` loader (the three auth pages too). The entry chunk is 267 KB minified (89 KB gzip), down from 860 KB; recharts (377 KB) loads only when the Dashboard or Reports opens.
**Fix:** `React.lazy` per route; recharts only on Dashboard/Reports.

---

## Lean (delete / merge)

### <a id="lean-1"></a>LEAN-1 — Delete the dead server-rendered UI
`Should` · Phase 4 · `views.py`, `urls.py`, `forms.py` in accounts, clients, dashboard, invoices, time_tracker; `config/urls.py:L11-17`; `crispy_forms`, `crispy_tailwind` · **Done 2026-11-15**: `views.py`/`urls.py`/`forms.py` in five apps (~1,000 lines), `django-allauth`, `django-crispy-forms`, `crispy-tailwind` and their settings are gone; `/`, `/invoices/`, `/accounts/login/` now 404 instead of 500; the Stripe webhook moved to `/api/payments/webhook/` (update the URL in the Stripe dashboard) (`tests/test_routes.py`).
**Why:** ~1,000 lines duplicating the API; every page 500s; `/invoices/<pk>/duplicate/` mutates on GET; allauth login redirects to a 500. Decision: [ADR-0001](adr/0001-api-only-backend.md).
**Fix:** Delete; move the Stripe webhook under `/api/payments/webhook/`; keep `allauth` only if email confirmation is adopted.

### <a id="lean-2"></a>LEAN-2 — Unused dependencies
`Should` · Phase 4 · backend: `sendgrid` (mail goes through SMTP), `django-crispy-forms`, `crispy-tailwind`; frontend: `@types/react`, `@types/react-dom` (no TypeScript). · **Done 2026-11-15**: removed the `sendgrid` Python package (production mail still goes through SendGrid's SMTP relay, which needs no library) and `@types/react`, `@types/react-dom` (no TypeScript). `django-crispy-forms` and `crispy-tailwind` left with LEAN-1. `depcheck` finds nothing else unused.

### <a id="lean-3"></a>LEAN-3 — Dead backend helpers
`Nice` · Phase 4 · `invoices/utils.py:format_currency`, `templatetags/invoice_filters.py:abs_value`, `Invoice.days_until_due`, `handle_payment_intent_succeeded`, `config/celery.py:debug_task`, the `color` param in `utils.py`. Keep `TimeLog.link_to_invoice` for [FEAT-1](#feat-1). · **Done 2026-11-15**: deleted `format_currency`, the `abs_value` filter, `Invoice.days_until_due` and `debug_task`; `handle_payment_intent_succeeded` and the PDF `color` argument went earlier ([PAY-4](#pay-4), [BUG-16](#bug-16)). `TimeLog.link_to_invoice` stays.

### <a id="lean-4"></a>LEAN-4 — Dead and duplicated frontend code
`Should` · Phase 4 · `hooks/useDebounce.js` (unused); `utils/formatters.js` (unused while `formatCurrency` is copied into 6 pages and `getStatusBadge` into 4); unused endpoint helpers in `api/endpoints.js` (`auth.*` duplicated in `AuthContext`, `clients.archive`, `timeLogs.get`, `settings.get/update` → `/api/settings/` does not exist); `@` alias and `/accounts` proxy in `vite.config.js`; Inter font loaded twice. · **Done 2026-11-15**: one `ui/StatusBadge` replaces the four `getStatusBadge` copies; deleted `useDebounce`, the unused `auth.login/signup/logout/getUser`, `timeLogs.get` and `settings.get/update` helpers (the `/api/settings/` they called does not exist), the `@` alias, the `/accounts` dev proxy, and the second Inter font request. `formatCurrency` was already shared since [BUG-5](#bug-5).

### <a id="lean-5"></a>LEAN-5 — Oversized components mixing jobs
`Nice` · Phase 4 · `InvoicePreview.jsx` (714 lines, 6 templates), `InvoiceCreate.jsx` (441), `TimeTracker.jsx` (411), `Settings.jsx` (382). Split by job (one file per template; form vs. totals vs. API mapping), not by line count. · **Done 2026-11-15**: `InvoicePreview` (713 lines) is `components/invoice/`: one file per template plus `palettes.js`, `format.js`, `parts.jsx`; Settings is one component per tab (332 → 134 lines in the page); `TimeTracker` gives its timer and its add/edit modal their own files; `InvoiceCreate` gives line items and the summary theirs (428 → 313). Line-item inputs gained labels. `InvoiceDetail` (504 lines) is next in size and not on the audit list.

---

## UX & accessibility

### <a id="ux-1"></a>UX-1 — Modal has no dialog semantics, Esc, or focus trap
`Should` · Phase 4 · `frontend/src/components/ui/Modal.jsx` · **Done 2026-11-15**: `Modal` is a `role="dialog"` named by its title and described by its text; Escape closes it, Tab and Shift+Tab stay inside, focus goes to the first field and returns to the button that opened it, the close button is named (`components/ui/Modal.test.jsx`).
**Fix:** Native `<dialog>` + `showModal()`, or `role="dialog" aria-modal aria-labelledby`, Esc to close, focus in/out management, `aria-label` on close.

### <a id="ux-2"></a>UX-2 — Inputs unlabeled for assistive tech; rows not keyboard-reachable
`Should` · Phase 4 · `components/ui/Input.jsx`, `Select.jsx`, `Table.jsx`, icon-only buttons across pages · **Done 2026-11-15**: `Input`, `Select` and the Notes field link their label with `useId`/`htmlFor` and announce errors; invoice numbers in the invoice list and on a client page are real links (keyboard reachable); the search boxes, back arrows, timer, delete and menu-close buttons have names. Settings textareas follow with [UX-4](#ux-4).
**Fix:** `useId()` + `htmlFor`; invoice number as a `<Link>`; `aria-label` on icon buttons.

### <a id="ux-3"></a>UX-3 — No 404 route
`Nice` · Phase 4 · `frontend/src/App.jsx` has no `*` route. · **Done 2026-11-15**: new `NotFound` page on a catch-all route (`App.test.jsx`).

### <a id="ux-4"></a>UX-4 — Fake settings and header controls
`Should` · Phase 4 · `Settings.jsx` (Notifications/Appearance not registered with the form), `Header.jsx` (bell always shows unread dot), `Sidebar.jsx` ("Pro Plan" card), undefined `xs:` breakpoint in `tailwind.config.js` ("New Invoice" label never shows). · **Done 2026-11-15**: removed what did nothing: the bell with a permanent unread dot, the "Pro Plan" card, and the Notifications tab whose toggles were never saved. Appearance now works (see [UX-5](#ux-5)); the `xs` breakpoint exists (`screens.xs = 480px`), so "New Invoice" shows at 480 px and up and "New" below it. Settings textareas have linked labels.
**Fix:** Implement or remove each; add `screens: { xs: '480px' }`.

### <a id="ux-5"></a>UX-5 — Theme handled per page
`Nice` · Phase 4 · dark-mode toggle duplicated in auth pages and `Header`; sidebar uses the dark logo on a dark background. · **Done 2026-11-15**: `ThemeProvider`/`useTheme` (`context/ThemeContext.jsx`) is the only owner of light, dark and system: the header toggle, the auth pages and Settings → Appearance read it, the choice is saved (`theme`, migrating the old `darkMode` flag) and applied before first paint so dark mode no longer flashes light (`ThemeContext.test.jsx`). The sidebar logo problem went with [UX-6](#ux-6).

### <a id="ux-6"></a>UX-6 — Mixed product branding
`Should` · Phase 4 · "Penough" vs "FreelanceFlow" vs "BugValluk". See [DESIGN.md](DESIGN.md). **Done 2026-11-15**: product is FreelanceFlow (Penough is the maker); shared `Wordmark` replaces the logo images and the three copied markup blocks. The `penough_logo_*.png` files are kept in `frontend/public/logos/` but unused.

---

## Tests

### <a id="test-1"></a>TEST-1 — 9 of 32 backend tests fail
`Must` · Phase 0 · measured 2026-11-15 · **Done 2026-11-15**: all 7 dead-view tests deleted, the other 5 fixed.
| Test | Cause |
|---|---|
| `test_invoices.py::TestInvoiceViews` (4 tests) | test the dead template views ([LEAN-1](#lean-1)) → `TemplateDoesNotExist` |
| `test_invoices.py::TestInvoiceModel::test_is_overdue` | factory sets a `date` on a `DateTimeField` |
| `test_payments.py::test_partial_payment` | `invoice.save()` recalculates total to 0 (no items) |
| `test_payments.py::test_webhook_invalid_signature` | mocked `SignatureVerificationError` is not an exception class |
| `test_tasks.py::test_sends_email_with_pdf`, `test_generates_and_stores_pdf` | patch `apps.invoices.tasks.generate_pdf`, which is imported elsewhere |
**Fix:** Delete the 4 dead-view tests with LEAN-1 (or now); fix the factory to use aware datetimes; give the partial-payment invoice items; mock the exception as a real class; patch where the name is looked up.

### <a id="test-2"></a>TEST-2 — Test DB selection is accidental
`Must` · Phase 0 · `config/settings/local.py:L28` · **Done 2026-11-15**: `config/settings/test.py` uses `TEST_DATABASE_URL` (not `DATABASE_URL`, which `.env` sets for Postgres).
**Problem:** `'test' in sys.argv` is never true under pytest, so tests use Postgres unless `.env` happens to set `USE_SQLITE=True`. CI passes `DATABASE_URL`, which `local.py` ignores.
**Fix:** Add `config/settings/test.py` (SQLite in-memory or `DATABASE_URL`, MD5 hasher, locmem email, eager Celery) and point `pytest.ini` at it.

### <a id="test-3"></a>TEST-3 — No API tests for accounts, clients, time logs, dashboard, cross-tenant access, rounding
`Must` · Phases 1–3 (each fix lands with its test) · see coverage map below.

### <a id="test-4"></a>TEST-4 — The frontend has no tests
`Should` · Phase 0 (infra), Phases 2–4 (tests) · no Vitest/Jest, no test script. **Infra done 2026-11-15**: Vitest + RTL + MSW, `client.js` 401 test, `npm test` in CI.
**Fix:** Vitest + React Testing Library + MSW; first targets: `client.js` 401 handling, `InvoiceCreate` edit/quantity payload, currency formatting, date-only parsing.

### <a id="test-5"></a>TEST-5 — No end-to-end smoke test
`Should` · Phase 5 · Playwright: sign up → create client → create invoice → send → mark paid → PDF downloads.

**Coverage map (backend, 2026-11-15)**

| Area | Tested | Untested |
|---|---|---|
| Invoice model | numbering, totals, tax, editable, sent/paid transitions | rounding, discount, numbering race, year rollover |
| Invoice API | list, detail, status filter | create/update with items, validation, cross-user, send, mark-paid, PDF, delete rules |
| Payments | webhook happy path, checkout (mocked) | idempotency, amount mismatch, anonymous checkout |
| Tasks | overdue marking, due-soon selection | overdue reminder, stale PDF, retries |
| Accounts / Clients / Time logs / Dashboard API | — | everything |

---

## Ops, CI & developer experience

### <a id="ops-1"></a>OPS-1 — CI cannot pass
`Must` · Phase 0 · `.github/workflows/ci.yml` · **Done 2026-11-15**.
**Problem:** Lint and test steps run from the repo root (`flake8 apps/`, `pip install -r requirements-dev.txt`) but the code lives in `backend/`; the build job uses `context: .` and there is no root Dockerfile; no frontend job.
**Fix:** `defaults.run.working-directory: backend`; build `./backend`; add a frontend job (`npm ci && npm run lint && npm run build && npm test`).

### <a id="ops-2"></a>OPS-2 — Lint fails on both sides
`Must` · Phase 0 · **Done 2026-11-15**: single quotes kept (`skip-string-normalization` in `backend/pyproject.toml`); formatting commit listed in `.git-blame-ignore-revs`.
**Frontend:** `npm run lint` → 16 errors, 12 warnings: unused vars (`Signup.jsx`, `InvoiceCreate.jsx`, `Settings.jsx`, …) and `react-hooks/exhaustive-deps`; `--max-warnings 0` makes warnings fatal.
**Backend:** `black --check apps` → 64 files would be reformatted (the code uses single quotes; black's default normalizes to double), `isort --check-only` → 14 files, `flake8 apps` → 154 issues. CI's lint job fails on these even after [OPS-1](#ops-1).
**Fix:** One formatting-only commit (`black apps && isort apps`, or set `skip-string-normalization` if single quotes are preferred), then fix the remaining flake8 findings; keep that commit separate so `git blame --ignore-rev` can skip it.

### <a id="ops-3"></a>OPS-3 — Production compose cannot deploy the app
`Must` · Phase 5 · `docker-compose.prod.yml`, `nginx.conf`
**Problem:** `build: .` (no root Dockerfile); no frontend service; nginx proxies `/` to Django so the SPA is never served; port 443 published with no TLS server block; no migrate step; `.env.prod.db` undocumented.
**Fix:** Build `./backend`; multi-stage frontend image served by nginx with `try_files $uri /index.html`; `/api`, `/admin`, `/static`, `/media` proxied to Django; TLS (Caddy or certbot); release step runs `migrate`.

### <a id="ops-4"></a>OPS-4 — Backend image runs `collectstatic` with local settings
`Should` · Phase 5 · `backend/Dockerfile:L28`
**Problem:** `manage.py` defaults to `local` (plain storage, no manifest) while gunicorn runs `production` (`CompressedManifestStaticFilesStorage`) → "Missing staticfiles manifest entry" → admin 500.
**Fix:** `RUN DJANGO_SETTINGS_MODULE=config.settings.production SECRET_KEY=build python manage.py collectstatic --noinput`.

### <a id="ops-5"></a>OPS-5 — Frontend image runs the Vite dev server
`Should` · Phase 5 · `frontend/Dockerfile`
**Problem:** `npm install` (not `npm ci`), `CMD npm run dev`, no `.dockerignore` (copies host `node_modules`/`dist`), `VITE_API_URL` set at runtime although Vite inlines it at build time.
**Fix:** Multi-stage build → static files; `.dockerignore`; `VITE_API_URL` as a build arg.

### <a id="ops-6"></a>OPS-6 — Two conflicting `.env.example` files
`Should` · Phase 0 · **Done 2026-11-15**: merged into the root `.env.example`; `backend/.env.example` removed.

### <a id="ops-7"></a>OPS-7 — Django 4.2 is past end of support; loose pins; migration drift
`Should` · Phase 4 · `backend/requirements.txt`, `invoices/migrations/0004`, `0005`
**Problem:** Django 4.2 LTS support ended April 2026. `STATICFILES_STORAGE`/`DEFAULT_FILE_STORAGE` are removed in 5.1. Requirements use `>=` with no lockfile. `0005` has `blank=True` the model lacks; `0004` copies `default_due_date` locally.
**Fix:** Django 5.2 LTS with `STORAGES={...}`; `pip-tools` lockfile; `makemigrations --check` in CI.

### <a id="ops-8"></a>OPS-8 — Tooling gaps
`Nice` · Phase 4 · ESLint 8 (EOL, legacy `.eslintrc.cjs`), no Prettier. **Partly done 2026-11-15**: pre-commit hooks added; Python pinned to 3.12 in `.python-version`, `backend/Dockerfile`, CI and `setup.cfg` (Django 4.2 supports ≤ 3.12, so the 3.13 venv must be rebuilt). **Done 2026-11-15:** ESLint 9 flat config (`eslint.config.js`; not 10, because `eslint-plugin-react` does not support it yet), Prettier (`format` / `format:check`, in CI, `scripts/check.sh` and pre-commit), `npm run lint` without `--ext`. `ruff` and `mypy` were left out on purpose: black, isort and flake8 already cover the backend.
**Fix:** ESLint 9 flat config + Prettier; `pre-commit` with ruff/black/isort/prettier; one Python version in `.python-version`, Dockerfile and CI.

### <a id="ops-9"></a>OPS-9 — No observability or task resilience
`Should` · Phase 5 · No Sentry/error tracking; Celery email tasks have no `autoretry_for`/backoff; no structured logging in tasks; no health check that touches DB/Redis (nginx `/health/` returns a static 200).
**Also (found 2026-11-15):** with Redis down, `POST /api/invoices/{id}/send/` hangs instead of failing — kombu/redis-py keep retrying the connection, and `task_publish_retry=False`, `broker_connection_retry=False` and `socket_connect_timeout` did not change it (measured on Windows, no listener on 6379). The view already converts `kombu.exceptions.OperationalError` into 503; the missing piece is making the publish give up. Needs a connection check or a thread timeout around `delay()`.

### <a id="ops-10"></a>OPS-10 — README described a setup that did not work
`Should` · Phase 0 · **Done 2026-11-15**: wrong frontend port (5173 vs 3000), nginx in dev compose, `python backend/manage.py` paths, broken `loaddata` fixture, missing status. README rewritten.

### <a id="ops-11"></a>OPS-11 — Broken demo fixture
`Should` · Phase 0 · **Done 2026-11-15**: `fixtures/sample_data.json` had one user with a placeholder password hash (login impossible). Replaced by `python manage.py seed_demo`.

### <a id="ops-12"></a>OPS-12 — Celery defaults to production settings
`Must` · Phase 0 · `config/celery.py:L9` · **Done 2026-11-15**.
**Problem:** `celery -A config worker` without `DJANGO_SETTINGS_MODULE` loads `production`, so a local worker uses S3 storage and SendGrid; PDF tasks fail locally.
**Fix:** Default to `config.settings.local` like `manage.py`; production sets the variable explicitly (compose already does).

### <a id="ops-13"></a>OPS-13 — Root `.gitignore` ignores any `lib/` directory
`Nice` · Phase 0 · `.gitignore:L13` (`lib/`) would silently ignore e.g. `frontend/src/lib/`. **Done 2026-11-15**: anchored to `/backend/`.
**Fix:** Anchor Python-packaging patterns (`/backend/lib/`) or drop them.
