import { fmtDate, formatAddress } from './format'
import { ItemsTable, Totals, Notes, Footer } from './parts'

// ─────────────────────────────────────────────────────────────────────
// 3. MINIMAL TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function MinimalTemplate({ invoice, color }) {
  return (
    <div className="font-sans text-gray-900">
      {/* Minimal header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">From</div>
          <div className="text-2xl font-bold text-gray-900">{invoice.business_name || 'Your Business'}</div>
          {invoice.user_address && (
            <div className="text-gray-400 text-sm mt-1 whitespace-pre-line">{formatAddress(invoice.user_address)}</div>
          )}
          {(invoice.business_phone || invoice.user_phone) && (
            <div className="text-gray-400 text-sm">Phone: {invoice.business_phone || invoice.user_phone}</div>
          )}
          {(invoice.business_email || invoice.user_email) && (
            <div className="text-gray-400 text-sm">Email: {invoice.business_email || invoice.user_email}</div>
          )}
          {invoice.tax_number && <div className="text-gray-400 text-sm">VAT: {invoice.tax_number}</div>}
        </div>
        <div className="text-right">
          <div className="text-6xl font-black tracking-tighter" style={{ color: color.primary }}>
            {invoice.invoice_number}
          </div>
          <div className="text-sm text-gray-400 mt-1">INVOICE</div>
        </div>
      </div>

      {/* Thin rule */}
      <div className="h-px bg-gray-200 mb-8" />

      {/* Client + dates in a minimal row */}
      <div className="flex justify-between mb-10">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Bill To</div>
          <div className="font-semibold text-gray-900">{invoice.client_name}</div>
          {(invoice.client_full_address || invoice.client_address) && (
            <div className="text-gray-400 text-sm mt-1 whitespace-pre-line">
              {formatAddress(invoice.client_full_address || invoice.client_address)}
            </div>
          )}
          {invoice.client_phone && <div className="text-gray-400 text-sm">Phone: {invoice.client_phone}</div>}
          {invoice.client_email && <div className="text-gray-400 text-sm">Email: {invoice.client_email}</div>}
        </div>
        <div className="flex gap-10">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Issued</div>
            <div className="font-semibold text-gray-700 text-sm">{fmtDate(invoice.issue_date)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Due</div>
            <div className="font-semibold text-sm" style={{ color: color.primary }}>
              {fmtDate(invoice.due_date)}
            </div>
          </div>
        </div>
      </div>

      <ItemsTable invoice={invoice} color={color} minimal />
      <Totals invoice={invoice} color={color} minimal />
      {invoice.notes && <Notes text={invoice.notes} color={color} minimal />}
      <Footer color={color} minimal />
    </div>
  )
}

export default MinimalTemplate
