import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// The fields the SPA reads, by API schema. If the backend renames one, this fails before a screen
// quietly shows $0 or "undefined" (that is how BUG-2 happened). Regenerate docs/openapi.json from the backend.
const schema = JSON.parse(readFileSync(resolve(process.cwd(), '..', 'docs', 'openapi.json'), 'utf-8'))

const READS = {
  Client: ['name', 'email', 'company', 'invoice_count', 'total_billed', 'total_paid', 'outstanding', 'is_archived'],
  Invoice: ['id', 'invoice_number', 'client_name', 'status', 'total', 'currency', 'due_date', 'issue_date'],
  InvoiceDetail: [
    'invoice_number',
    'status',
    'items',
    'payments',
    'total',
    'currency',
    'amount_paid',
    'amount_due',
    'public_url',
    'pdf_color',
    'client_name',
    'business_name',
  ],
  Payment: ['id', 'amount', 'paid_on', 'method', 'notes'],
  DashboardSummary: [
    'total_revenue',
    'outstanding_amount',
    'overdue_amount',
    'this_month_revenue',
    'total_billed',
    'total_invoices',
    'paid_count',
    'sent_count',
    'draft_count',
    'overdue_count',
    'total_clients',
  ],
  MonthlyRevenueRow: ['month', 'total'],
  TimeLog: ['client_name', 'description', 'date', 'hours', 'hourly_rate', 'is_billed', 'total_amount'],
  PublicInvoice: [
    'invoice_number',
    'status',
    'due_date',
    'items',
    'total',
    'amount_due',
    'business_name',
    'client_name',
  ],
  User: ['email', 'full_name', 'business_name', 'default_currency', 'logo'],
}

describe('the API schema still offers what the SPA reads', () => {
  for (const [name, fields] of Object.entries(READS)) {
    it(`${name} has ${fields.length} fields the SPA uses`, () => {
      const properties = Object.keys(schema.components.schemas[name]?.properties ?? {})

      expect(properties.length).toBeGreaterThan(0)
      for (const field of fields) expect(properties, `${name}.${field}`).toContain(field)
    })
  }
})
