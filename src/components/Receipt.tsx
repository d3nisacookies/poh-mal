import { Printer, X } from 'lucide-react'
import { formatCurrency, type Flow1Record, type Flow2Record, type Flow3Record, type LogisticsRecord } from '../db/schema'
import FlowBadge from './FlowBadge'
import StatusBadge from './StatusBadge'

interface ReceiptProps {
  record: LogisticsRecord
  onClose?: () => void
}

function isFlow2(record: LogisticsRecord): record is Flow2Record {
  return 'tracking_number' in record
}

function isFlow3(record: LogisticsRecord): record is Flow3Record {
  return 'collector_name' in record
}

function isFlow1(record: LogisticsRecord): record is Flow1Record {
  return !isFlow2(record) && !isFlow3(record)
}

function row(label: string, value: string) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 py-2 text-sm">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{value || '—'}</dd>
    </div>
  )
}

export default function Receipt({ record, onClose }: ReceiptProps) {
  const flow = isFlow2(record) ? 'flow2' : isFlow3(record) ? 'flow3' : 'flow1'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 print:bg-transparent">
      <div className="print-surface w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="no-print mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Printable receipt</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span className="ml-2">Print</span>
            </button>
            {onClose ? (
              <button type="button" className="btn-secondary" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">POH MAL Logistics</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{record.ref_id}</h3>
              <p className="text-sm text-slate-500">Created {new Date(record.created_at).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FlowBadge flow={flow} />
              <StatusBadge status={isFlow1(record) ? 'Logged' : record.status} />
            </div>
          </div>

          <dl>
            {isFlow1(record) ? (
              <>
                {row('Sender', record.sender_name)}
                {row('Phone', record.sender_phone)}
                {row('Product', record.product_description)}
                {row('Category', record.product_category)}
                {row('Flight', `${record.flight_number} • ${record.flight_route}`)}
                {row('Flight date', record.flight_date)}
                {row('Weight / Qty', String(record.weight_or_quantity))}
                {row('Charge', formatCurrency(record.calculated_charge))}
                {row('Notes', record.notes ?? '—')}
              </>
            ) : null}

            {isFlow2(record) ? (
              <>
                {row('Buyer', record.buyer_name)}
                {row('Phone', record.buyer_phone)}
                {row('Tracking number', record.tracking_number)}
                {row('Platform', record.platform)}
                {row('Weight (kg)', String(record.weight_kg))}
                {row('Date received', record.date_received)}
                {row('Charge', formatCurrency(record.calculated_charge))}
                {row('Rate snapshot', `${record.rate_snapshot?.per_kg_rate ?? 0}/kg (${record.rate_snapshot?.source ?? 'manual'})`)}
              </>
            ) : null}

            {isFlow3(record) ? (
              <>
                {row('Sender', record.sender_name)}
                {row('Sender phone', record.sender_phone)}
                {row('Collector', record.collector_name)}
                {row('Collector phone', record.collector_phone)}
                {row('Item', record.item_description)}
                {row('Date received', record.date_received)}
                {row('Date collected', record.date_collected ? new Date(record.date_collected).toLocaleString() : 'Pending')}
                {row('Notes', record.notes ?? '—')}
              </>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  )
}
