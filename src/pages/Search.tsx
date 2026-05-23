import { FileText, Filter, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CSVExport from '../components/CSVExport'
import FlowBadge from '../components/FlowBadge'
import Receipt from '../components/Receipt'
import StatusBadge from '../components/StatusBadge'
import { getUnifiedRecords } from '../db/db'
import { formatCurrency, type LogisticsRecord, type UnifiedRecord } from '../db/schema'
import { useAuth } from '../contexts/AuthContext'

export default function Search() {
  const { isAdmin } = useAuth()
  const [records, setRecords] = useState<UnifiedRecord[]>([])
  const [query, setQuery] = useState('')
  const [flowFilter, setFlowFilter] = useState<'all' | 'flow1' | 'flow2' | 'flow3'>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<LogisticsRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRecords = async () => {
    setLoading(true)
    setRecords(await getUnifiedRecords())
    setLoading(false)
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return records.filter((record) => {
      if (flowFilter !== 'all' && record.flow !== flowFilter) return false
      if (statusFilter !== 'all' && record.status !== statusFilter) return false
      if (startDate && record.search_date < startDate) return false
      if (endDate && record.search_date > endDate) return false
      if (!normalized) return true
      const haystack = [
        record.ref_id,
        record.primary_name,
        record.secondary_name,
        record.phone,
        record.secondary_phone,
        record.tracking_number,
        record.description,
        record.search_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [endDate, flowFilter, query, records, startDate, statusFilter])

  const csvRows = filteredRecords.map((record) => ({
    reference_id: record.ref_id,
    flow: record.flowLabel,
    status: record.status,
    name: record.primary_name,
    secondary_name: record.secondary_name,
    phone: record.phone,
    secondary_phone: record.secondary_phone,
    tracking_number: record.tracking_number,
    date: record.search_date,
    description: record.description,
    charge: record.calculated_charge === null ? '' : record.calculated_charge,
  }))

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Universal search</h1>
          <p className="mt-1 text-sm text-slate-500">Search by name, phone, tracking number, reference ID, or date.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CSVExport filename="logistics-records.csv" rows={csvRows} />
          <button type="button" className="btn-secondary" onClick={() => void loadRecords()}>
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center gap-2 text-slate-900">
          <Filter className="h-5 w-5" />
          <h2 className="section-title">Filters</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input className="field xl:col-span-2" placeholder="Search name, phone, tracking, date..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="field" value={flowFilter} onChange={(event) => setFlowFilter(event.target.value as typeof flowFilter)}>
            <option value="all">All flows</option>
            <option value="flow1">Outbound cargo</option>
            <option value="flow2">Online parcels</option>
            <option value="flow3">Inbound pickup</option>
          </select>
          <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="Logged">Logged</option>
            <option value="Received">Received</option>
            <option value="Ready">Ready</option>
            <option value="Collected">Collected</option>
            <option value="Pending">Pending</option>
          </select>
          <div className="grid grid-cols-2 gap-3 xl:col-span-1">
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input className="field" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 text-sm text-slate-500">{filteredRecords.length} matching records</div>
        <div className="divide-y divide-slate-200">
          {loading ? <p className="p-6 text-sm text-slate-500">Loading records…</p> : null}
          {!loading && filteredRecords.length === 0 ? <p className="p-6 text-sm text-slate-500">No records matched your filters.</p> : null}
          {filteredRecords.map((record) => (
            <div key={`${record.flow}-${record.id}`} className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FlowBadge flow={record.flow} />
                    <StatusBadge status={record.status} />
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{record.primary_name}</h3>
                  <p className="text-sm text-slate-500">{record.ref_id} • {record.description}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {record.phone}
                    {record.tracking_number ? ` • ${record.tracking_number}` : ''}
                    {` • ${record.search_date}`}
                  </p>
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
                  {isAdmin ? <Link className="btn-secondary" to={`/records/${record.flow}/${record.id}/edit`}>Edit</Link> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedRecord ? <Receipt record={selectedRecord} onClose={() => setSelectedRecord(null)} /> : null}
    </div>
  )
}
