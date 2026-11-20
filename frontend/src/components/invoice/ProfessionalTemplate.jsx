import { fmt, itemLineTotal, fmtDateTime, taxRowsOf } from './format'
import { FromDetails, BillToDetails } from './parts'

// ─────────────────────────────────────────────────────────────────────
// PROFESSIONAL TEMPLATE (reference design)
// ─────────────────────────────────────────────────────────────────────
function ProfessionalTemplate({ invoice }) {
  const cur = invoice.currency || 'USD'
  const bankLines = (invoice.bank_details || '').split('\n').filter(Boolean)
  const terms = (invoice.invoice_terms || '').split('\n').filter(Boolean)

  return (
    <div className="font-sans text-gray-900 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-300">
        <div className="flex gap-4 items-center max-w-[55%]">
          {invoice.logo_url && (
            <img src={invoice.logo_url} alt="" className="h-16 w-auto max-w-[80px] object-contain" />
          )}
          <div>
            <div className="text-xl font-bold">{invoice.business_name || 'Your Business'}</div>
            {invoice.business_tagline && <div className="text-xs text-gray-500 mt-0.5">{invoice.business_tagline}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold tracking-tight">INVOICE</div>
          <div className="font-mono text-xs text-gray-600 mt-1">INVOICE # {invoice.invoice_number}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2 text-xs border-b border-gray-200 pb-3">
        {[
          ['Invoice Date', fmtDateTime(invoice.issue_date)],
          ['Due Date', invoice.due_date ? fmtDateTime(invoice.due_date) : '—'],
        ].map(([label, val]) => (
          <div key={label}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</div>
            <div className="text-gray-700">{val}</div>
          </div>
        ))}
        {invoice.reference_number && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Reference</div>
            <div className="text-gray-700">{invoice.reference_number}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 my-5 pt-4 border-t border-gray-200">
        <FromDetails
          invoice={invoice}
          titleClass="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2"
          nameClass="font-bold"
          lineClass="text-gray-600 text-xs"
        />
        <BillToDetails
          invoice={invoice}
          titleClass="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2"
          nameClass="font-bold"
          lineClass="text-gray-600 text-xs"
        />
      </div>

      <table className="w-full mb-5 border-collapse text-xs">
        <thead>
          <tr className="bg-gray-700 text-white">
            {['#', 'Description', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
              <th
                key={h}
                className={`px-2 py-2.5 font-bold uppercase text-[10px] border border-gray-600 ${i === 1 ? 'text-left' : i === 4 ? 'text-right' : 'text-center'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, i) => (
            <tr key={i} className="bg-gray-50">
              <td className="border border-gray-200 px-2 py-2 text-center">{i + 1}</td>
              <td className="border border-gray-200 px-2 py-2 font-semibold">{item.description}</td>
              <td className="border border-gray-200 px-2 py-2 text-center">{item.quantity}</td>
              <td className="border border-gray-200 px-2 py-2 text-center text-gray-700 font-semibold">
                {fmt(item.rate || item.unit_price || 0, cur)}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-right font-bold">{fmt(itemLineTotal(item), cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="w-64 ml-auto space-y-1 text-sm mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">{fmt(invoice.subtotal, cur)}</span>
        </div>
        {Number(invoice.discount_amount) > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Discount</span>
            <span className="text-emerald-500 font-semibold">{fmt(invoice.discount_amount, cur)}</span>
          </div>
        )}
        {taxRowsOf(invoice).map((row) => (
          <div key={row.rate} className="flex justify-between">
            <span className="text-gray-600">VAT ({Number(row.rate)}%)</span>
            <span className="font-semibold">{fmt(row.tax, cur)}</span>
          </div>
        ))}
        <div className="border-t-2 border-black pt-2 flex justify-between text-base font-extrabold">
          <span>Total Due</span>
          <span>{fmt(invoice.total, cur)}</span>
        </div>
      </div>

      {bankLines.length > 0 && (
        <div className="bg-gray-100 border-l-4 border-black p-4 mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2">Bank Details</div>
          {bankLines.map((line, i) => (
            <div key={i} className="text-xs text-gray-700 mb-1">
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-100 border-l-4 border-black p-4 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2">Notes</div>
        <div className="text-xs text-gray-700 leading-relaxed">
          {invoice.notes || 'Thank you for your payment. This invoice serves as your official receipt.'}
        </div>
      </div>

      {terms.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2">Terms &amp; Conditions</div>
          <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">
            {terms.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-500">
        <div>This is a computer-generated document and does not require any signature or stamp.</div>
        <div className="mt-1 text-gray-500">
          {invoice.business_name}
          {invoice.website ? ` | ${invoice.website}` : ''}
          {invoice.business_tagline ? ` | ${invoice.business_tagline}` : ''}
        </div>
      </div>
    </div>
  )
}

export default ProfessionalTemplate
