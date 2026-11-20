import { expect, test } from '@playwright/test'

// TEST-5: the path a freelancer takes from sign-up to a paid invoice with a PDF in hand.
test('sign up → client → invoice → send → mark paid → download PDF', async ({ page }) => {
  const email = `smoke-${Date.now()}@example.com`

  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('tr0ubled-gardener')
  await page.getByLabel('Confirm password').fill('tr0ubled-gardener')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/clients/new')
  await page.getByLabel('Contact Name').fill('Ada Lovelace')
  await page.getByLabel('Email').fill('ada@example.com')
  await page.getByRole('button', { name: 'Create Client' }).click()
  await expect(page).toHaveURL('/clients')

  await page.goto('/invoices/new')
  await page.getByLabel('Client').selectOption({ index: 1 })
  await page.getByLabel('Line 1 description').fill('Design work')
  await page.getByLabel('Line 1 quantity').fill('2')
  await page.getByLabel('Line 1 rate').fill('150')
  await page.getByRole('button', { name: 'Save & Send' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)

  // Celery runs eagerly under config.settings.e2e, so the invoice is "sent" once the page reloads its status.
  await page.getByRole('button', { name: 'Mark Paid' }).click()
  await expect(page.getByRole('button', { name: 'Mark Paid' })).toBeHidden()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ])
  const chunks = []
  for await (const chunk of await download.createReadStream()) chunks.push(chunk)
  expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe('%PDF')
})
