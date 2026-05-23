import {
  Box,
  Boxes,
  Gauge,
  LogOut,
  PackageSearch,
  Plane,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDB } from '../hooks/useDB'

interface NavItem {
  to: string
  label: string
  icon: typeof Gauge
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/flow1', label: 'Outbound', icon: Plane },
  { to: '/flow2', label: 'Parcels', icon: Box },
  { to: '/flow3', label: 'Inbound', icon: Boxes },
  { to: '/search', label: 'Search', icon: PackageSearch },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, adminOnly: true },
]

function navClass(isActive: boolean): string {
  return `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
    isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

export default function Layout() {
  const { isAdmin, logout, role } = useAuth()
  const { ready } = useDB()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => (item.adminOnly ? isAdmin : true)),
    [isAdmin],
  )

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Preparing offline database…</h1>
          <p className="mt-2 text-sm text-slate-500">Loading PGlite and pricing settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="no-print hidden w-72 shrink-0 border-r border-slate-200 bg-white p-6 md:flex md:flex-col">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">POH MAL</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Logistics logger</h1>
          <p className="mt-2 text-sm text-slate-500">Offline-first workflow tracking for SG ↔ Myanmar operations.</p>
        </div>

        <nav className="mt-8 space-y-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => navClass(isActive)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold capitalize text-slate-900">{role}</p>
              <p className="text-xs text-slate-500">{isOnline ? 'Online' : 'Offline mode active'}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Daily operations</h2>
              <p className="text-sm text-slate-500">{new Date().toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isOnline ? 'Synced locally' : 'Offline ready'}
              </span>
              <button type="button" className="btn-secondary hidden sm:inline-flex" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] font-medium ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
                    }`
                  }
                >
                  <Icon className="mb-1 h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
