import { FileText, Plus, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Receipt from '../components/Receipt'
import StatusBadge from '../components/StatusBadge'
import { calculateFlow1Pricing, createFlow1Record, getFlow1Records } from '../db/db'
import {
  PRODUCT_CATEGORIES,
  formatCurrency,
  toDateInput,
  type Flow1Draft,
  type Flow1Record,
} from '../db/schema'
import { useAuth } from '../contexts/AuthContext'
import { useDB } from '../hooks/useDB'

const emptyDraft = (defaultRoute: string): Flow1Draft => ({
  sender_name: '',
  sender_phone: '',
  product_description: '',
  product_category: 'general',
  flight_number: '',
  flight_date: toDateInput(),
  flight_route: defaultRoute,
  weight_or_quantity: 1,
  notes: '',
})

export default function Flow1() {
  const { isAdmin } = useAuth()
  const { settings, settingsUpdatedAt } = useDB()
  const [form, setForm] = useState<Flow1Draft>(emptyDraft(settings.flight_rates[0]?.route ?? 'SIN-RGN'))
  const [records, setRecords] = useState<Flow1Record[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<Flow1Record | null>(null)

  const livePricing = useMemo(
    () => calculateFlow1Pricing(form, settings, settingsUpdatedAt || new Date().toISOString()),
    [form, settings, settingsUpdatedAt],
  )

  const loadRecords = async () => {
    setLoading(true)
    setRecords((await getFlow1Records()).slice(0, 8))
    setLoading(false)
  }

  useEffect(() => {
    if (!form.flight_route && settings.flight_rates[0]) {
      setForm((current) => ({ ...current, flight_route: settings.flight_rates[0].route }))
    }
  }, [form.flight_route, settings.flight_rates])

  useEffect(() => {
    void loadRecords()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const created = await createFlow1Record(form)
      setSelectedRecord(created)
      setMessage(`Created ${created.ref_id} successfully.`)
      setForm(emptyDraft(settings.flight_rates[0]?.route ?? 'SIN-RGN'))
      await loadRecords()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flow 1 — Outbound cargo</h1>
            <p className="mt-1 text-sm text-slate-500">Log cargo shipments from Singapore to Myanmar.</p>
          </div>
          <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right text-sm text-brand-700">
            <p className="font-semibold">Live charge</p>
            <p className="text-lg font-bold">{formatCurrency(livePricing.charge)}</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="field-label">Sender name</label>
            <input className="field" value={form.sender_name} onChange={(event) => setForm({ ...form, sender_name: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Sender phone</label>
            <input className="field" value={form.sender_phone} onChange={(event) => setForm({ ...form, sender_phone: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Product description</label>
            <textarea className="field min-h-24" value={form.product_description} onChange={(event) => setForm({ ...form, product_description: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Product category</label>
            <select className="field" value={form.product_category} onChange={(event) => setForm({ ...form, product_category: event.target.value as Flow1Draft['product_category'] })}>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Flight route</label>
            <select className="field" value={form.flight_route} onChange={(event) => setForm({ ...form, flight_route: event.target.value })} required>
              {settings.flight_rates.map((rate) => (
                <option key={rate.route} value={rate.route}>{rate.route}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Flight number</label>
            <input className="field" value={form.flight_number} onChange={(event) => setForm({ ...form, flight_number: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Flight date</label>
            <input className="field" type="date" value={form.flight_date} onChange={(event) => setForm({ ...form, flight_date: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Weight / quantity</label>
            <input className="field" type="number" min="0.1" step="0.1" value={form.weight_or_quantity} onChange={(event) => setForm({ ...form, weight_or_quantity: Number(event.target.value) })} required />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Notes</label>
            <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Plus className="h-4 w-4" />
              <span className="ml-2">{saving ? 'Saving…' : 'Create cargo log'}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(emptyDraft(settings.flight_rates[0]?.route ?? 'SIN-RGN'))}>
              Reset form
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Rate snapshot</p>
          <p className="mt-1">
            Base rate {formatCurrency(livePricing.snapshot.base_rate)} + surcharge {formatCurrency(livePricing.snapshot.category_surcharge)} with minimum charge {formatCurrency(livePricing.snapshot.min_charge)}.
          </p>
          {message ? <p className="mt-2 font-medium text-emerald-700">{message}</p> : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Recent outbound entries</h2>
              <p className="mt-1 text-sm text-slate-500">Latest cargo logs with printable receipts.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => void loadRecords()}>
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? <p className="text-sm text-slate-500">Loading records…</p> : null}
            {records.map((record) => (
              <div key={record.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{record.ref_id}</span>
                      <StatusBadge status="Logged" />
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">{record.sender_name}</h3>
                    <p className="text-sm text-slate-500">{record.product_description}</p>
                    <p className="mt-2 text-sm text-slate-600">{record.flight_number} • {record.flight_route} • {record.flight_date}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{formatCurrency(record.calculated_charge)}</span>
                    <button type="button" className="btn-secondary" onClick={() => setSelectedRecord(record)}>
                      <FileText className="h-4 w-4" />
                    </button>
                    {isAdmin ? <Link className="btn-secondary" to={`/records/flow1/${record.id}/edit`}>Edit</Link> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedRecord ? <Receipt record={selectedRecord} onClose={() => setSelectedRecord(null)} /> : null}
    </div>
  )
}
