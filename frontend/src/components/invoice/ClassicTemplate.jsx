import { fmtDate } from './format'
import { FromDetails, BillToDetails, ItemsTable, Totals, Notes, Footer } from './parts'

// ─────────────────────────────────────────────────────────────────────
// 1. CLASSIC TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function ClassicTemplate({ invoice, color }) {
    return (
        <div className="font-sans text-gray-900" style={{ fontFamily: 'inherit' }}>
            {/* Header */}
            <div style={{ borderBottom: `3px solid ${color.primary}`, paddingBottom: '24px', marginBottom: '32px' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-2xl font-bold" style={{ color: color.primary }}>
                            {invoice.business_name || 'Your Business'}
                        </div>
                        {invoice.user_email && <div className="text-sm text-gray-500 mt-1">{invoice.user_email}</div>}
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black tracking-tight" style={{ color: color.primary }}>INVOICE</div>
                        <div className="text-gray-500 font-mono text-sm mt-1">#{invoice.invoice_number}</div>
                    </div>
                </div>
            </div>

            {/* Addresses + Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <FromDetails
                    invoice={invoice}
                    titleClass="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2"
                    nameClass="font-bold text-lg text-gray-900"
                    lineClass="text-gray-500 text-sm"
                />
                <BillToDetails
                    invoice={invoice}
                    titleClass="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2"
                    nameClass="font-bold text-lg text-gray-900"
                    lineClass="text-gray-500 text-sm"
                />
                <div className="md:text-right">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <span className="text-gray-400 font-medium">Issue Date</span>
                        <span className="font-semibold">{fmtDate(invoice.issue_date)}</span>
                        <span className="text-gray-400 font-medium">Due Date</span>
                        <span className="font-semibold" style={{ color: color.primary }}>{fmtDate(invoice.due_date)}</span>
                    </div>
                </div>
            </div>

            <ItemsTable invoice={invoice} color={color} striped />
            <Totals invoice={invoice} color={color} />
            {invoice.notes && <Notes text={invoice.notes} color={color} />}
            <Footer color={color} />
        </div>
    )
}

export default ClassicTemplate
