# Code style

Tools enforce formatting; this file covers what tools can't. Where a rule and the surrounding code disagree, follow the rule in new code and don't reformat unrelated lines.

## Python / Django (backend/)

**Tooling (config in `backend/setup.cfg`):** black + isort (profile black, line length 120) + flake8. Quote style is pending [OPS-2](../../docs/AUDIT.md#ops-2): until the formatting commit lands, match the file (single quotes).

**Types:** new or changed functions get type hints on parameters and return values. `mypy` + `django-stubs` are configured but not enforced yet; don't add `# type: ignore` without a reason in the comment.

**Naming:**
- Modules, functions, variables: `snake_case`. Classes: `PascalCase`. Constants: `UPPER_SNAKE`.
- Boolean fields/properties read as questions: `is_archived`, `is_billed`, `is_overdue`.
- API views: `<Model><Action>View` (`InvoiceMarkPaidView`). Serializers: `<Model>Serializer`, `<Model>WriteSerializer` for input-only shapes.
- URL paths: kebab-case, plural nouns, actions as sub-resources (`/api/invoices/{id}/mark-paid/`). JSON keys: `snake_case`, identical to model field names unless there's a reason.
- Tests: `tests/test_<area>.py`, `class Test<Thing>`, `def test_<behaviour>_<condition>` (`test_mark_paid_rejects_draft`).

**Idioms:**
- Money: `Decimal` only, never `float`. Literals as strings: `Decimal('0.01')`. Quantize with `ROUND_HALF_UP`.
- Time: `django.utils.timezone.now()`, never `datetime.now()`. Dates vs datetimes are not interchangeable.
- Business rules and state transitions live in model methods (`invoice.mark_as_paid()`), not in views or serializers. Views stay thin: auth → load scoped object → call method → serialize.
- Every `get_queryset()` and related-field queryset filters by `request.user`.
- Multi-row writes in `transaction.atomic()`. Avoid new signals for business logic; call the logic explicitly.
- Avoid N+1: `select_related` / `prefetch_related` / `annotate` in `get_queryset`, not per-row `SerializerMethodField` queries.
- Validation errors return 400 with DRF's error shape; never let `ValueError`/`ValidationError` from parsing reach a 500.
- Migrations: one per change, never edit an applied one, name it (`--name invoice_currency`). Data migrations are separate from schema migrations.
- Celery tasks take IDs, not model instances; they re-fetch, check state, and are safe to run twice.
- No print debugging left in code; use `logging.getLogger(__name__)`.

## JavaScript / React (frontend/)

**Tooling:** ESLint (`frontend/.eslintrc.cjs`, `--max-warnings 0`). Prettier arrives with [OPS-8](../../docs/AUDIT.md#ops-8); until then match the file (2-space indent, single quotes, no semicolons where the file omits them).

**Types:** no TypeScript yet. New utilities get JSDoc `@param`/`@returns` for non-obvious shapes. If TypeScript is adopted, it starts in `strict: true`; record that decision in an ADR.

**Naming:**
- Components and their files: `PascalCase.jsx`, one component per file. Hooks: `useThing.js`. Utilities: `camelCase.js`.
- Pages in `src/pages/<Area>/<Area><View>.jsx` (`Invoices/InvoiceDetail.jsx`).
- Event handlers `handleX`, props callbacks `onX`, booleans `isX`/`hasX`.

**Idioms:**
- Function components + hooks only. Effects declare all dependencies; fetch functions used by effects are defined inside the effect or wrapped in `useCallback`.
- All HTTP goes through `src/api/client.js` / `src/api/endpoints.js`; no `fetch` or raw `axios` in components.
- Money: display server-computed values; format with the shared `formatCurrency(amount, currency)` from `src/utils/formatters.js`. Never `parseFloat` a money string for arithmetic that is saved.
- Dates: date-only strings (`YYYY-MM-DD`) are parsed as local dates, never `new Date('YYYY-MM-DD')`.
- Reuse `src/components/ui/*` before writing new markup. Styling is Tailwind utility classes; no inline `style` except computed values (e.g. chart widths).
- Every page handles loading, empty, and error states separately.
- Accessibility: every input has a linked `<label>`; icon-only buttons have `aria-label`; interactive things are buttons or links, not clickable `div`/`tr`.

## Both sides

- Smallest change that fully solves the task; delete dead code you make obsolete, don't comment it out.
- Comments explain *why*, not *what*. Reference audit IDs for non-obvious constraints: `# Quantize before summing: DATA-3`.
- No new dependency when a few lines or the standard library will do; justify every new one in the PR.
