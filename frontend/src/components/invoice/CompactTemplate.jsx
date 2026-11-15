import { fmtDate } from './format'
import { FromDetails, BillToDetails, ItemsTable, Totals, Notes, Footer } from './parts'

// ─────────────────────────────────────────────────────────────────────
// 5. COMPACT TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function CompactTemplate({ invoice, color }) {
  return (
    <div className="font-sans text-gray-900 text-sm">
      {/* Header row */}
      <div
        className="flex justify-between items-center mb-4 pb-3"
        style={{ borderBottom: `2px solid ${color.primary}` }}
      >
        <div>
          <span className="font-black text-lg" style={{ color: color.primary }}>
            {invoice.business_name || 'Your Business'}
          </span>
          {invoice.user_email && <span className="text-gray-400 text-xs ml-3">{invoice.user_email}</span>}
        </div>
        <div className="text-right">
          <span className="font-black text-xl text-gray-900">INVOICE </span>
          <span className="font-mono text-gray-500">#{invoice.invoice_number}</span>
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 text-xs">
        <FromDetails
          invoice={invoice}
          titleClass="text-gray-400 uppercase tracking-wider mb-1"
          nameClass="font-semibold text-gray-800"
          lineClass="text-gray-400"
        />
        <BillToDetails
          invoice={invoice}
          titleClass="text-gray-400 uppercase tracking-wider mb-1"
          nameClass="font-semibold text-gray-800"
          lineClass="text-gray-400"
        />
        <div className="md:text-right">
          <div>
            <span className="text-gray-400">Issued: </span>
            <span className="font-medium">{fmtDate(invoice.issue_date)}</span>
          </div>
          <div>
            <span className="text-gray-400">Due: </span>
            <span className="font-bold" style={{ color: color.primary }}>
              {fmtDate(invoice.due_date)}
            </span>
          </div>
        </div>
      </div>

      <ItemsTable invoice={invoice} color={color} compact />
      <Totals invoice={invoice} color={color} compact />
      {invoice.notes && <Notes text={invoice.notes} color={color} compact />}
      <Footer color={color} compact />
    </div>
  )
}

export default CompactTemplate
