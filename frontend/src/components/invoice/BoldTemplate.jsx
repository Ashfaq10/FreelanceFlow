import { fmt, fmtDate, formatAddress } from './format'
import { ItemsTable, Totals, Notes } from './parts'

// ─────────────────────────────────────────────────────────────────────
// 4. BOLD TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function BoldTemplate({ invoice, color }) {
  return (
    <div className="font-sans text-gray-900 flex gap-0 -mx-8 -mt-8" style={{ minHeight: '700px' }}>
      {/* Coloured sidebar */}
      <div
        className="w-48 flex-shrink-0 rounded-tl-2xl rounded-bl-2xl px-5 py-8 flex flex-col"
        style={{ background: color.primary }}
      >
        <div className="text-white font-black text-xl tracking-tight mb-1">
          {invoice.business_name?.split(' ')[0] || 'BIZ'}
        </div>
        {invoice.user_email && <div className="text-white/85 text-xs mb-8 break-all">{invoice.user_email}</div>}
        <div className="mt-auto space-y-4">
          <div>
            <div className="text-white/80 text-[10px] uppercase tracking-wider">Invoice</div>
            <div className="text-white font-bold text-sm">#{invoice.invoice_number}</div>
          </div>
          <div>
            <div className="text-white/80 text-[10px] uppercase tracking-wider">Issued</div>
            <div className="text-white text-xs">{fmtDate(invoice.issue_date)}</div>
          </div>
          <div>
            <div className="text-white/80 text-[10px] uppercase tracking-wider">Due</div>
            <div className="text-white font-bold text-sm">{fmtDate(invoice.due_date)}</div>
          </div>
          <div>
            <div className="text-white/80 text-[10px] uppercase tracking-wider">Total Due</div>
            <div className="text-white font-black text-lg">{fmt(invoice.total, invoice.currency || 'USD')}</div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="text-4xl font-black tracking-tight text-gray-900">INVOICE</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Bill To</div>
            <div className="font-bold text-gray-900">{invoice.client_name}</div>
            {invoice.client_company && invoice.client_company !== invoice.client_name && (
              <div className="text-gray-500 text-sm">{invoice.client_company}</div>
            )}
            {(invoice.client_full_address || invoice.client_address) && (
              <div className="text-gray-500 text-sm mt-1 whitespace-pre-line">
                {formatAddress(invoice.client_full_address || invoice.client_address)}
              </div>
            )}
            {invoice.client_phone && <div className="text-gray-500 text-sm">Phone: {invoice.client_phone}</div>}
            {invoice.client_email && <div className="text-gray-500 text-sm">Email: {invoice.client_email}</div>}
          </div>
        </div>
        <div className="mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">From</div>
          <div className="font-bold text-gray-900">{invoice.business_name || 'Your Business'}</div>
          {invoice.user_address && (
            <div className="text-gray-500 text-sm mt-1 whitespace-pre-line">{formatAddress(invoice.user_address)}</div>
          )}
          {(invoice.business_phone || invoice.user_phone) && (
            <div className="text-gray-500 text-sm">Phone: {invoice.business_phone || invoice.user_phone}</div>
          )}
          {(invoice.business_email || invoice.user_email) && (
            <div className="text-gray-500 text-sm">Email: {invoice.business_email || invoice.user_email}</div>
          )}
          {invoice.tax_number && <div className="text-gray-500 text-sm">VAT: {invoice.tax_number}</div>}
        </div>
        <ItemsTable invoice={invoice} color={color} />
        <Totals invoice={invoice} color={color} sidebar />
        {invoice.notes && <Notes text={invoice.notes} color={color} />}
      </div>
    </div>
  )
}

export default BoldTemplate
