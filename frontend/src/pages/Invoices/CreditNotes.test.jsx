import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import CreditNotes from './CreditNotes'

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

const invoice = (overrides = {}) => ({
  id: 'inv-1',
  invoice_number: 'INV-2026-001',
  currency: 'USD',
  status: 'sent',
  amount_due: '100.00',
  credit_notes: [],
  ...overrides,
})

describe('CreditNotes', () => {
  it('issues a credit and hands the refreshed invoice to the page', async () => {
    const posted = []
    server.use(
      http.post('*/api/invoices/inv-1/credit-notes/', async ({ request }) => {
        posted.push(await request.json())
        return HttpResponse.json({ id: 'cn-1' }, { status: 201 })
      }),
      http.get('*/api/invoices/inv-1/', () => HttpResponse.json(invoice({ amount_due: '70.00' })))
    )
    const onChange = vi.fn()
    render(<CreditNotes invoice={invoice()} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Issue credit note' }))
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Scope reduced' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Issue credit note' }).at(-1))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ amount_due: '70.00' })))
    expect(posted).toEqual([{ amount: '30', reason: 'Scope reduced' }])
  })

  it('is hidden for a paid invoice with no credits, shown read-only when it has some', () => {
    const { container, rerender } = render(<CreditNotes invoice={invoice({ status: 'paid' })} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()

    rerender(
      <CreditNotes
        invoice={invoice({
          status: 'paid',
          credit_notes: [{ id: 'cn-1', number: 'CN-2026-001', amount: '10.00', reason: 'Goodwill' }],
        })}
        onChange={() => {}}
      />
    )
    expect(screen.getByText(/CN-2026-001/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Issue credit note' })).not.toBeInTheDocument()
  })
})
