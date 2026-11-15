/** The invoice as the client will see it: six layouts x seven accent colours. */

import ProfessionalTemplate from './ProfessionalTemplate'
import ClassicTemplate from './ClassicTemplate'
import ModernTemplate from './ModernTemplate'
import MinimalTemplate from './MinimalTemplate'
import BoldTemplate from './BoldTemplate'
import CompactTemplate from './CompactTemplate'
import { COLOR_PALETTES } from './palettes'

// ─────────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────────
function InvoicePreview({ invoice, templateId = 'professional', colorId = 'blue' }) {
  const color = COLOR_PALETTES.find((c) => c.id === colorId) || COLOR_PALETTES[0]

  if (templateId === 'professional') {
    return <ProfessionalTemplate invoice={invoice} />
  }

  const props = { invoice, color }

  const templates = {
    classic: <ClassicTemplate {...props} />,
    modern: <ModernTemplate {...props} />,
    minimal: <MinimalTemplate {...props} />,
    bold: <BoldTemplate {...props} />,
    compact: <CompactTemplate {...props} />,
  }

  return templates[templateId] || <ProfessionalTemplate invoice={invoice} />
}

export default InvoicePreview
