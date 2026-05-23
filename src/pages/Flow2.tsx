import { Barcode, Camera, CheckCircle2, FileText, RefreshCcw, ScanLine } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BarcodeScanner from '../components/BarcodeScanner'
import Receipt from '../components/Receipt'
import StatusBadge from '../components/StatusBadge'
import { calculateFlow2Pricing, createFlow2Record, getFlow2Records, updateFlow2Status } from '../db/db'
import {
  FLOW2_PLATFORMS,
  FLOW2_STATUSES,
  detectPlatform,
  formatCurrency,
  toDateInput,
  type Flow2Draft,
  type Flow2Record,
  type Flow2Status,
} from '../db/schema'
import { useAuth } from '../contexts/AuthContext'
import { useDB } from '../hooks/useDB'

const emptyDraft = (): Flow2Draft => ({
  tracking_number: '',
  platform: '',
  buyer_name: '',
  buyer_phone: '',
  weight_kg: 0.5,
  date_received: toDateInput(),
  status: 'Received',
})

export default function Flow2() {
  const { isAdmin } = useAuth()
  const { settings, settingsUpdatedAt } = useDB()
  const [form, setForm] = useState<Flow2Draft>(emptyDraft())
  const [records, setRecords] = useState<Flow2Record[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<Flow2Record | null>(null)
  const hidBuffer = useRef('')
  const lastKeyTime = useRef(0)

  const livePricing = useMemo(
    () => calculateFlow2Pricing(form, settings, settingsUpdatedAt || new Date().toISOString()),
    [form, settings, settingsUpdatedAt],
  )

  const loadRecords = async () => {
    setLoading(true)
    setRecords((await getFlow2Records()).slice(0, 12))
    setLoading(false)
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const applyTrackingNumber = (value: string) => {
    const trimmed = value.trim()
    const detected = detectPlatform(trimmed)
    setForm((current) => ({
      ...current,
      tracking_number: trimmed,
      platform: detected || current.platform,
    }))
    setScannerOpen(false)
    setMessage(detected ? `Detected platform: ${detected}` : 'Tracking number captured.')
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return

      const now = Date.now()
      if (now - lastKeyTime.current > 120) hidBuffer.current = ''
      lastKeyTime.current = now

      if (event.key === 'Enter') {
        if (hidBuffer.current.length >= 4) {
          applyTrackingNumber(hidBuffer.current)
        }
        hidBuffer.current = ''
        return
      }

      if (event.key.length === 1) {
        hidBuffer.current += event.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const created = await createFlow2Record({
        ...form,
        platform: form.platform || detectPlatform(form.tracking_number),
      })
      setSelectedRecord(created)
      setMessage(`Created ${created.ref_id} successfully.`)
      setForm(emptyDraft())
      await loadRecords()
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (id: string, status: Flow2Status) => {
    await updateFlow2Status(id, status)
    await loadRecords()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Flow 2 — Online shop parcels</h1>
            <p className="mt-1 text-sm text-slate-500">Capture parcels for Myanmar buyers with scanner or USB barcode reader.</p>
          </div>
          <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right text-sm text-brand-700">
            <p className="font-semibold">Estimated charge</p>
            <p className="text-lg font-bold">{formatCurrency(livePricing.charge)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <button type="button" className="btn-secondary" onClick={() => setScannerOpen(true)}>
            <Camera className="h-4 w-4" />
            <span className="ml-2">Open camera scanner</span>
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-700">
            <Barcode className="h-4 w-4" />
            USB HID readers work anywhere on this screen.
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="field-label">Tracking number</label>
            <div className="flex gap-3">
              <input
                className="field"
                value={form.tracking_number}
                onChange={(event) => {
                  const tracking = event.target.value
                  const detected = detectPlatform(tracking)
                  setForm({ ...form, tracking_number: tracking, platform: detected || form.platform })
                }}
                required
              />
              <button type="button" className="btn-secondary" onClick={() => applyTrackingNumber(form.tracking_number)}>
                <ScanLine className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="field-label">Platform</label>
            <select className="field" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} required>
              <option value="">Select platform</option>
              {FLOW2_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Weight (kg)</label>
            <input className="field" type="number" min="0.1" step="0.1" value={form.weight_kg} onChange={(event) => setForm({ ...form, weight_kg: Number(event.target.value) })} required />
          </div>
          <div>
            <label className="field-label">Buyer name</label>
            <input className="field" value={form.buyer_name} onChange={(event) => setForm({ ...form, buyer_name: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Buyer phone</label>
            <input className="field" value={form.buyer_phone} onChange={(event) => setForm({ ...form, buyer_phone: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Date received</label>
            <input className="field" type="date" value={form.date_received} onChange={(event) => setForm({ ...form, date_received: event.target.value })} required />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Flow2Draft['status'] })}>
              {FLOW2_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              <CheckCircle2 className="h-4 w-4" />
              <span className="ml-2">{saving ? 'Saving…' : 'Create parcel log'}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(emptyDraft())}>Reset form</button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Pricing snapshot</p>
          <p className="mt-1">{livePricing.snapshot.platform} rate {formatCurrency(livePricing.snapshot.per_kg_rate)} per kg ({livePricing.snapshot.source}).</p>
          {message ? <p className="mt-2 font-medium text-emerald-700">{message}</p> : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Recent parcel logs</h2>
              <p className="mt-1 text-sm text-slate-500">Update readiness or collection from here.</p>
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
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">{record.ref_id}</span>
                      <StatusBadge status={record.status} />
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">{record.buyer_name}</h3>
                    <p className="text-sm text-slate-500">{record.tracking_number} • {record.platform}</p>
                    <p className="mt-2 text-sm text-slate-600">{formatCurrency(record.calculated_charge)} • {record.date_received}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setSelectedRecord(record)}>
                      <FileText className="h-4 w-4" />
                    </button>
                    {isAdmin ? <Link className="btn-secondary" to={`/records/flow2/${record.id}/edit`}>Edit</Link> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {FLOW2_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        record.status === status ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                      onClick={() => void changeStatus(record.id, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BarcodeScanner active={scannerOpen} onDetected={applyTrackingNumber} onClose={() => setScannerOpen(false)} />
      {selectedRecord ? <Receipt record={selectedRecord} onClose={() => setSelectedRecord(null)} /> : null}
    </div>
  )
}
