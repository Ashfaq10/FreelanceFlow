import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

/**
 * "Edit text" = redact and redraw. PDF text is positioned glyphs, not paragraphs, so the original characters are
 * removed from the file for good (not just covered) and the new text is drawn in their place as a text box.
 * There is no reflow: text longer than the original overlaps what follows, which the dialog warns about.
 */

export const FONTS = {
  helvetica: { label: 'Helvetica (sans-serif)', standard: StandardFonts.Helvetica },
  'times-roman': { label: 'Times (serif)', standard: StandardFonts.TimesRoman },
  courier: { label: 'Courier (monospace)', standard: StandardFonts.Courier },
}

export class ReplaceTextError extends Error {}

const union = (rects) => {
  const left = Math.min(...rects.map((r) => r.x))
  const top = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.width))
  const bottom = Math.max(...rects.map((r) => r.y + r.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** What the person selected: its text, where it is, and a first guess at its size (a line is about 1.15 x the font size). */
export async function readSelection(viewer) {
  const selection = viewer.get('selection')
  if (!selection.hasSelection()) throw new ReplaceTextError('Select the text you want to change first.')
  const pages = selection.listSelectedPages()
  if (pages.length !== 1) throw new ReplaceTextError('Select text on one page at a time.')
  const [page] = pages
  const rects = await selection.listRects(page)
  if (!rects.length) throw new ReplaceTextError('Select the text you want to change first.')
  const text = (await selection.readText()).replace(/\s*\n\s*/g, ' ').trim()
  return { page, rects, box: union(rects), text, fontSize: Math.max(6, Math.round(rects[0].height / 1.15)) }
}

/** Width in points of `text` in a standard font, for the overflow warning. */
export async function measure(fontKey, size, text) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(FONTS[fontKey].standard)
  const drawable = new Set(font.getCharacterSet())
  if ([...text].some((char) => !drawable.has(char.codePointAt(0)))) return null // outside the font: cannot say
  return font.widthOfTextAtSize(text, size)
}

export async function replaceSelection(viewer, seed, { text, fontFamily, fontSize, color }) {
  const redaction = viewer.get('redaction')
  const annotation = viewer.get('annotation')
  if ((await redaction.listPending?.())?.length) {
    throw new ReplaceTextError(
      'Apply or clear your pending redaction marks first, so they are not applied by accident.'
    )
  }
  if ((await measure(fontFamily, fontSize, text)) === null) {
    throw new ReplaceTextError(
      'The new text has characters this font cannot draw. Use Latin letters, digits and punctuation.'
    )
  }

  // A redaction leaves a black box by default; here the page must show through where the old text was.
  const previous = redaction.getSettings().overlay
  redaction.updateSettings({ overlay: { fill: null } })
  try {
    for (const rect of seed.rects) {
      await redaction.markArea(seed.page, {
        x: rect.x - 0.5,
        y: rect.y - 0.5,
        width: rect.width + 1,
        height: rect.height + 1,
      })
    }
    await redaction.applyAll()
  } finally {
    redaction.updateSettings({ overlay: previous })
  }

  const width = Math.max(seed.box.width, (await measure(fontFamily, fontSize, text)) + 2)
  await annotation.create(seed.page, {
    subtype: 'free-text',
    // A text box centres its lines a little high against the original baseline; nudge it down to match.
    box: { x: seed.box.x, y: seed.box.y + fontSize * 0.1, width, height: seed.box.height },
    contents: text,
    fontFamily,
    fontSize,
    fontColor: color,
    color,
    strokeWidth: 0,
    verticalAlign: 'middle',
  })
}
