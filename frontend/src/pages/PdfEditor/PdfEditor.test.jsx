import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PdfEditor from './PdfEditor'

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@embedpdf/viewer-react', () => ({ PDFViewer: ({ src }) => <div data-testid="viewer">{src.name}</div> }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { full_name: 'Ada' } }) }))
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ dark: false }) }))

const choose = (file) => fireEvent.change(screen.getByLabelText('PDF file'), { target: { files: [file] } })
const renderEditor = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/pdf-editor', state }]}>
      <PdfEditor />
    </MemoryRouter>
  )

describe('PdfEditor', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  it('opens a PDF in the viewer', () => {
    renderEditor()

    choose(new File(['%PDF-1.7'], 'contract.pdf', { type: 'application/pdf' }))

    expect(screen.getByTestId('viewer')).toHaveTextContent('contract.pdf')
  })

  it('refuses a file that is not a PDF, and one over 100 MB', () => {
    renderEditor()

    choose(new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    expect(toast.error).toHaveBeenCalledWith('That is not a PDF file.')

    const huge = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(huge, 'size', { value: 101 * 1024 * 1024 })
    choose(huge)
    expect(toast.error).toHaveBeenCalledWith('That file is over 100 MB.')
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument()
  })

  it('says an invoice is a copy when it arrives from the invoice screen', () => {
    renderEditor({ file: new File(['%PDF'], 'INV-1.pdf', { type: 'application/pdf' }), copyOf: 'invoice INV-1' })

    expect(screen.getByRole('status')).toHaveTextContent('editing a copy of invoice INV-1')
    expect(screen.getByTestId('viewer')).toBeInTheDocument()
  })
})
