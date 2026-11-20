import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import ExportButtons from './ExportButtons'

describe('ExportButtons', () => {
  it('downloads the CSV the API returns under a readable file name', async () => {
    server.use(
      http.get(
        '*/api/exports/payments/',
        () => new HttpResponse('a,b\n1,2\n', { headers: { 'Content-Type': 'text/csv' } })
      )
    )
    window.URL.createObjectURL = vi.fn(() => 'blob:csv')
    window.URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<ExportButtons />)
    fireEvent.click(screen.getByRole('button', { name: 'Payments CSV' }))

    await vi.waitFor(() => expect(click).toHaveBeenCalled())
    expect(window.URL.createObjectURL).toHaveBeenCalledOnce()
  })
})
