import { LockKeyhole, UserCog, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../db/schema'

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<UserRole>('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const redirectTo = useMemo(() => {
    if (typeof location.state === 'object' && location.state && 'from' in location.state) {
      return String(location.state.from)
    }
    return '/dashboard'
  }, [location.state])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const valid = login(role, password)
    if (!valid) {
      setError('Incorrect password. Please try again.')
      return
    }
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card hidden p-10 lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">POH MAL Logistics</p>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">Manage SG ↔ Myanmar shipments even when the internet drops.</h1>
          <p className="mt-4 max-w-xl text-base text-slate-600">
            Log outbound cargo, scan e-commerce parcels, and track inbound pickups in one offline-ready PWA.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-brand-50 p-4">
              <UserCog className="h-5 w-5 text-brand-600" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Admin controls</p>
              <p className="mt-1 text-sm text-slate-600">Pricing engine, record editing, and historical receipts.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <Users className="h-5 w-5 text-slate-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Staff friendly</p>
              <p className="mt-1 text-sm text-slate-600">Fast forms for daily parcel intake and pickup tracking.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <LockKeyhole className="h-5 w-5 text-slate-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Local only auth</p>
              <p className="mt-1 text-sm text-slate-600">Simple role-based access stored on the device.</p>
            </div>
          </div>
        </section>

        <section className="card p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Sign in</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Use the local device password for your role.</p>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1">
            {([
              ['admin', 'Admin'],
              ['staff', 'Staff'],
            ] as Array<[UserRole, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  role === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="field-label" htmlFor="password">
                Password / PIN
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={role === 'admin' ? 'Enter admin password' : 'Enter staff password'}
                autoComplete="current-password"
                required
              />
            </div>

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <button type="submit" className="btn-primary w-full">
              Sign in as {role}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Default local credentials</p>
            <p className="mt-1">Admin: <span className="font-mono">admin123</span></p>
            <p>Staff: <span className="font-mono">staff123</span></p>
          </div>
        </section>
      </div>
    </div>
  )
}
