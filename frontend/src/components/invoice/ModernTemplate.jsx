import { fmtDate } from './format'
import { FromDetails, BillToDetails, ItemsTable, Totals, Notes, Footer } from './parts'

// ─────────────────────────────────────────────────────────────────────
// 2. MODERN TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function ModernTemplate({ invoice, color }) {
  return (
    <div className="font-sans text-gray-900">
      {/* Full-width accent header */}
      <div
        className="rounded-2xl p-8 mb-8"
        style={{ background: `linear-gradient(135deg, ${color.dark} 0%, ${color.primary} 100%)` }}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-black text-white tracking-tight">INVOICE</div>
            <div className="text-white/85 font-mono text-sm mt-1">#{invoice.invoice_number}</div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-xl">{invoice.business_name || 'Your Business'}</div>
            {invoice.user_email && <div className="text-white/85 text-sm">{invoice.user_email}</div>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/20">
          <FromDetails
            invoice={invoice}
            titleClass="text-white/80 text-xs uppercase tracking-wider mb-1"
            nameClass="text-white font-bold text-lg"
            lineClass="text-white/90 text-sm"
          />
          <BillToDetails
            invoice={invoice}
            titleClass="text-white/80 text-xs uppercase tracking-wider mb-1"
            nameClass="text-white font-bold text-lg"
            lineClass="text-white/90 text-sm"
          />
          <div className="md:text-right">
            <div className="text-white/80 text-xs uppercase tracking-wider mb-1">Dates</div>
            <div className="text-white text-sm">
              Issued: <span className="font-semibold">{fmtDate(invoice.issue_date)}</span>
            </div>
            <div className="text-white text-sm">
              Due: <span className="font-bold">{fmtDate(invoice.due_date)}</span>
            </div>
          </div>
        </div>
      </div>

      <ItemsTable invoice={invoice} color={color} />
      <Totals invoice={invoice} color={color} />
      {invoice.notes && <Notes text={invoice.notes} color={color} />}
      <Footer color={color} />
    </div>
  )
}

export default ModernTemplate
