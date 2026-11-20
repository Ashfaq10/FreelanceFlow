import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'
import * as observability from '../observability'

function Broken() {
  throw new Error('render failed')
}

describe('ErrorBoundary', () => {
  it('replaces a crashed page with a retry prompt and reports the error', () => {
    const report = vi.spyOn(observability, 'reportError').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something broke')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'render failed' }))
  })
})
