# 0001 — Backend is API-only; the React SPA is the only UI

- Status: Accepted (2026-11-15)
- Date: 2026-11-15

## Context

Every Django app has two parallel surfaces: DRF API views (`api_views.py`, `api_urls.py`) used by the React SPA, and server-rendered views (`views.py`, `urls.py`, `forms.py`) mounted at `/`, `/clients/`, `/invoices/`, `/time/`, `/settings/`. The templates those views render do not exist, so every server-rendered page returns `TemplateDoesNotExist`. Business rules (duplicate invoice, Stripe checkout, HTMX time-log partials) are implemented only on the dead side, and `GET /invoices/<pk>/duplicate/` mutates data on GET. See [LEAN-1](../AUDIT.md#lean-1), [PAY-2](../AUDIT.md#pay-2), [FEAT-2](../AUDIT.md#feat-2).

## Decision

The backend exposes only:

- `/api/**` (DRF, JSON),
- `/admin/` (Django admin for operators),
- the Stripe webhook (moved under `/api/payments/webhook/`),
- static/media in development.

All server-rendered views, URL modules, forms, `crispy_forms` and `crispy_tailwind` are deleted. Features that existed only there (checkout, duplicate) are re-implemented as API endpoints first (Phase 3), then the dead code is removed (Phase 4).

## Consequences

- ~1,000 fewer lines; one place for each business rule.
- `allauth` URLs are removed unless email confirmation is adopted; signup/login stay on the API.
- Tests that hit server-rendered views are deleted ([TEST-1](../AUDIT.md#test-1)).
- The SPA must provide every user-facing screen, including the public invoice page ([FEAT-3](../AUDIT.md#feat-3)).
