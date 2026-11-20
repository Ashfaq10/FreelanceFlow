import { PDFArray, PDFDocument, decodePDFRawStream } from '@cantoo/pdf-lib'
import { describe, expect, it } from 'vitest'
import { PdfToolError, addPageNumbers, addWatermark, cropPages, mergePdfs } from './pdfTools'

async function blankPdf(pages) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i += 1) doc.addPage([400, 300])
  return doc.save()
}

/** The strings drawn on each page, decoded from the saved content streams (standard fonts write them as hex). */
async function pageTexts(bytes) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((page) => {
    const contents = page.node.Contents()
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents]
    const source = refs
      .map((ref) => doc.context.lookup(ref))
      .map((stream) => Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1'))
      .join('\n')
    return [...source.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)]
      .map(([, hex]) => Buffer.from(hex, 'hex').toString('latin1'))
      .join(' ')
  })
}

describe('pdfTools', () => {
  it('numbers every page with the chosen format, counting from the start value', async () => {
    const out = await addPageNumbers(await blankPdf(3), { format: 'Page {n} of {total}', start: 5 })

    expect(await pageTexts(out)).toEqual(['Page 5 of 7', 'Page 6 of 7', 'Page 7 of 7'])
  })

  it('stamps the watermark on every page', async () => {
    const out = await addWatermark(await blankPdf(2), { text: 'DRAFT' })

    expect(await pageTexts(out)).toEqual(['DRAFT', 'DRAFT'])
  })

  it('appends the pages of other files in order', async () => {
    const out = await mergePdfs(await blankPdf(1), [await blankPdf(2), await blankPdf(3)])

    expect((await PDFDocument.load(out)).getPageCount()).toBe(6)
  })

  it('crops the visible box of every page', async () => {
    const out = await cropPages(await blankPdf(2), { top: 10, right: 20, bottom: 30, left: 40 })

    const box = (await PDFDocument.load(out)).getPage(1).getCropBox()
    expect([box.x, box.y, box.width, box.height]).toEqual([40, 30, 340, 260])
  })

  it('refuses input it cannot honour, with a message a person can act on', async () => {
    const pdf = await blankPdf(1)

    await expect(addWatermark(pdf, { text: '  ' })).rejects.toThrow(PdfToolError)
    await expect(addWatermark(pdf, { text: '水印' })).rejects.toThrow(/Latin/)
    await expect(addPageNumbers(pdf, { format: 'no number' })).rejects.toThrow(/\{n\}/)
    await expect(cropPages(pdf, { top: 200, bottom: 200 })).rejects.toThrow(/almost nothing/)
    await expect(mergePdfs(pdf, [])).rejects.toThrow(/at least one/)
    await expect(mergePdfs(new Uint8Array([1, 2, 3]), [pdf])).rejects.toThrow(/could not be read/)
  })
})
