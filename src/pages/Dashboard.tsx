import { AlertTriangle, ArrowRight, FileText, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Receipt from '../components/Receipt'
import FlowBadge from '../components/FlowBadge'
import StatusBadge from '../components/StatusBadge'
import { getFlow3Records, getUnifiedRecords } from '../db/db'
import { formatCurrency, type Flow3Record, type LogisticsRecord, type UnifiedRecord } from '../db/schema'
import { useAuth } from '../contexts/AuthContext'
import { useDB } from '../hooks/useDB'

interface CountCardProps {
  title: string
  total: number
  breakdown: Array<{ label: string; value: number }>
}

function CountCard({ title, total, breakdown }: CountCardProps) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{total}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {breakdown.map((item) => (
          <span key={item.label} className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
            {item.label}: {item.value}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const { settings } = useDB()
  const [records, setRecords] = useState<UnifiedRecord[]>([])
  const [flow3Records, setFlow3Records] = useState<Flow3Record[]>([])
  const [selectedRecord, setSelectedRecord] = useState<LogisticsRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [unified, inbound] = await Promise.all([getUnifiedRecords(), getFlow3Records()])
    setRecords(unified)
    setFlow3Records(inbound)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const byFlow = useMemo(() => {
    const flow1 = records.filter((record) => record.flow === 'flow1')
    const flow2 = records.filter((record) => record.flow === 'flow2')
    const flow3 = records.filter((record) => record.flow === 'flow3')
    return { flow1, flow2, flow3 }
  }, [records])

  const overdueItems = useMemo(() => {
    const now = Date.now()
    return flow3Records.filter((record) => {
      if (record.status === 'Collected') return false
      const diff = now - new Date(record.date_received).getTime()
      return diff / (1000 * 60 * 60 * 24) > settings.uncollected_alert_days
    })
  }, [flow3Records, settings.uncollected_alert_days])

  const recentRecords = records.slice(0, 8)

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of current cargo, parcel, and pickup activity.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void loadData()}>
          <RefreshCcw className="h-4 w-4" />
          <span className="ml-2">Refresh</span>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <CountCard
          title="Outbound cargo"
          total={byFlow.flow1.length}
          breakdown={[{ label: 'Logged', value: byFlow.flow1.length }]}
        />
        <CountCard
          title="Online parcels"
          total={byFlow.flow2.length}
          breakdown={['Received', 'Ready', 'Collected'].map((status) => ({
            label: status,
            value: byFlow.flow2.filter((record) => record.status === status).length,
          }))}
        />
        <CountCard
          title="Inbound pickups"
          total={byFlow.flow3.length}
          breakdown={['Pending', 'Collected'].map((status) => ({
            label: status,
            value: byFlow.flow3.filter((record) => record.status === status).length,
          }))}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Recent entries</h2>
              <p className="mt-1 text-sm text-slate-500">Quick access to the latest records and receipts.</p>
            </div>
            <Link to="/search" className="btn-secondary">
              Search all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? <p className="text-sm text-slate-500">Loading dashboard data…</p> : null}
            {!loading && recentRecords.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No records yet.</p>
            ) : null}
            {recentRecords.map((record) => (
              <div key={`${record.flow}-${record.id}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FlowBadge flow={record.flow} />
                      <StatusBadge status={record.status} />
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">{record.primary_name}</h3>
                    <p className="text-sm text-slate-500">{record.ref_id} • {record.description}</p>
                    <p className="mt-2 text-sm text-slate-600">{record.phone} • {record.search_date}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.calculated_charge !== null ? (
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                        {formatCurrency(record.calculated_charge)}
                      </span>
                    ) : null}
                    <button type="button" className="btn-secondary" onClick={() => setSelectedRecord(record.raw)}>
                      <FileText className="h-4 w-4" />
                    </button>
                    {isAdmin ? (
                      <Link to={`/records/${record.flow}/${record.id}/edit`} className="btn-secondary">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-title">Uncollected pickup alerts</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pending beyond {settings.uncollected_alert_days} days.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {overdueItems.length === 0 ? (
                <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">No overdue inbound pickups.</p>
              ) : (
                overdueItems.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-slate-900">{record.collector_name}</p>
                    <p className="mt-1 text-sm text-slate-600">{record.item_description}</p>
                    <p className="mt-2 text-sm text-amber-800">Received {record.date_received}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title">Staff reminders</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Use Flow 2 for scanned parcels from Shopee, Lazada, Zalora, Ninja Van, J&T, and Qxpress.</li>
              <li>• Admins can edit any record later without changing historical rate versions.</li>
              <li>• Print a receipt after each intake when the customer needs confirmation.</li>
            </ul>
          </div>
        </div>
      </section>

      {selectedRecord ? <Receipt record={selectedRecord} onClose={() => setSelectedRecord(null)} /> : null}
    </div>
  )
}
