import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ActivityTimeline from './ActivityTimeline'

describe('ActivityTimeline', () => {
  it('lists events in the order given, with their detail', () => {
    render(
      <ActivityTimeline
        events={[
          { id: '1', kind: 'created', detail: '', created_at: '2026-11-01T09:00:00Z' },
          { id: '2', kind: 'payment', detail: 'USD 40.00 (Bank Transfer)', created_at: '2026-11-05T10:00:00Z' },
        ]}
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Created')
    expect(items[1]).toHaveTextContent('Payment received · USD 40.00 (Bank Transfer)')
  })

  it('renders nothing for an invoice without history', () => {
    const { container } = render(<ActivityTimeline events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
