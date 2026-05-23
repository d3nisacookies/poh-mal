import { ArrowLeft, FileText, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Receipt from '../components/Receipt'
import { getRecordByFlow, updateRecordByFlow } from '../db/db'
import {
  FLOW2_PLATFORMS,
  FLOW2_STATUSES,
  FLOW3_STATUSES,
  PRODUCT_CATEGORIES,
  formatCurrency,
  type Flow1Record,
  type Flow2Record,
  type Flow3Record,
  type FlowType,
  type LogisticsRecord,
} from '../db/schema'
import { useDB } from '../hooks/useDB'

function isFlow2(record: LogisticsRecord): record is Flow2Record {
  return 'tracking_number' in record
}

function isFlow3(record: LogisticsRecord): record is Flow3Record {
  return 'collector_name' in record
}

function isFlow1(record: LogisticsRecord): record is Flow1Record {
  return !isFlow2(record) && !isFlow3(record)
}

export default function EditRecord() {
  const { flow, id } = useParams()
  const navigate = useNavigate()
  const { settings } = useDB()
  const [record, setRecord] = useState<LogisticsRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!flow || !id) return
      setLoading(true)
      const nextRecord = await getRecordByFlow(flow as FlowType, id)
      setRecord(nextRecord)
      setLoading(false)
    }
    void load()
  }, [flow, id])

  const handleSave = async () => {
    if (!record) return
    setSaving(true)
    setMessage('')
    try {
      await updateRecordByFlow(record)
      setMessage('Record updated successfully.')
    } finally {
      setSaving(false)
    }
  }

  const recalculate = () => {
    if (!record) return
    if (isFlow1(record) && record.rate_snapshot) {
      const charge = Math.max(
        record.rate_snapshot.min_charge,
        record.weight_or_quantity * (record.rate_snapshot.base_rate + record.rate_snapshot.category_surcharge),
      )
      setRecord({ ...record, calculated_charge: Number(charge.toFixed(2)) })
      return
    }
    if (isFlow2(record) && record.rate_snapshot) {
      const charge = record.weight_kg * record.rate_snapshot.per_kg_rate
      setRecord({ ...record, calculated_charge: Number(charge.toFixed(2)) })
    }
  }

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Loading record…</div>
  }

  if (!record) {
    return (
      <div className="card p-6 text-sm text-slate-500">
        Record not found. <Link className="font-semibold text-brand-600" to="/search">Return to search</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Edit {record.ref_id}</h1>
          <p className="mt-1 text-sm text-slate-500">Historical rate snapshots are preserved unless you edit the charge manually.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => setShowReceipt(true)}>
            <FileText className="h-4 w-4" />
            <span className="ml-2">Receipt</span>
          </button>
          <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
            <Save className="h-4 w-4" />
            <span className="ml-2">{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      </div>

      <section className="card p-6">
        {isFlow1(record) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Sender name</label>
              <input className="field" value={record.sender_name} onChange={(event) => setRecord({ ...record, sender_name: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Sender phone</label>
              <input className="field" value={record.sender_phone} onChange={(event) => setRecord({ ...record, sender_phone: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Product description</label>
              <textarea className="field min-h-24" value={record.product_description} onChange={(event) => setRecord({ ...record, product_description: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="field" value={record.product_category} onChange={(event) => setRecord({ ...record, product_category: event.target.value as Flow1Record['product_category'] })}>
                {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Flight route</label>
              <select className="field" value={record.flight_route} onChange={(event) => setRecord({ ...record, flight_route: event.target.value })}>
                {settings.flight_rates.map((rate) => <option key={rate.route} value={rate.route}>{rate.route}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Flight number</label>
              <input className="field" value={record.flight_number} onChange={(event) => setRecord({ ...record, flight_number: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Flight date</label>
              <input className="field" type="date" value={record.flight_date} onChange={(event) => setRecord({ ...record, flight_date: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Weight / quantity</label>
              <input className="field" type="number" min="0.1" step="0.1" value={record.weight_or_quantity} onChange={(event) => setRecord({ ...record, weight_or_quantity: Number(event.target.value) })} />
            </div>
            <div>
              <label className="field-label">Calculated charge</label>
              <input className="field" type="number" min="0" step="0.1" value={record.calculated_charge} onChange={(event) => setRecord({ ...record, calculated_charge: Number(event.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Notes</label>
              <textarea className="field min-h-24" value={record.notes ?? ''} onChange={(event) => setRecord({ ...record, notes: event.target.value })} />
            </div>
          </div>
        ) : null}

        {isFlow2(record) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">Tracking number</label>
              <input className="field" value={record.tracking_number} onChange={(event) => setRecord({ ...record, tracking_number: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Platform</label>
              <select className="field" value={record.platform} onChange={(event) => setRecord({ ...record, platform: event.target.value })}>
                {FLOW2_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Weight (kg)</label>
              <input className="field" type="number" min="0.1" step="0.1" value={record.weight_kg} onChange={(event) => setRecord({ ...record, weight_kg: Number(event.target.value) })} />
            </div>
            <div>
              <label className="field-label">Buyer name</label>
              <input className="field" value={record.buyer_name} onChange={(event) => setRecord({ ...record, buyer_name: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Buyer phone</label>
              <input className="field" value={record.buyer_phone} onChange={(event) => setRecord({ ...record, buyer_phone: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Date received</label>
              <input className="field" type="date" value={record.date_received} onChange={(event) => setRecord({ ...record, date_received: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field" value={record.status} onChange={(event) => setRecord({ ...record, status: event.target.value as Flow2Record['status'] })}>
                {FLOW2_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Calculated charge</label>
              <input className="field" type="number" min="0" step="0.1" value={record.calculated_charge} onChange={(event) => setRecord({ ...record, calculated_charge: Number(event.target.value) })} />
            </div>
          </div>
        ) : null}

        {isFlow3(record) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Sender name</label>
              <input className="field" value={record.sender_name} onChange={(event) => setRecord({ ...record, sender_name: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Sender phone</label>
              <input className="field" value={record.sender_phone} onChange={(event) => setRecord({ ...record, sender_phone: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Collector name</label>
              <input className="field" value={record.collector_name} onChange={(event) => setRecord({ ...record, collector_name: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Collector phone</label>
              <input className="field" value={record.collector_phone} onChange={(event) => setRecord({ ...record, collector_phone: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Item description</label>
              <textarea className="field min-h-24" value={record.item_description} onChange={(event) => setRecord({ ...record, item_description: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Date received</label>
              <input className="field" type="date" value={record.date_received} onChange={(event) => setRecord({ ...record, date_received: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field" value={record.status} onChange={(event) => setRecord({ ...record, status: event.target.value as Flow3Record['status'] })}>
                {FLOW3_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Collected timestamp</label>
              <input
                className="field"
                type="datetime-local"
                value={record.date_collected ? record.date_collected.slice(0, 16) : ''}
                onChange={(event) => setRecord({ ...record, date_collected: event.target.value ? new Date(event.target.value).toISOString() : null })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Notes</label>
              <textarea className="field min-h-24" value={record.notes ?? ''} onChange={(event) => setRecord({ ...record, notes: event.target.value })} />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">Current total</p>
            <p>{'calculated_charge' in record ? formatCurrency(record.calculated_charge) : 'No charge for pickup flow'}</p>
          </div>
          {('calculated_charge' in record) ? (
            <button type="button" className="btn-secondary" onClick={recalculate}>Recalculate from snapshot</button>
          ) : null}
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => navigate('/search')}>Done</button>
      </div>

      {showReceipt ? <Receipt record={record} onClose={() => setShowReceipt(false)} /> : null}
    </div>
  )
}
