# Design

## Source of truth

- Figma: [ivory-potential (dev mode)](https://www.figma.com/design/j09aE7hWuwb9E8MBWO4EyD/ivory-potential?node-id=11188-36071&m=dev)

## Open decisions

| Topic | Current state | Decision needed | Tracked in |
|---|---|---|---|
| Product name | "Penough" (`index.html`, `Login.jsx`, logos), "FreelanceFlow" (`Signup.jsx`, `ForgotPassword.jsx`, emails, README), "BugValluk-style" (an `InvoicePreview.jsx` template description) | Choose one name and apply it everywhere | [UX-6](AUDIT.md#ux-6) |
| Dark mode | Toggle copied into each auth page and `Header`; Settings → Appearance does nothing | One theme provider, persisted per user | [UX-5](AUDIT.md#ux-5) |
| Invoice templates | 6 templates in `InvoicePreview.jsx`; the PDF ignores the template and colour choices | Either render the selected template in the PDF or drop the picker | [BUG-16](AUDIT.md#bug-16) |

## UI conventions

- Tailwind CSS 3, Inter font, `lucide-react` icons.
- Shared primitives live in `frontend/src/components/ui/` (`Button`, `Input`, `Select`, `Modal`, `Table`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `StatsCard`). Use them before adding new markup.
- Money is always shown with the invoice's currency; never hardcode `$` (see [BUG-5](AUDIT.md#bug-5)).
