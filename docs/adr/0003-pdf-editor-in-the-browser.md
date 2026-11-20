# 0003 — A browser-side PDF editor for signed-in users

- Status: Accepted (2026-11-20); spec in [docs/specs/pdf-editor.md](../specs/pdf-editor.md)
- Date: 2026-11-20

## Context

Freelancers handle PDFs beyond their own invoices: contracts to sign, scans to annotate, forms to fill, a quote to stamp. The owner asked for a general PDF editor inside FreelanceFlow, usable by signed-in users only, built on open-source parts.

This is a second capability next to invoicing, so PLAN.md changes first (this ADR and the "Tools" line there).

## Decision

1. **Signed-in users only.** The route sits behind `PrivateRoute`. No public tool, so no anonymous abuse surface.
2. **The file never leaves the browser.** Rendering, editing and saving run in the EmbedPDF engine (PDFium compiled to WebAssembly, MIT) in a Web Worker. The backend gets no PDF endpoint; there is nothing to store, scan, throttle or leak.
3. **Open source only.** EmbedPDF's ready-made viewer (`@embedpdf/viewer-react`, MIT) for the standard tools (annotate, shapes, stamps, signatures, forms, redaction, page organisation, search), `@cantoo/pdf-lib` (MIT) for watermark, page numbers, merge and crop. No commercial SDK, no AGPL library (PyMuPDF, MuPDF, Ghostscript) because the repo is MIT.
4. **Editing existing text and images is redact-and-redraw.** PDFium exposes no text reflow, so "change this word" removes the original content for good and draws the new text in its place, matched for position, size and colour. The UI says so and warns on overflow.
5. **Invoice PDFs stay the ledger's.** "Edit PDF" on an invoice opens a copy; the result is a download. It never replaces the stored invoice PDF.
6. **Server-side tools (OCR, compression, passwords, Word conversion) are out of scope for now.** They need system binaries and a sandboxed worker; revisit with the deploy work in Phase 7.

## Consequences

- No new Django app, migration or endpoint. The API schema is unchanged.
- The route and its ~3 MB engine are a lazy chunk; the entry chunk stays under 300 KB.
- Caddy's CSP today only sets `frame-ancestors`, which the editor does not need. Any fuller CSP added later must allow `'wasm-unsafe-eval'`, `worker-src 'self'`, `img-src blob: data:` and `trusted-types embedpdf` for the editor route (the vendor's policy is in its docs).
- Browser floor: Chrome/Edge 114, Firefox 125, Safari 17.
- Limits the UI must state: no paragraph reflow, signed PDFs lose their signature when edited, scanned pages are images until OCR exists.
