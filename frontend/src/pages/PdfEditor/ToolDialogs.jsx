import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select } from '../../components/ui'
import { NUMBER_POSITIONS } from './pdfTools'
import { FONTS, measure } from './replaceText'

const SIGNATURE_NOTE = 'Digital signatures in the file stop being valid after this change.'

function Footer({ onClose, busy, action, disabled }) {
  return (
    <div className="flex justify-end gap-3 mt-6">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" loading={busy} disabled={disabled}>
        {action}
      </Button>
    </div>
  )
}

function Form({ onSubmit, children }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-4"
    >
      {children}
    </form>
  )
}

export function WatermarkDialog({ onClose, onApply, busy }) {
  const [text, setText] = useState('DRAFT')
  const [opacity, setOpacity] = useState(20)
  const [size, setSize] = useState(72)
  const [angle, setAngle] = useState(45)
  const [color, setColor] = useState('#808080')
  return (
    <Modal isOpen onClose={onClose} title="Add a watermark" description={`On every page. ${SIGNATURE_NOTE}`}>
      <Form onSubmit={() => onApply({ text, opacity: opacity / 100, size: Number(size), angle: Number(angle), color })}>
        <Input label="Text" value={text} onChange={(e) => setText(e.target.value)} maxLength={60} />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Opacity (%)"
            type="number"
            min="5"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(e.target.value)}
          />
          <Input
            label="Size (pt)"
            type="number"
            min="12"
            max="300"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <Input
            label="Angle (degrees)"
            type="number"
            min="-90"
            max="90"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
          />
          <Input label="Colour" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <Footer onClose={onClose} busy={busy} action="Add watermark" />
      </Form>
    </Modal>
  )
}

const POSITION_LABELS = Object.fromEntries(NUMBER_POSITIONS.map((p) => [p, p.replace('-', ' ')]))

export function PageNumbersDialog({ onClose, onApply, busy }) {
  const [position, setPosition] = useState('bottom-center')
  const [format, setFormat] = useState('Page {n} of {total}')
  const [start, setStart] = useState(1)
  return (
    <Modal isOpen onClose={onClose} title="Add page numbers" description={SIGNATURE_NOTE}>
      <Form onSubmit={() => onApply({ position, format, start: Number(start) })}>
        <Select
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          options={NUMBER_POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))}
        />
        <Input
          label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          hint="Use {n} for the number and {total} for the last one."
        />
        <Input label="Start at" type="number" min="0" value={start} onChange={(e) => setStart(e.target.value)} />
        <Footer onClose={onClose} busy={busy} action="Add numbers" />
      </Form>
    </Modal>
  )
}

export function MergeDialog({ onClose, onApply, busy }) {
  const [files, setFiles] = useState([])
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add pages from other PDFs"
      description={`They are appended after the last page, in the order chosen. ${SIGNATURE_NOTE}`}
    >
      <Form onSubmit={() => onApply(files)}>
        <div>
          <label htmlFor="merge-files" className="label">
            PDF files
          </label>
          <input
            id="merge-files"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="input"
            onChange={(e) => setFiles([...e.target.files])}
          />
        </div>
        {files.length > 0 && (
          <ol className="list-decimal pl-5 text-sm text-gray-700 dark:text-gray-300">
            {files.map((file) => (
              <li key={file.name + file.size}>{file.name}</li>
            ))}
          </ol>
        )}
        <Footer onClose={onClose} busy={busy} action="Add pages" disabled={files.length === 0} />
      </Form>
    </Modal>
  )
}

export function CropDialog({ onClose, onApply, busy }) {
  const [margins, setMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const field = (name, label) => (
    <Input
      label={label}
      type="number"
      min="0"
      value={margins[name]}
      onChange={(e) => setMargins({ ...margins, [name]: e.target.value })}
    />
  )
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Crop pages"
      description={`Trim every page. Points: 72 = 1 inch. The cropped content is hidden, not deleted: use redaction to remove it. ${SIGNATURE_NOTE}`}
    >
      <Form onSubmit={() => onApply(margins)}>
        <div className="grid grid-cols-2 gap-4">
          {field('top', 'Top (pt)')}
          {field('right', 'Right (pt)')}
          {field('bottom', 'Bottom (pt)')}
          {field('left', 'Left (pt)')}
        </div>
        <Footer onClose={onClose} busy={busy} action="Crop" />
      </Form>
    </Modal>
  )
}

export function EditTextDialog({ seed, onClose, onApply, busy }) {
  const [text, setText] = useState(seed.text)
  const [fontFamily, setFontFamily] = useState('helvetica')
  const [fontSize, setFontSize] = useState(seed.fontSize)
  const [color, setColor] = useState('#000000')
  const [width, setWidth] = useState(0)

  useEffect(() => {
    let current = true
    measure(fontFamily, Number(fontSize) || 12, text).then((value) => current && setWidth(value))
    return () => {
      current = false
    }
  }, [fontFamily, fontSize, text])

  const overflow = width !== null && width > seed.box.width + 1
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Edit text"
      description="The selected text is removed from the file for good and the new text is drawn in its place. Nothing reflows."
    >
      <Form onSubmit={() => onApply({ text, fontFamily, fontSize: Number(fontSize), color })}>
        <div>
          <label htmlFor="edit-text" className="label">
            New text
          </label>
          <textarea id="edit-text" rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Font"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            options={Object.entries(FONTS).map(([value, font]) => ({ value, label: font.label }))}
            className="col-span-3 sm:col-span-1"
          />
          <Input
            label="Size (pt)"
            type="number"
            min="4"
            max="200"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
          />
          <Input label="Colour" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        {width === null && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            This font cannot draw some of those characters.
          </p>
        )}
        {overflow && (
          <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">
            The new text is wider than the original ({Math.round(width)} pt against {Math.round(seed.box.width)} pt) and
            will run over whatever follows it. Shorten it or lower the size.
          </p>
        )}
        <Footer onClose={onClose} busy={busy} action="Replace text" disabled={!text.trim() || width === null} />
      </Form>
    </Modal>
  )
}
