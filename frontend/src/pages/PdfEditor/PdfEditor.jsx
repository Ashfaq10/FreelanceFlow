import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PDFViewer } from '@embedpdf/viewer-react'
import { FileUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { CropDialog, EditTextDialog, MergeDialog, PageNumbersDialog, WatermarkDialog } from './ToolDialogs'
import { PdfToolError, addPageNumbers, addWatermark, cropPages, mergePdfs } from './pdfTools'
import { ReplaceTextError, readSelection, replaceSelection } from './replaceText'
import { viewerConfig } from './viewerConfig'

const MAX_BYTES = 100 * 1024 * 1024

const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

/**
 * Open a PDF from this device and edit it in the browser. The file never leaves the page (ADR-0003).
 * The viewer covers annotate, shapes, stamps, signatures, forms, redaction and page organisation; this page adds
 * "edit text", watermark, page numbers, merge and crop on top of it.
 */
function PdfEditor() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const location = useLocation()
  const [file, setFile] = useState(location.state?.file ?? null)
  const copyOf = location.state?.copyOf // e.g. "Invoice INV-2026-001": a copy, never the saved record
  const [dragging, setDragging] = useState(false)
  const [tool, setTool] = useState(null)
  const [seed, setSeed] = useState(null)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  const viewer = useRef(null)

  const open = useCallback((candidate) => {
    if (!candidate) return
    if (!isPdf(candidate)) return toast.error('That is not a PDF file.')
    if (candidate.size > MAX_BYTES) return toast.error('That file is over 100 MB.')
    setFile(candidate)
  }, [])

  const openTool = useCallback(async (name) => {
    if (name !== 'edit-text') return setTool(name)
    try {
      setSeed(await readSelection(viewer.current))
      setTool(name)
    } catch (error) {
      toast.error(error instanceof ReplaceTextError ? error.message : 'Could not read the selection.')
    }
  }, [])

  const close = () => {
    if (!busy) setTool(null)
  }

  /** Download the document with its edits, transform the bytes, and reopen the result in place of the old tab. */
  const transform = async (change) => {
    const v = viewer.current
    const current = v.documents.getActive()
    setBusy(true)
    try {
      const bytes = new Uint8Array(await v.documents.download(current.id))
      const out = await change(bytes)
      await v.documents.open({ kind: 'bytes', bytes: out }, { name: current.name })
      await v.documents.close(current.id)
      setTool(null)
    } catch (error) {
      toast.error(error instanceof PdfToolError ? error.message : 'That change could not be applied to this file.')
    } finally {
      setBusy(false)
    }
  }

  const replaceText = async (values) => {
    setBusy(true)
    try {
      await replaceSelection(viewer.current, seed, values)
      setTool(null)
      toast.success('Text replaced')
    } catch (error) {
      toast.error(error instanceof ReplaceTextError ? error.message : 'Could not replace that text.')
    } finally {
      setBusy(false)
    }
  }

  const appState = useMemo(() => ({ openTool }), [openTool])
  // The viewer reads `identity` once, so it must be a stable value.
  const identity = useMemo(
    () => ({ displayName: user?.full_name || user?.business_name || user?.email }),
    [user?.full_name, user?.business_name, user?.email]
  )

  if (file) {
    return (
      <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 h-[calc(100vh-4rem)] flex flex-col">
        {copyOf && (
          <p
            role="status"
            className="bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 px-4 py-2 text-sm"
          >
            You are editing a copy of {copyOf}. Download it when you are done: the invoice saved in FreelanceFlow is not
            changed.
          </p>
        )}
        <PDFViewer
          key={file.name + file.size + file.lastModified}
          src={file}
          {...viewerConfig}
          appState={appState}
          theme={dark ? 'dark' : 'light'}
          identity={identity}
          onReady={(ready) => {
            viewer.current = ready
            if (import.meta.env.MODE !== 'production') window.__pdfViewer = ready // for the e2e tests
          }}
          style={{ flex: 1, minHeight: 0 }}
        />
        {tool === 'edit-text' && seed && (
          <EditTextDialog seed={seed} onClose={close} onApply={replaceText} busy={busy} />
        )}
        {tool === 'watermark' && (
          <WatermarkDialog
            onClose={close}
            busy={busy}
            onApply={(options) => transform((bytes) => addWatermark(bytes, options))}
          />
        )}
        {tool === 'page-numbers' && (
          <PageNumbersDialog
            onClose={close}
            busy={busy}
            onApply={(options) => transform((bytes) => addPageNumbers(bytes, options))}
          />
        )}
        {tool === 'merge' && (
          <MergeDialog
            onClose={close}
            busy={busy}
            onApply={(files) =>
              transform(async (bytes) =>
                mergePdfs(bytes, await Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer()))))
              )
            }
          />
        )}
        {tool === 'crop' && (
          <CropDialog
            onClose={close}
            busy={busy}
            onApply={(margins) => transform((bytes) => cropPages(bytes, margins))}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDF editor</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Annotate, sign, fill forms, redact, edit text and reorganise any PDF. The file stays on this device.
        </p>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          open(e.dataTransfer.files?.[0])
        }}
        className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center ${
          dragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-gray-300 dark:border-white/15'
        }`}
      >
        <FileUp className="w-10 h-10 text-gray-500" aria-hidden="true" />
        <p className="text-gray-700 dark:text-gray-200">Drop a PDF here, or</p>
        <Button onClick={() => input.current?.click()}>Choose a PDF</Button>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label="PDF file"
          onChange={(e) => open(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}

export default PdfEditor
