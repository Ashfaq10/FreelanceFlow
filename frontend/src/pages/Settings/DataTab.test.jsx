import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import DataTab from './DataTab'

const logout = vi.fn()
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ logout }) }))
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

describe('DataTab', () => {
  it('will not delete without a password and signs out once the server confirms', async () => {
    let body
    server.use(
      http.post('*/api/auth/delete/', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ message: 'deleted' })
      })
    )
    render(<DataTab />)
    const button = screen.getByRole('button', { name: 'Delete my account' })
    expect(button).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Confirm with your password'), { target: { value: 'secret-pass' } })
    fireEvent.click(button)

    await waitFor(() => expect(logout).toHaveBeenCalled())
    expect(body).toEqual({ password: 'secret-pass' })
  })

  it('stays signed in when the password is wrong', async () => {
    logout.mockClear()
    server.use(http.post('*/api/auth/delete/', () => HttpResponse.json({ message: 'wrong' }, { status: 400 })))
    render(<DataTab />)

    fireEvent.change(screen.getByLabelText('Confirm with your password'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete my account' })).toBeEnabled())
    expect(logout).not.toHaveBeenCalled()
  })
})
