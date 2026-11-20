import { expect, test } from '@playwright/test'

const FIXTURE = 'e2e/fixtures/sample.pdf'

async function signUp(page, prefix) {
  await page.goto('/signup')
  await page.getByLabel('Email', { exact: true }).fill(`${prefix}-${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('tr0ubled-gardener')
  await page.getByLabel('Confirm password').fill('tr0ubled-gardener')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/')
}

const hits = (page, text) =>
  page.evaluate(async (query) => {
    const search = window.__pdfViewer.get('search')
    await search.search({ text: query })
    return (await search.listHits()).length
  }, text)

// ADR-0003: the PDF is edited on the device. These checks cover the tools that change the file's content.
test('PDF editor: replace text, add page numbers, download, and nothing is uploaded', async ({ page }) => {
  const uploads = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' && !request.url().includes('/api/auth/'))
      uploads.push(`${request.method()} ${request.url()}`)
  })
  await signUp(page, 'pdf')

  await page.goto('/pdf-editor')
  await page.getByLabel('PDF file').setInputFiles(FIXTURE)
  await page.waitForFunction(() => window.__pdfViewer?.documents.getActive()?.status === 'ready')
  expect(await hits(page, 'Beta Client')).toBe(1)

  // Select the words, then ask for the "Edit text" tool.
  await page.evaluate(async () => {
    const viewer = window.__pdfViewer
    await viewer.get('search').search({ text: 'Beta Client' })
    const [hit] = await viewer.get('search').listHits()
    await viewer.get('selection').select(hit)
    await viewer.commands.execute('ff:edit-text')
  })
  await page.getByLabel('New text').fill('Omega Labs')
  await page.getByRole('button', { name: 'Replace text' }).click()
  await expect(page.getByText('Text replaced')).toBeVisible()

  // The old words are gone from the file, not just covered; the new ones are on the page.
  expect(await hits(page, 'Beta Client')).toBe(0)
  const bytes = await page.evaluate(async () => {
    const viewer = window.__pdfViewer
    return Array.from(new Uint8Array(await viewer.documents.download(viewer.documents.getActive().id)))
  })
  expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe('%PDF')

  await page.evaluate(() => window.__pdfViewer.commands.execute('ff:page-numbers'))
  await page.getByLabel('Format').fill('Sheet {n} of {total}')
  await page.getByRole('button', { name: 'Add numbers' }).click()
  await expect.poll(() => hits(page, 'Sheet 2 of 2'), { timeout: 15_000 }).toBe(1)
  // The replacement is a text box on the page, so it is an annotation (search only reads page text): it must survive.
  const texts = await page.evaluate(() =>
    window.__pdfViewer
      .get('annotation')
      .list({ subtype: 'free-text' })
      .map((each) => each.contents)
  )
  expect(texts).toEqual(['Omega Labs'])

  expect(uploads).toEqual([])
})

test('PDF editor: an invoice opens as a copy and says so', async ({ page }) => {
  await signUp(page, 'copy')
  const csrf = async () => (await page.context().cookies()).find((c) => c.name === 'csrftoken').value
  const post = async (url, data) => {
    const response = await page.request.post(url, { data, headers: { 'X-CSRFToken': await csrf() } })
    expect(response.ok()).toBeTruthy()
    return response.json()
  }
  const client = await post('/api/clients/', { name: 'Ada Lovelace', email: 'ada@example.com' })
  const invoice = await post('/api/invoices/', {
    client: client.id,
    items: [{ description: 'Design work', quantity: 1, rate: 100 }],
  })

  await page.goto(`/invoices/${invoice.id}`)
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: 'Edit PDF copy' }).click()

  await expect(page).toHaveURL('/pdf-editor')
  await expect(page.getByRole('status').filter({ hasText: 'editing a copy of invoice' })).toBeVisible()
  await page.waitForFunction(() => window.__pdfViewer?.documents.getActive()?.status === 'ready')
})

// Our own UI around the viewer (the chooser and the tool dialogs) must stay accessible in both themes.
test('PDF editor: the chooser and the tool dialogs have no axe violations', async ({ page }) => {
  await signUp(page, 'axe')
  // The viewer's own toolbar is EmbedPDF's: scan the whole chooser page, but only our dialog once the viewer is up.
  const violations = (selector) =>
    page.evaluate(async (css) => {
      const context = css ? document.querySelector(css) : document
      return (await window.axe.run(context, { resultTypes: ['violations'] })).violations.map(
        (v) => v.id + ' :: ' + v.nodes.map((n) => n.html.slice(0, 90) + ' ' + (n.any[0]?.message || '')).join(' | ')
      )
    }, selector)
  // Colours animate in (fade-in, dialog entrance); axe must read the settled ones.
  const scan = async (label, selector) => {
    await page.waitForTimeout(700)
    expect(await violations(selector), label).toEqual([])
  }

  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('theme', value), theme)
    await page.goto('/pdf-editor')
    await page.getByRole('heading', { name: 'PDF editor' }).waitFor()
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    await scan(`chooser, ${theme}`)

    await page.getByLabel('PDF file').setInputFiles(FIXTURE)
    await page.waitForFunction(() => window.__pdfViewer?.documents.getActive()?.status === 'ready')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    await page.evaluate(() => window.__pdfViewer.commands.execute('ff:watermark'))
    await page.getByRole('dialog').waitFor()
    await scan(`watermark dialog, ${theme}`, '[role=dialog]')
    await page.keyboard.press('Escape')

    await page.evaluate(async () => {
      const viewer = window.__pdfViewer
      await viewer.get('search').search({ text: 'Alpha Studio' })
      const [hit] = await viewer.get('search').listHits()
      await viewer.get('selection').select(hit)
      await viewer.commands.execute('ff:edit-text')
    })
    await page
      .getByLabel('New text')
      .fill('A much longer replacement than the original words, to show the overflow warning')
    await expect(page.getByRole('alert')).toBeVisible()
    await scan(`edit-text dialog with overflow warning, ${theme}`, '[role=dialog]')
  }
})
