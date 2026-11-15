/**
 * Invoice Preview Component
 * 5 professional templates × 6 color palettes
 */

import { fromCents, lineTotalCents } from '../../utils/money'

// ── Colour palettes ───────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components -- shared template config; splitting this file is LEAN-5
export const COLOR_PALETTES = [
    {
        id: 'blue',
        name: 'Deep Blue',
        swatch: '#2563eb',
        primary: '#2563eb',
        light: '#eef4ff',
        dark: '#141d2e',
        text: '#ffffff',
    },
    {
        id: 'slate',
        name: 'Slate',
        swatch: '#334155',
        primary: '#334155',
        light: '#f1f5f9',
        dark: '#0f172a',
        text: '#ffffff',
    },
    {
        id: 'emerald',
        name: 'Emerald',
        swatch: '#059669',
        primary: '#059669',
        light: '#ecfdf5',
        dark: '#064e3b',
        text: '#ffffff',
    },
    {
        id: 'rose',
        name: 'Rose',
        swatch: '#e11d48',
        primary: '#e11d48',
        light: '#fff1f2',
        dark: '#881337',
        text: '#ffffff',
    },
    {
        id: 'amber',
        name: 'Amber',
        swatch: '#d97706',
        primary: '#d97706',
        light: '#fffbeb',
        dark: '#78350f',
        text: '#ffffff',
    },
    {
        id: 'cyan',
        name: 'Cyan',
        swatch: '#06b6d4',
        primary: '#06b6d4',
        light: '#cffafe',
        dark: '#155e75',
        text: '#ffffff',
    },
]

// ── Template definitions ──────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components -- shared template config; splitting this file is LEAN-5
export const TEMPLATES = [
    { id: 'professional', name: 'Professional', description: 'Logo, meta bar and bank details' },
    { id: 'classic', name: 'Classic', description: 'Clean, timeless two-column layout' },
    { id: 'modern', name: 'Modern', description: 'Bold header with full-width accent bar' },
    { id: 'minimal', name: 'Minimal', description: 'Ultra-clean, typography-first design' },
    { id: 'bold', name: 'Bold', description: 'Vibrant coloured sidebar + strong type' },
    { id: 'compact', name: 'Compact', description: 'Dense layout, fits more on one page' },
]

// ── Helper ────────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹', BDT: 'BDT ' }

function fmt(amount, currency = 'USD') {
    const sym = CURRENCY_SYMBOLS[currency] || `${currency} `
    const n = Number(amount) || 0
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Saved items carry the server's rounded line_total; unsaved drafts fall back to cent-exact math (DATA-3). */
function itemLineTotal(item) {
    if (item.line_total !== undefined && item.line_total !== null) return Number(item.line_total)
    return fromCents(lineTotalCents(item.quantity, item.rate ?? item.unit_price))
}

function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtDateTime(d) {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
    })
}

function formatAddress(address) {
    if (!address) return ''
    if (address.includes('\n') || address.includes('\r')) return address
    const parts = address.split(',').map(part => part.trim()).filter(Boolean)
    if (parts.length <= 2) return address
    const firstLine = parts.slice(0, -2).join(', ')
    const secondLine = parts.slice(-2).join(', ')
    return `${firstLine}\n${secondLine}`
}

function FromDetails({ invoice, titleClass = '', nameClass = '', lineClass = '' }) {
    const fromEmail = invoice.business_email || invoice.user_email
    const fromPhone = invoice.business_phone || invoice.user_phone
    const address = formatAddress(invoice.user_address)
    return (
        <div>
            <div className={titleClass}>From</div>
            <div className={nameClass}>{invoice.business_name || 'Your Business'}</div>
            {address && <div className={lineClass} style={{ whiteSpace: 'pre-line' }}>{address}</div>}
            {fromPhone && <div className={lineClass}>Phone: {fromPhone}</div>}
            {fromEmail && <div className={lineClass}>Email: {fromEmail}</div>}
            {invoice.tax_number && <div className={lineClass}>VAT: {invoice.tax_number}</div>}
        </div>
    )
}

function BillToDetails({ invoice, titleClass = '', nameClass = '', lineClass = '' }) {
    const company = invoice.client_company
    const showCompany = company && company !== invoice.client_name
    return (
        <div>
            <div className={titleClass}>Bill To</div>
            <div className={nameClass}>{invoice.client_name}</div>
            {showCompany && <div className={lineClass}>{company}</div>}
            {(invoice.client_full_address || invoice.client_address) && (
                <div className={lineClass} style={{ whiteSpace: 'pre-line' }}>
                    {formatAddress(invoice.client_full_address || invoice.client_address)}
                </div>
            )}
            {invoice.client_phone && <div className={lineClass}>Phone: {invoice.client_phone}</div>}
            {invoice.client_email && <div className={lineClass}>Email: {invoice.client_email}</div>}
        </div>
    )
}

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
                        {invoice.business_tagline && (
                            <div className="text-xs text-gray-500 mt-0.5">{invoice.business_tagline}</div>
                        )}
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
                    ['Payment Date', invoice.due_date ? fmtDateTime(invoice.due_date) : '—'],
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
                            <th key={h} className={`px-2 py-2.5 font-bold uppercase text-[10px] border border-gray-600 ${i === 1 ? 'text-left' : i === 4 ? 'text-right' : 'text-center'}`}>{h}</th>
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
                            <td className="border border-gray-200 px-2 py-2 text-right font-bold">
                                {fmt(itemLineTotal(item), cur)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="w-64 ml-auto space-y-1 text-sm mb-6">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-semibold">{fmt(invoice.subtotal, cur)}</span></div>
                {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-emerald-500 font-semibold">{fmt(invoice.discount_amount, cur)}</span></div>
                )}
                {invoice.tax_rate > 0 && (
                    <div className="flex justify-between"><span className="text-gray-600">VAT ({invoice.tax_rate}%)</span><span className="font-semibold">{fmt(invoice.tax_amount, cur)}</span></div>
                )}
                <div className="border-t-2 border-black pt-2 flex justify-between text-base font-extrabold">
                    <span>Total Due</span><span>{fmt(invoice.total, cur)}</span>
                </div>
            </div>

            {bankLines.length > 0 && (
                <div className="bg-gray-100 border-l-4 border-black p-4 mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2">Bank Details</div>
                    {bankLines.map((line, i) => (
                        <div key={i} className="text-xs text-gray-700 mb-1">{line}</div>
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
                        {terms.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            )}

            <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-400">
                <div>This is a computer-generated document and does not require any signature or stamp.</div>
                <div className="mt-1 text-gray-500">
                    {invoice.business_name}{invoice.website ? ` | ${invoice.website}` : ''}{invoice.business_tagline ? ` | ${invoice.business_tagline}` : ''}
                </div>
            </div>
        </div>
    )
}

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

// ─────────────────────────────────────────────────────────────────────
// 2. MODERN TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function ModernTemplate({ invoice, color }) {
    return (
        <div className="font-sans text-gray-900">
            {/* Full-width accent header */}
            <div className="rounded-2xl p-8 mb-8" style={{ background: `linear-gradient(135deg, ${color.dark} 0%, ${color.primary} 100%)` }}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-3xl font-black text-white tracking-tight">INVOICE</div>
                        <div className="text-white/60 font-mono text-sm mt-1">#{invoice.invoice_number}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-white font-bold text-xl">{invoice.business_name || 'Your Business'}</div>
                        {invoice.user_email && <div className="text-white/60 text-sm">{invoice.user_email}</div>}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/20">
                    <FromDetails
                        invoice={invoice}
                        titleClass="text-white/50 text-xs uppercase tracking-wider mb-1"
                        nameClass="text-white font-bold text-lg"
                        lineClass="text-white/70 text-sm"
                    />
                    <BillToDetails
                        invoice={invoice}
                        titleClass="text-white/50 text-xs uppercase tracking-wider mb-1"
                        nameClass="text-white font-bold text-lg"
                        lineClass="text-white/70 text-sm"
                    />
                    <div className="md:text-right">
                        <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Dates</div>
                        <div className="text-white text-sm">Issued: <span className="font-semibold">{fmtDate(invoice.issue_date)}</span></div>
                        <div className="text-white text-sm">Due: <span className="font-bold">{fmtDate(invoice.due_date)}</span></div>
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
                        <div className="font-semibold text-sm" style={{ color: color.primary }}>{fmtDate(invoice.due_date)}</div>
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

// ─────────────────────────────────────────────────────────────────────
// 4. BOLD TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function BoldTemplate({ invoice, color }) {
    return (
        <div className="font-sans text-gray-900 flex gap-0 -mx-8 -mt-8" style={{ minHeight: '700px' }}>
            {/* Coloured sidebar */}
            <div className="w-48 flex-shrink-0 rounded-tl-2xl rounded-bl-2xl px-5 py-8 flex flex-col" style={{ background: color.primary }}>
                <div className="text-white font-black text-xl tracking-tight mb-1">
                    {invoice.business_name?.split(' ')[0] || 'BIZ'}
                </div>
                {invoice.user_email && (
                    <div className="text-white/60 text-xs mb-8 break-all">{invoice.user_email}</div>
                )}
                <div className="mt-auto space-y-4">
                    <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-wider">Invoice</div>
                        <div className="text-white font-bold text-sm">#{invoice.invoice_number}</div>
                    </div>
                    <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-wider">Issued</div>
                        <div className="text-white text-xs">{fmtDate(invoice.issue_date)}</div>
                    </div>
                    <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-wider">Due</div>
                        <div className="text-white font-bold text-sm">{fmtDate(invoice.due_date)}</div>
                    </div>
                    <div>
                        <div className="text-white/50 text-[10px] uppercase tracking-wider">Total Due</div>
                        <div className="text-white font-black text-lg">{fmt(invoice.total)}</div>
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
                        <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Bill To</div>
                        <div className="font-bold text-gray-900">{invoice.client_name}</div>
                        {invoice.client_company && invoice.client_company !== invoice.client_name && (
                            <div className="text-gray-400 text-sm">{invoice.client_company}</div>
                        )}
                        {(invoice.client_full_address || invoice.client_address) && (
                            <div className="text-gray-400 text-sm mt-1 whitespace-pre-line">
                                {formatAddress(invoice.client_full_address || invoice.client_address)}
                            </div>
                        )}
                        {invoice.client_phone && <div className="text-gray-400 text-sm">Phone: {invoice.client_phone}</div>}
                        {invoice.client_email && <div className="text-gray-400 text-sm">Email: {invoice.client_email}</div>}
                    </div>
                </div>
                <div className="mb-6">
                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">From</div>
                    <div className="font-bold text-gray-900">{invoice.business_name || 'Your Business'}</div>
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
                <ItemsTable invoice={invoice} color={color} />
                <Totals invoice={invoice} color={color} sidebar />
                {invoice.notes && <Notes text={invoice.notes} color={color} />}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────
// 5. COMPACT TEMPLATE
// ─────────────────────────────────────────────────────────────────────
function CompactTemplate({ invoice, color }) {
    return (
        <div className="font-sans text-gray-900 text-sm">
            {/* Header row */}
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: `2px solid ${color.primary}` }}>
                <div>
                    <span className="font-black text-lg" style={{ color: color.primary }}>{invoice.business_name || 'Your Business'}</span>
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
                    <div><span className="text-gray-400">Issued: </span><span className="font-medium">{fmtDate(invoice.issue_date)}</span></div>
                    <div><span className="text-gray-400">Due: </span><span className="font-bold" style={{ color: color.primary }}>{fmtDate(invoice.due_date)}</span></div>
                </div>
            </div>

            <ItemsTable invoice={invoice} color={color} compact />
            <Totals invoice={invoice} color={color} compact />
            {invoice.notes && <Notes text={invoice.notes} color={color} compact />}
            <Footer color={color} compact />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────
function ItemsTable({ invoice, color, striped, minimal, compact }) {
    const py = compact ? 'py-1.5' : minimal ? 'py-3' : 'py-3.5'
    const headerBg = minimal ? 'transparent' : compact ? 'transparent' : color.light
    const headerColor = minimal || compact ? color.primary : color.primary
    return (
        <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ background: headerBg, borderBottom: minimal || compact ? `2px solid ${color.primary}` : 'none' }}>
                    {['Description', 'Qty', 'Rate', 'Amount'].map((h, i) => (
                        <th
                            key={h}
                            className={`${py} text-xs font-bold uppercase tracking-widest`}
                            style={{
                                color: headerColor,
                                textAlign: i === 0 ? 'left' : 'right',
                                padding: compact ? '6px 8px' : '10px 12px',
                                background: headerBg,
                                borderBottom: `2px solid ${color.primary}`,
                            }}
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {(invoice.items || []).map((item, i) => (
                    <tr
                        key={i}
                        style={{
                            background: striped && i % 2 === 1 ? color.light : 'transparent',
                            borderBottom: '1px solid #f1f5f9',
                        }}
                    >
                        <td style={{ padding: compact ? '6px 8px' : '10px 12px', color: '#374151' }}>{item.description}</td>
                        <td style={{ padding: compact ? '6px 8px' : '10px 12px', textAlign: 'right', color: '#6b7280' }}>{item.quantity}</td>
                        <td style={{ padding: compact ? '6px 8px' : '10px 12px', textAlign: 'right', color: '#6b7280' }}>{fmt(item.rate || item.unit_price)}</td>
                        <td style={{ padding: compact ? '6px 8px' : '10px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                            {fmt(itemLineTotal(item))}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function Totals({ invoice, color, compact, sidebar }) {
    if (sidebar) return null // Bold template shows total in sidebar
    const w = compact ? '220px' : '260px'
    return (
        <div style={{ marginLeft: 'auto', width: w }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: compact ? '4px 0' : '6px 0', color: '#6b7280', fontSize: compact ? '12px' : '13px' }}>
                <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: compact ? '4px 0' : '6px 0', color: '#10B981', fontSize: compact ? '12px' : '13px' }}>
                    <span>Discount</span><span>{fmt(invoice.discount_amount)}</span>
                </div>
            )}
            {invoice.tax_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: compact ? '4px 0' : '6px 0', color: '#6b7280', fontSize: compact ? '12px' : '13px' }}>
                    <span>Tax ({invoice.tax_rate}%)</span><span>{fmt(invoice.tax_amount)}</span>
                </div>
            )}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: compact ? '8px 0 4px' : '12px 0 4px',
                borderTop: `2px solid ${color.primary}`,
                marginTop: compact ? '4px' : '8px',
                fontWeight: 700, fontSize: compact ? '14px' : '18px', color: color.primary,
            }}>
                <span>Total Due</span>
                <span>{fmt(invoice.total)}</span>
            </div>
        </div>
    )
}

function Notes({ text, color, compact }) {
    return (
        <div style={{
            marginTop: compact ? '16px' : '24px',
            padding: compact ? '8px 12px' : '16px',
            background: color.light,
            borderRadius: '8px',
            borderLeft: `3px solid ${color.primary}`,
            fontSize: compact ? '11px' : '13px',
        }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: color.primary, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.08em' }}>Notes</div>
            <div style={{ color: '#374151', lineHeight: 1.6 }}>{text}</div>
        </div>
    )
}

function Footer({ color, compact }) {
    return (
        <div style={{
            marginTop: compact ? '20px' : '32px',
            paddingTop: compact ? '10px' : '16px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
            fontSize: '10px',
            color: '#9ca3af',
        }}>
            Generated by <span style={{ color: color.primary, fontWeight: 600 }}>FreelanceFlow</span> · Thank you for your business
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────────
function InvoicePreview({ invoice, templateId = 'professional', colorId = 'blue' }) {
    const color = COLOR_PALETTES.find(c => c.id === colorId) || COLOR_PALETTES[0]

    if (templateId === 'professional') {
        return <ProfessionalTemplate invoice={invoice} />
    }

    const props = { invoice, color }

    const templates = {
        classic: <ClassicTemplate {...props} />,
        modern: <ModernTemplate  {...props} />,
        minimal: <MinimalTemplate {...props} />,
        bold: <BoldTemplate    {...props} />,
        compact: <CompactTemplate {...props} />,
    }

    return templates[templateId] || <ProfessionalTemplate invoice={invoice} />
}

export default InvoicePreview
