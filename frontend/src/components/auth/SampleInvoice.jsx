import { useEffect, useState } from 'react'

const LINES = [
  { description: 'Brand identity refresh', hours: '12', amount: '$1,140.00' },
  { description: 'Landing page build', hours: '20', amount: '$1,900.00' },
]

/** Two stacked values that cross-fade; the grid keeps the box the size of the larger one. */
function Swap({ showSecond, first, second, firstClass = '', secondClass = '' }) {
  const base = 'col-start-1 row-start-1 transition-opacity duration-500'
  return (
    <span className="inline-grid justify-items-end">
      <span className={`${base} ${firstClass} ${showSecond ? 'opacity-0' : 'opacity-100'}`}>{first}</span>
      <span className={`${base} ${secondClass} ${showSecond ? 'opacity-100' : 'opacity-0'}`}>{second}</span>
    </span>
  )
}

/**
 * Synthetic invoice for the auth screens: sent, then paid. Illustrative only, so it says so.
 * The one authored moment on these pages; reduced-motion users see the paid state straight away.
 */
function SampleInvoice() {
  const [paid, setPaid] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (paid) return undefined
    const timer = setTimeout(() => setPaid(true), 1800)
    return () => clearTimeout(timer)
  }, [paid])

  return (
    <div
      aria-hidden="true"
      className="w-full max-w-[480px] rounded-xl bg-white text-slate-900 p-8 select-none"
      style={{ boxShadow: '0 28px 60px -18px rgba(0,0,0,.55), 0 8px 18px -8px rgba(0,0,0,.4)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">Invoice INV-2026-014</p>
          <p className="mt-1 text-sm text-slate-500">Okafor Design Studio to Northwind Logistics</p>
        </div>
        <Swap
          showSecond={paid}
          first="Sent"
          second="Paid"
          firstClass="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold"
          secondClass="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold"
        />
      </div>

      <table className="mt-7 w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium text-right">Hours</th>
            <th className="pb-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {LINES.map((line) => (
            <tr key={line.description} className="border-b border-slate-100">
              <td className="py-3">{line.description}</td>
              <td className="py-3 text-right text-slate-600">{line.hours}</td>
              <td className="py-3 text-right">{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-5 ml-auto w-56 space-y-1.5 text-sm tabular-nums">
        <div className="flex justify-between">
          <dt className="text-slate-500">Total</dt>
          <dd className="font-medium">$3,040.00</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Balance due</dt>
          <dd>
            <Swap showSecond={paid} first="$3,040.00" second="$0.00" secondClass="text-emerald-700" />
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-xs text-slate-500">Sample invoice</p>
    </div>
  )
}

export default SampleInvoice
