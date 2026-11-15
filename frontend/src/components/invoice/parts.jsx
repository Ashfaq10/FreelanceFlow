import { fmt, itemLineTotal, formatAddress } from './format'

export function FromDetails({ invoice, titleClass = '', nameClass = '', lineClass = '' }) {
  const fromEmail = invoice.business_email || invoice.user_email
  const fromPhone = invoice.business_phone || invoice.user_phone
  const address = formatAddress(invoice.user_address)
  return (
    <div>
      <div className={titleClass}>From</div>
      <div className={nameClass}>{invoice.business_name || 'Your Business'}</div>
      {address && (
        <div className={lineClass} style={{ whiteSpace: 'pre-line' }}>
          {address}
        </div>
      )}
      {fromPhone && <div className={lineClass}>Phone: {fromPhone}</div>}
      {fromEmail && <div className={lineClass}>Email: {fromEmail}</div>}
      {invoice.tax_number && <div className={lineClass}>VAT: {invoice.tax_number}</div>}
    </div>
  )
}

export function BillToDetails({ invoice, titleClass = '', nameClass = '', lineClass = '' }) {
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
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────
export function ItemsTable({ invoice, color, striped, minimal, compact }) {
  const cur = invoice.currency || 'USD'
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
            <td style={{ padding: compact ? '6px 8px' : '10px 12px', textAlign: 'right', color: '#6b7280' }}>
              {item.quantity}
            </td>
            <td style={{ padding: compact ? '6px 8px' : '10px 12px', textAlign: 'right', color: '#6b7280' }}>
              {fmt(item.rate || item.unit_price, cur)}
            </td>
            <td
              style={{
                padding: compact ? '6px 8px' : '10px 12px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {fmt(itemLineTotal(item), cur)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Totals({ invoice, color, compact, sidebar }) {
  if (sidebar) return null // Bold template shows total in sidebar
  const cur = invoice.currency || 'USD'
  const w = compact ? '220px' : '260px'
  return (
    <div style={{ marginLeft: 'auto', width: w }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: compact ? '4px 0' : '6px 0',
          color: '#6b7280',
          fontSize: compact ? '12px' : '13px',
        }}
      >
        <span>Subtotal</span>
        <span>{fmt(invoice.subtotal, cur)}</span>
      </div>
      {Number(invoice.discount_amount) > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: compact ? '4px 0' : '6px 0',
            color: '#10B981',
            fontSize: compact ? '12px' : '13px',
          }}
        >
          <span>Discount</span>
          <span>{fmt(invoice.discount_amount, cur)}</span>
        </div>
      )}
      {invoice.tax_rate > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: compact ? '4px 0' : '6px 0',
            color: '#6b7280',
            fontSize: compact ? '12px' : '13px',
          }}
        >
          <span>Tax ({invoice.tax_rate}%)</span>
          <span>{fmt(invoice.tax_amount, cur)}</span>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: compact ? '8px 0 4px' : '12px 0 4px',
          borderTop: `2px solid ${color.primary}`,
          marginTop: compact ? '4px' : '8px',
          fontWeight: 700,
          fontSize: compact ? '14px' : '18px',
          color: color.primary,
        }}
      >
        <span>Total Due</span>
        <span>{fmt(invoice.total, cur)}</span>
      </div>
    </div>
  )
}

export function Notes({ text, color, compact }) {
  return (
    <div
      style={{
        marginTop: compact ? '16px' : '24px',
        padding: compact ? '8px 12px' : '16px',
        background: color.light,
        borderRadius: '8px',
        borderLeft: `3px solid ${color.primary}`,
        fontSize: compact ? '11px' : '13px',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: '4px',
          color: color.primary,
          textTransform: 'uppercase',
          fontSize: '10px',
          letterSpacing: '0.08em',
        }}
      >
        Notes
      </div>
      <div style={{ color: '#374151', lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

export function Footer({ color, compact }) {
  return (
    <div
      style={{
        marginTop: compact ? '20px' : '32px',
        paddingTop: compact ? '10px' : '16px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        fontSize: '10px',
        color: '#6b7280',
      }}
    >
      Generated by <span style={{ color: color.primary, fontWeight: 600 }}>FreelanceFlow</span> · Thank you for your
      business
    </div>
  )
}
