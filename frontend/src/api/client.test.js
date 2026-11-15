import { http, HttpResponse } from 'msw'
import toast from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import api from './client'

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))

describe('api client', () => {
  beforeEach(() => {
    // jsdom cannot navigate; a plain copy of location records the redirect (axios still needs origin/href).
    const { href, origin, protocol, host, hostname, port, pathname } = window.location
    vi.stubGlobal('location', { href, origin, protocol, host, hostname, port, pathname })
    vi.mocked(toast.error).mockClear()
  })

  it('sends the stored token', async () => {
    localStorage.setItem('token', 'abc123')
    server.use(
      http.get('*/api/auth/user/', ({ request }) => HttpResponse.json({ auth: request.headers.get('Authorization') }))
    )

    const response = await api.get('/api/auth/user/')

    expect(response.data.auth).toBe('Token abc123')
  })

  it('clears the token and redirects to /login when an authenticated request 401s', async () => {
    localStorage.setItem('token', 'expired')
    server.use(http.get('*/api/invoices/', () => new HttpResponse(null, { status: 401 })))

    await expect(api.get('/api/invoices/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem('token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('leaves a failed login to the page, without redirecting (BUG-1)', async () => {
    server.use(
      http.post('*/api/auth/login/', () => HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 }))
    )

    await expect(api.post('/api/auth/login/', { email: 'a@b.c', password: 'nope' })).rejects.toMatchObject({
      response: { status: 401, data: { message: 'Invalid email or password' } },
    })

    expect(window.location.href).toBe('http://localhost:3000/')
  })

  it('keeps the session on a server error', async () => {
    localStorage.setItem('token', 'abc123')
    server.use(http.get('*/api/auth/user/', () => new HttpResponse(null, { status: 500 })))

    await expect(api.get('/api/auth/user/')).rejects.toMatchObject({ response: { status: 500 } })

    expect(localStorage.getItem('token')).toBe('abc123')
    expect(window.location.href).toBe('http://localhost:3000/')
    expect(toast.error).toHaveBeenCalledWith('Server error. Please try again later.')
  })
})
