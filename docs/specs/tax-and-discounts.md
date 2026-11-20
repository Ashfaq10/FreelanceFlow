# Per-line tax, several rates, percentage discounts (FEAT-4)

**Goal:** invoice a mix of 20% and 5% (or exempt) lines correctly, and discount by a percentage.

**Behaviour**
- `InvoiceItem.tax_rate` (0-100, optional). Empty means "use the invoice's `tax_rate`", so every existing invoice keeps its numbers.
- `Invoice.discount_percent` (0-100) is the alternative to a fixed `discount_amount`; sending both above zero is a 400. With a percentage, the server stores the computed money in `discount_amount`, so PDFs, the public page and CSV keep reading one field.
- Totals, all in `Decimal`, half-up to the cent:
  1. `subtotal` = sum of line totals; `discount` = fixed amount or `subtotal * percent / 100`, never more than the subtotal.
  2. Lines are grouped by effective rate. The discount is shared across groups in proportion to their subtotal (the last group takes the rounding remainder), so it lowers each group's taxable base.
  3. `tax` per group = `round(taxable * rate / 100)`; `tax_amount` is their sum; `total = subtotal - discount + tax_amount`.
  With one rate this is the old formula to the cent.
- `tax_breakdown` (`[{rate, taxable, tax}]`) is on the invoice detail and public page; the PDF, the SPA preview and the public page print one tax row per rate.
- The invoice form has an optional "Tax %" per line and a fixed/percent switch for the discount, with an integer-cent preview that mirrors the server.

**Non-goals:** tax-inclusive prices, compound taxes, tax names/jurisdictions, per-line discounts.

**Tests:** single-rate totals unchanged; two rates with a discount sum exactly; percent discount stored as money; both discounts at once rejected; duplicate copies line rates; Vitest mirror of the same cases.
