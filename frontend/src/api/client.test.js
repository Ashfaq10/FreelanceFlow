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

  it('echoes the CSRF cookie as a header on writes and never sends a token (SEC-5)', async () => {
    document.cookie = 'csrftoken=abc123'
    server.use(
      http.post('*/api/invoices/', ({ request }) =>
        HttpResponse.json({ csrf: request.headers.get('X-CSRFToken'), auth: request.headers.get('Authorization') })
      )
    )

    const response = await api.post('/api/invoices/', {})

    expect(response.data).toEqual({ csrf: 'abc123', auth: null })
  })

  it('redirects to /login when a request outside /api/auth/ 401s (session ended)', async () => {
    server.use(http.get('*/api/invoices/', () => new HttpResponse(null, { status: 401 })))

    await expect(api.get('/api/invoices/')).rejects.toMatchObject({ response: { status: 401 } })

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

  it('does not redirect on a server error', async () => {
    server.use(http.get('*/api/auth/user/', () => new HttpResponse(null, { status: 500 })))

    await expect(api.get('/api/auth/user/')).rejects.toMatchObject({ response: { status: 500 } })

    expect(window.location.href).toBe('http://localhost:3000/')
    expect(toast.error).toHaveBeenCalledWith('Server error. Please try again later.')
  })
})
