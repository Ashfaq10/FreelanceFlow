import { PDFDocument, StandardFonts, degrees, rgb } from '@cantoo/pdf-lib'

/**
 * Whole-document PDF edits that the viewer has no button for. Each takes the PDF's bytes and returns new bytes,
 * so the editor can reopen the result and undo is "open the previous tab". Nothing here touches the network.
 *
 * Limits, shown in the dialogs: a rewritten file no longer carries a valid digital signature, and the text
 * tools use the standard Helvetica font, which covers Latin letters only.
 */

export class PdfToolError extends Error {}

const POSITIONS = {
  'top-left': { h: 'left', v: 'top' },
  'top-center': { h: 'center', v: 'top' },
  'top-right': { h: 'right', v: 'top' },
  'bottom-left': { h: 'left', v: 'bottom' },
  'bottom-center': { h: 'center', v: 'bottom' },
  'bottom-right': { h: 'right', v: 'bottom' },
}

export const NUMBER_POSITIONS = Object.keys(POSITIONS)

async function load(bytes) {
  try {
    return await PDFDocument.load(bytes)
  } catch (error) {
    if (/encrypted/i.test(String(error?.message))) {
      throw new PdfToolError('This PDF is password-protected. Unlock it in the viewer first.')
    }
    throw new PdfToolError('This file could not be read as a PDF.')
  }
}

function hexToRgb(hex = '#000000') {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new PdfToolError('Colours must look like #336699.')
  const value = parseInt(match[1], 16)
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
}

/** The standard fonts cannot draw every character; say so instead of failing with an encoder error. */
function checkLatin(font, text) {
  const drawable = new Set(font.getCharacterSet()) // the encoder quietly swaps unknown characters, so ask first
  if ([...text].some((char) => !drawable.has(char.codePointAt(0)))) {
    throw new PdfToolError('Use Latin letters, digits and common punctuation: this tool cannot draw other scripts.')
  }
}

/** Visible-page rotation changes which edge is "bottom"; draw in the page's own coordinates and let rotation apply. */
export async function addWatermark(bytes, { text, size = 72, opacity = 0.2, angle = 45, color = '#808080' }) {
  const label = String(text ?? '').trim()
  if (!label) throw new PdfToolError('Type the watermark text.')
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  checkLatin(font, label)
  const radians = (angle * Math.PI) / 180

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    // Shrink the text until it fits across the page (its diagonal when rotated) instead of running off the edge.
    const room = (Math.hypot(width, height) * 0.9) / Math.max(font.widthOfTextAtSize(label, 1), 1)
    const fitted = Math.min(size, room)
    const textWidth = font.widthOfTextAtSize(label, fitted)
    const textHeight = font.heightAtSize(fitted, { descender: false })
    // The text origin is its baseline-left corner; move it so the text's centre lands on the page's centre.
    const x = width / 2 - ((textWidth / 2) * Math.cos(radians) - (textHeight / 2) * Math.sin(radians))
    const y = height / 2 - ((textWidth / 2) * Math.sin(radians) + (textHeight / 2) * Math.cos(radians))
    page.drawText(label, { x, y, size: fitted, font, color: hexToRgb(color), opacity, rotate: degrees(angle) })
  }
  return doc.save()
}

export async function addPageNumbers(
  bytes,
  { position = 'bottom-center', format = '{n}', start = 1, size = 10, margin = 28 }
) {
  const place = POSITIONS[position]
  if (!place) throw new PdfToolError('Pick where the numbers go.')
  if (!format.includes('{n}')) throw new PdfToolError('The format needs {n} where the number goes.')
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  pages.forEach((page, index) => {
    const label = format
      .replaceAll('{n}', String(start + index))
      .replaceAll('{total}', String(start + pages.length - 1))
    checkLatin(font, label)
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(label, size)
    const x = place.h === 'left' ? margin : place.h === 'center' ? (width - textWidth) / 2 : width - margin - textWidth
    const y = place.v === 'bottom' ? margin : height - margin - size
    page.drawText(label, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) })
  })
  return doc.save()
}

/** Append the pages of other PDFs after the current one, in the order given. */
export async function mergePdfs(bytes, others) {
  if (!others.length) throw new PdfToolError('Choose at least one PDF to add.')
  const doc = await load(bytes)
  for (const other of others) {
    const source = await load(other)
    const copied = await doc.copyPages(source, source.getPageIndices())
    copied.forEach((page) => doc.addPage(page))
  }
  return doc.save()
}

/** Trim the visible area of every page by the given margins, in points (72 per inch). Content is hidden, not deleted. */
export async function cropPages(bytes, { top = 0, right = 0, bottom = 0, left = 0 }) {
  const margins = [top, right, bottom, left].map(Number)
  if (margins.some((value) => !Number.isFinite(value) || value < 0))
    throw new PdfToolError('Margins must be zero or more.')
  const doc = await load(bytes)
  for (const page of doc.getPages()) {
    const box = page.getCropBox()
    const width = box.width - margins[1] - margins[3]
    const height = box.height - margins[0] - margins[2]
    if (width < 36 || height < 36) throw new PdfToolError('That would leave almost nothing of the page.')
    page.setCropBox(box.x + margins[3], box.y + margins[2], width, height)
  }
  return doc.save()
}
