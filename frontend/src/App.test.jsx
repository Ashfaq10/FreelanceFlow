import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { server } from './test/server'

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )

describe('routing', () => {
  beforeEach(() => {
    server.use(http.get('*/api/auth/user/', () => new HttpResponse(null, { status: 401 })))
  })

  it('shows a not-found page for an address that does not exist (UX-3)', async () => {
    at('/no/such/page')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to your dashboard' })).toHaveAttribute('href', '/')
  })

  it('still sends a signed-out visitor from a private page to sign in', async () => {
    at('/invoices')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
