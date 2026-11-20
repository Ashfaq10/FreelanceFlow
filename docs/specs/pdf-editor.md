# PDF editor (Phases 0-4 built 2026-11-20; see "Built" below)

**Goal:** open any PDF in FreelanceFlow, change it (text, images, pages, forms, signatures, redactions) and download the result, without the file leaving the user's device unless they ask for a server-side tool.

This contradicts nothing in PLAN.md's non-goals, but it is a second product next to invoicing. PLAN.md says to change the plan first: write ADR-0003 and add a "Tools" line to PLAN.md before any code.

## Built

Decisions taken: signed-in users only, open source only, browser-only, invoice copies are download-only (ADR-0003). The route is `/pdf-editor` (sidebar "PDF Editor"); "Edit PDF copy" in an invoice's More menu and "Edit PDF" on a quote open a copy with a banner.

| Tool | Where it comes from |
|---|---|
| View, zoom, thumbnails, search, copy text, print, download; several PDFs in tabs | EmbedPDF viewer |
| Highlight, underline, strike, notes, free-text boxes, shapes, arrows, freehand, comments | EmbedPDF viewer |
| Images, stamps, draw/type/upload signature, fill forms, build form fields | EmbedPDF viewer |
| True redaction, rotate/move/insert/duplicate/delete pages, metadata, attachments, outline | EmbedPDF viewer |
| **Edit text** (select text, type the replacement) | `replaceText.js`: redact the selection for good, draw a text box in its place |
| **Watermark, page numbers, add pages from other PDFs, crop** | `pdfTools.js` on `@cantoo/pdf-lib`: download the bytes, transform, reopen in the same tab |

Phase 0 spike result: PDFium (through EmbedPDF) has no API to rewrite existing text in place, so Tier B is redact-and-redraw, verified end to end in a browser and in Playwright (the original words are gone from the file, the new ones survive a later rewrite). Moving an existing image is not supported; delete it with the redaction tool and place the image again with the image/stamp tool.

Not built: server-side OCR, compression, password protection and Word conversion (Phase 5, tied to the deploy work), true paragraph reflow, touch-specific polish beyond what the viewer gives.

Tests: `pdfTools.test.js` (content decoded from the saved PDFs), `PdfEditor.test.jsx` (file validation, copy banner), `e2e/pdf-editor.spec.js` (replace text, page numbers, download, nothing uploaded, invoice copy, axe on the chooser and dialogs in both themes), fixture `e2e/fixtures/sample.pdf`.

## What "edit anything" can honestly mean

A PDF is a page-description format, not a document. Text is positioned glyphs, not paragraphs, so no tool reflows an arbitrary PDF like Word. The plan therefore promises three tiers.

| Tier | What | How | Confidence |
|---|---|---|---|
| A. Solid | View, zoom, thumbnails; rotate, reorder, delete, insert, extract, merge, split pages; highlight, underline, strike, notes, shapes, arrows, freehand; add text boxes; add images, logos, stamps; draw/type/upload signature; fill forms, create form fields; true redaction; watermark, page numbers, header/footer, crop; metadata; undo/redo; flatten; download | PDFium (WASM) + a composition library | High |
| B. In-place edit of existing content | Click existing text and change it (same font where the glyphs exist, else an embedded substitute); delete, move, resize an existing image; replace text by redact-and-redraw as the fallback | PDFium page-object API; fallback: redact + draw. No reflow, so longer text can overflow its box | Medium. Needs the Phase 0 spike |
| C. Cannot promise | Word-style paragraph reflow; editing scanned pages without OCR first; fonts that lack the needed glyphs; keeping a digital signature valid after an edit; bypassing owner-password restrictions | OCR (server) turns scans into Tier B; everything else is shown as a clear limit in the UI | Low or never |

## Where it lives

- **SPA route** `/pdf-editor`, lazy-loaded so the entry chunk stays under 300 KB (the engine is about 3 MB and loads only here). Sidebar entry "PDF Editor" under "More".
- **Entry points:** "Edit PDF" in the invoice detail menu (opens the generated PDF in the editor), same for quotes and credit notes, plus drag-and-drop on the editor page.
- **Frontend layout:** `frontend/src/pages/PdfEditor/` with `PdfEditor.jsx`, `Toolbar`, `PageSidebar`, `Canvas`, `tools/` (one file per tool), `useEditorHistory.js`, and `engine.js`, a thin adapter so the engine can be swapped (open-source to commercial) without touching the tools.
- **Backend:** nothing for Phases 1-4. Phase 5 adds `apps/pdftools` (Celery) for the things a browser cannot do well.
- **Data rule:** an edited invoice PDF is a separate download. It never replaces the stored invoice PDF, because the ledger and a hand-edited PDF must not drift apart (AGENTS.md money rules). The editor shows a banner when the source is a FreelanceFlow invoice.

## Stack (recommended, open source)

| Job | Choice | Why / caveat |
|---|---|---|
| Render, text geometry, annotations, forms, redaction, page ops, save | EmbedPDF engine (PDFium in WASM, MIT) | Runs in a Web Worker, nothing uploaded, undo/redo grouping built in. Young project: pin the version |
| Fonts, images, watermark, page numbers, metadata, composition | `@cantoo/pdf-lib` (MIT, maintained fork; the original `pdf-lib` has been dormant since 2021) | Cannot edit existing text; used only to add content |
| Fallback renderer and text layer | pdf.js (Apache-2.0) | Only if PDFium struggles on a file class |
| Server tools (Phase 5) | qpdf (Apache-2.0) for passwords, linearize; OCRmyPDF/Tesseract (MPL/Apache) for OCR; LibreOffice headless for Word/Excel conversion | Run in a locked-down worker container |

**Avoid:** PyMuPDF/MuPDF and Ghostscript are AGPL. Using them in this app would force AGPL on it (the repo is MIT) unless we buy a licence.

**Commercial alternative:** Nutrient (PSPDFKit), Apryse or Foxit ship Tier B (real content editing) sooner and more reliably, at a licence cost per domain or seat and with a closed codebase. Decide in Phase 0 after the spike shows how far the open stack gets.

## Phases (rough solo estimates; Phase 4 is uncertain)

0. **Spike, 2-3 days.** Load about 25 representative PDFs (generated invoices, scans, forms, huge, encrypted, CJK, signed, broken) into EmbedPDF. Try text and image edit through the page-object API. Measure memory and time. Output: go/no-go and the engine choice.
1. **Viewer and pages (M).** Open by file or drag-drop, zoom, thumbnails, page rotate/reorder/delete/insert/merge/split/extract, undo/redo, save/download.
2. **Annotate and add content (M-L).** Highlight/underline/strike/notes/shapes/freehand, text boxes, images, stamps, signatures (draw, type, upload).
3. **Forms and clean-up (M).** Fill forms, create fields, true redaction, watermark, page numbers, header/footer, crop, metadata, flatten.
4. **Edit existing content (L, risky).** Tier B: replace text, move/delete/resize images, redact-and-redraw fallback, font matching, overflow warnings.
5. **Server tools (L).** OCR (unlocks Tier B on scans), compress, password protect/unlock, PDF to Word/image. `apps/pdftools`, per-user scoping, size and page limits, temp-file cleanup, throttle, OpenAPI entry, a cross-user test.
6. **Polish (M).** Keyboard and screen-reader support where a canvas allows it, touch/mobile, IndexedDB draft recovery, i18n.

MVP is Phases 1-3 (about 3-4 weeks). Phase 4 may add 2-4 weeks or end in "buy the commercial SDK".

## Security and privacy

- Process in the browser by default; Playwright asserts that no network request carries the file.
- CSP needs `'wasm-unsafe-eval'` for the worker; update the Caddyfile and keep frame-ancestors none.
- No JavaScript inside PDFs is executed; no external fetch from a PDF.
- Hard limits: file size (start at 100 MB), page count, memory; refuse gracefully.
- Warn before editing a digitally signed PDF (the signature will break) and when the PDF has owner restrictions.
- Server tools (Phase 5): uploads go to a short-lived private store, run in a sandboxed worker with CPU/time/memory caps, are deleted after download, and are never logged or sent to Sentry.

## Testing

- A small, licence-clean corpus in `frontend/e2e/fixtures/pdf/` (generate most with WeasyPrint; add a form, a scan, an encrypted and a signed file).
- Fidelity: render page N before and after each tool and compare with a tolerance; save, reopen, and run `qpdf --check` on the output in CI.
- Playwright flows per phase (open, edit, download, reopen); network assertion for privacy; axe on the toolbar and dialogs.
- Round-trip in Chrome, pdf.js and one desktop viewer by hand before each release.

## Decisions needed before Phase 0

1. Open-source stack first, or buy a commercial SDK for real content editing?
2. Client-only, or may files go to the server for OCR, compression and conversion (Phase 5)?
3. Only for logged-in FreelanceFlow users, or also a public free tool? (A public tool needs abuse limits and probably a separate deployment.)
4. Should "Edit PDF" on an invoice be able to attach the edited copy to the invoice, or stay download-only (recommended)?
