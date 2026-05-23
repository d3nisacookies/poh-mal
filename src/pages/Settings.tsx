import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { saveSettings } from '../db/db'
import { FLOW2_PLATFORMS, type PricingSettings } from '../db/schema'
import { useDB } from '../hooks/useDB'

export default function Settings() {
  const { settings, settingsUpdatedAt, refreshSettings } = useDB()
  const [form, setForm] = useState<PricingSettings>(settings)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await saveSettings(form)
      await refreshSettings()
      setMessage('Pricing settings saved successfully.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pricing settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage versioned rates used for new shipment logs.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
          <Save className="h-4 w-4" />
          <span className="ml-2">{saving ? 'Saving…' : 'Save settings'}</span>
        </button>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="section-title">Flight rate table</h2>
                <p className="mt-1 text-sm text-slate-500">Base rate per kg or unit by route.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setForm({
                    ...form,
                    flight_rates: [...form.flight_rates, { route: '', base_rate: 0 }],
                  })
                }
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {form.flight_rates.map((rate, index) => (
                <div key={`route-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_160px_auto]">
                  <input
                    className="field"
                    placeholder="Route (e.g. SIN-RGN)"
                    value={rate.route}
                    onChange={(event) => {
                      const flight_rates = [...form.flight_rates]
                      flight_rates[index] = { ...rate, route: event.target.value }
                      setForm({ ...form, flight_rates })
                    }}
                  />
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.1"
                    value={rate.base_rate}
                    onChange={(event) => {
                      const flight_rates = [...form.flight_rates]
                      flight_rates[index] = { ...rate, base_rate: Number(event.target.value) }
                      setForm({ ...form, flight_rates })
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setForm({ ...form, flight_rates: form.flight_rates.filter((_, itemIndex) => itemIndex !== index) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title">Category surcharges</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Object.entries(form.category_surcharges).map(([category, value]) => (
                <div key={category}>
                  <label className="field-label capitalize">{category}</label>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.1"
                    value={value}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category_surcharges: {
                          ...form.category_surcharges,
                          [category]: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="section-title">Parcel rates</h2>
            <p className="mt-1 text-sm text-slate-500">Global fallback plus per-platform rates.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="field-label">Global rate per kg</label>
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.parcel_rates.global}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      parcel_rates: { ...form.parcel_rates, global: Number(event.target.value) },
                    })
                  }
                />
              </div>
              {FLOW2_PLATFORMS.map((platform) => (
                <div key={platform}>
                  <label className="field-label">{platform}</label>
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.parcel_rates[platform]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        parcel_rates: {
                          ...form.parcel_rates,
                          [platform]: Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title">Other pricing rules</h2>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="field-label">Minimum charge floor</label>
                <input className="field" type="number" min="0" step="0.1" value={form.min_charge} onChange={(event) => setForm({ ...form, min_charge: Number(event.target.value) })} />
              </div>
              <div>
                <label className="field-label">Uncollected alert days</label>
                <input className="field" type="number" min="1" step="1" value={form.uncollected_alert_days} onChange={(event) => setForm({ ...form, uncollected_alert_days: Number(event.target.value) })} />
              </div>
            </div>
          </div>

          <div className="card p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Versioning</p>
            <p className="mt-2">Historical records keep the pricing snapshot saved at creation time. New changes apply only to future logs.</p>
            <p className="mt-2 text-xs text-slate-500">Last updated: {settingsUpdatedAt ? new Date(settingsUpdatedAt).toLocaleString() : '—'}</p>
            {message ? <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-700">{message}</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
