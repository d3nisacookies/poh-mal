import { CheckCircle2, FileText, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Receipt from '../components/Receipt'
import StatusBadge from '../components/StatusBadge'
import { createFlow3Record, getFlow3Records, markFlow3Collected } from '../db/db'
import { toDateInput, type Flow3Draft, type Flow3Record } from '../db/schema'
import { useAuth } from '../contexts/AuthContext'
import { useDB } from '../hooks/useDB'

const emptyDraft = (): Flow3Draft => ({
  sender_name: '',
  sender_phone: '',
  collector_name: '',
  collector_phone: '',
  item_description: '',
  date_received: toDateInput(),
  date_collected: '',
  status: 'Pending',
  notes: '',
})

export default function Flow3() {
  const { isAdmin } = useAuth()
  const { settings } = useDB()
  const [form, setForm] = useState<Flow3Draft>(emptyDraft())
  const [records, setRecords] = useState<Flow3Record[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<Flow3Record | null>(null)
  const [message, setMessage] = useState('')

  const loadRecords = async () => {
    setLoading(true)
    setRecords((await getFlow3Records()).slice(0, 12))
    setLoading(false)
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const created = await createFlow3Record(form)
      setSelectedRecord(created)
      setMessage(`Created ${created.ref_id} successfully.`)
      setForm(emptyDraft())
      await loadRecords()
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = useMemo(() => records.filter((record) => record.status === 'Pending').length, [records])

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flow 3 — Inbound pickup log</h1>
            <p className="mt-1 text-sm text-slate-500">Track Myanmar-to-Singapore pickup items and collection status.</p>
          </div>
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right text-sm text-amber-700">
            <p className="font-semibold">Pending pickups</p>
            <p className="text-lg font-bold">{pendingCount}</p>
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
          <div>
            <label className="field-label">Collector name</label>
            <input className="field" value={form.collector_name} onChange={(event) => setForm({ ...form, collector_name: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Collector phone</label>
            <input className="field" value={form.collector_phone} onChange={(event) => setForm({ ...form, collector_phone: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Item description</label>
            <textarea className="field min-h-24" value={form.item_description} onChange={(event) => setForm({ ...form, item_description: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Date received</label>
            <input className="field" type="date" value={form.date_received} onChange={(event) => setForm({ ...form, date_received: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Flow3Draft['status'] })}>
              <option value="Pending">Pending</option>
              <option value="Collected">Collected</option>
            </select>
          </div>
          {form.status === 'Collected' ? (
            <div className="md:col-span-2">
              <label className="field-label">Collection timestamp</label>
              <input className="field" type="datetime-local" value={form.date_collected} onChange={(event) => setForm({ ...form, date_collected: event.target.value })} />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <label className="field-label">Notes</label>
            <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              <CheckCircle2 className="h-4 w-4" />
              <span className="ml-2">{saving ? 'Saving…' : 'Create pickup log'}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(emptyDraft())}>Reset form</button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Alert window</p>
          <p className="mt-1">Items pending more than {settings.uncollected_alert_days} days appear on the dashboard alert panel.</p>
          {message ? <p className="mt-2 font-medium text-emerald-700">{message}</p> : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Recent inbound logs</h2>
              <p className="mt-1 text-sm text-slate-500">Mark items as collected when handed over.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => void loadRecords()}>
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? <p className="text-sm text-slate-500">Loading records…</p> : null}
            {records.map((record) => {
              const overdueDays = (Date.now() - new Date(record.date_received).getTime()) / (1000 * 60 * 60 * 24)
              return (
                <div key={record.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">{record.ref_id}</span>
                        <StatusBadge status={record.status} />
                        {record.status === 'Pending' && overdueDays > settings.uncollected_alert_days ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Overdue</span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-900">{record.collector_name}</h3>
                      <p className="text-sm text-slate-500">{record.item_description}</p>
                      <p className="mt-2 text-sm text-slate-600">Received {record.date_received}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary" onClick={() => setSelectedRecord(record)}>
                        <FileText className="h-4 w-4" />
                      </button>
                      {isAdmin ? <Link className="btn-secondary" to={`/records/flow3/${record.id}/edit`}>Edit</Link> : null}
                    </div>
                  </div>
                  {record.status === 'Pending' ? (
                    <div className="mt-4">
                      <button type="button" className="btn-primary" onClick={() => void markFlow3Collected(record.id).then(loadRecords)}>
                        Mark collected now
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-emerald-700">Collected {record.date_collected ? new Date(record.date_collected).toLocaleString() : ''}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {selectedRecord ? <Receipt record={selectedRecord} onClose={() => setSelectedRecord(null)} /> : null}
    </div>
  )
}
