import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Modal from './Modal'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open it</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Record payment" description="Enter an amount.">
        <input aria-label="Amount" />
        <button>Save</button>
      </Modal>
    </>
  )
}

const open = () => {
  render(<Harness />)
  const trigger = screen.getByText('Open it')
  trigger.focus()
  fireEvent.click(trigger)
  return trigger
}

describe('Modal', () => {
  it('is a dialog named by its title and described by its text', () => {
    open()

    const dialog = screen.getByRole('dialog', { name: 'Record payment' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Enter an amount.')
  })

  it('moves focus to the first field, and back to the trigger on close', () => {
    const trigger = open()
    expect(screen.getByLabelText('Amount')).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on Escape and from the named close button', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps Tab inside the dialog in both directions', () => {
    open()
    const close = screen.getByRole('button', { name: 'Close dialog' })
    const save = screen.getByRole('button', { name: 'Save' })

    save.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(save).toHaveFocus()
  })
})
