import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'

function Probe() {
  const { choice, dark, setTheme, toggle } = useTheme()
  return (
    <>
      <p data-testid="state">{choice}:{String(dark)}</p>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setTheme('system')}>system</button>
    </>
  )
}

const mount = () => render(<ThemeProvider><Probe /></ThemeProvider>)

describe('ThemeProvider (UX-5)', () => {
  it('starts light and toggles dark, saving the choice and marking <html>', () => {
    mount()
    expect(screen.getByTestId('state')).toHaveTextContent('light:false')

    act(() => screen.getByText('toggle').click())

    expect(screen.getByTestId('state')).toHaveTextContent('dark:true')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('restores a saved choice', () => {
    localStorage.setItem('theme', 'dark')
    mount()

    expect(screen.getByTestId('state')).toHaveTextContent('dark:true')
  })

  it('reads the old darkMode flag once, so nobody loses their theme', () => {
    localStorage.setItem('darkMode', 'true')
    mount()

    expect(screen.getByTestId('state')).toHaveTextContent('dark:true')
  })

  it('follows the system when asked to', () => {
    mount()
    act(() => screen.getByText('system').click())

    expect(screen.getByTestId('state')).toHaveTextContent('system:false') // jsdom has no dark preference
    expect(localStorage.getItem('theme')).toBe('system')
  })
})
