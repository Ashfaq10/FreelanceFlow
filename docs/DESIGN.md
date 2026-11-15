# Design

## Source of truth

- Figma: [ivory-potential (dev mode)](https://www.figma.com/design/j09aE7hWuwb9E8MBWO4EyD/ivory-potential?node-id=11188-36071&m=dev)

## Open decisions

| Topic | Current state | Decision needed | Tracked in |
|---|---|---|---|
| Product name | **Decided 2026-11-15: the product is FreelanceFlow, made by Penough.** One `Wordmark` component (`components/ui/Wordmark.jsx`) is the only brand mark in the SPA | — | [UX-6](AUDIT.md#ux-6) |
| Dark mode | **Decided 2026-11-15:** `ThemeProvider` (`context/ThemeContext.jsx`) owns light / dark / system; header, auth pages and Settings → Appearance use `useTheme()`. Saved per browser in `localStorage.theme`, applied by a tiny script in `index.html` before first paint | Per-account sync would need a backend field; not planned | [UX-5](AUDIT.md#ux-5) |
| Invoice templates | Six layouts (professional, classic, modern, minimal, bold, compact) × seven accent colours. Saved on the invoice (`pdf_template`, `pdf_color`); the SPA preview (`components/invoice/`) and the PDF (`layout-<id>` blocks in `invoice_pdf.html`) share the choice. The preview sits on white paper in both themes | Decided 2026-11-15 | [BUG-16](AUDIT.md#bug-16) |

## Auth pages (sign in, sign up, forgot and reset password)

Redesigned 2026-11-15. All four use `components/auth/AuthShell.jsx`, so the flow looks like one thing.

- **Idea:** the first thing a visitor sees is the product doing its job. A sample invoice goes from *Sent* to *Paid* once, 1.8 s after load (`SampleInvoice.jsx`). With `prefers-reduced-motion` it shows *Paid* immediately. It is labelled "Sample invoice" and hidden from screen readers.
- **Layout:** dark left panel (`primary-900`, headline + invoice), form directly on the page on the right, left-aligned, 24 rem wide. Below `lg` the panel is dropped and the wordmark sits above the form.
- **Colour:** brand blue only; the one extra colour is green for "Paid". The submit button is solid `primary-600` (`AUTH_SUBMIT`); the app's gradient button stays inside the app.
- **Type:** Inter. Headline 600 with -0.02em tracking; money uses tabular numerals.
- **Forms:** labels tied to inputs (`Input` now generates the `id`), errors use `role="alert"`, `autoComplete` is set, show/hide password has an accessible name. Copy names the problem ("Enter your email"), not the rule.
- **Avoided on purpose:** outlined or gradient headline text, grid overlays, benefit checklists, card-inside-a-panel.

## UI conventions

- Tailwind CSS 3, Inter font, `lucide-react` icons. Prettier formats `frontend/src` (no semicolons, single quotes, 120 columns).
- **Check every screen at 1920, 1440, 1024, 768 and 390 px before shipping.** Four-up card grids start at `xl` (1280 px); tables drop their least useful columns below `xl`/`lg`; `xs` is 480 px.
- Shared primitives live in `frontend/src/components/ui/` (`Button`, `Input`, `Select`, `Modal`, `Table`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `StatsCard`, `Pagination`, `Wordmark`). Use them before adding new markup.
- Money is always shown with the invoice's currency; never hardcode `$` (see [BUG-5](AUDIT.md#bug-5)).
