# CSV export (FEAT-4)

**Goal:** a freelancer can hand their accountant three files: invoices, payments, time logs.

**Behaviour**
- `GET /api/exports/invoices/`, `/payments/`, `/time-logs/` return `text/csv` attachments, newest first, only the caller's rows (no pagination; one file per call).
- Money columns are plain decimal strings with two places, never localized; dates are ISO-8601 (`YYYY-MM-DD`). Each file carries a currency column where money appears.
- Text cells that start with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` so a spreadsheet cannot run them as formulas. Numbers (including refunds, which are negative) are not touched.
- SPA: three "Export CSV" buttons on Reports.

**Non-goals:** filters, date ranges, XLSX, scheduled exports.

**Tests:** scoping (another user's rows never appear), formula-injection cell, refund stays numeric, column header row.
