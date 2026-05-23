import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DBProvider } from './contexts/DBContext'
import Dashboard from './pages/Dashboard'
import EditRecord from './pages/EditRecord'
import Flow1 from './pages/Flow1'
import Flow2 from './pages/Flow2'
import Flow3 from './pages/Flow3'
import Login from './pages/Login'
import Search from './pages/Search'
import Settings from './pages/Settings'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/flow1" element={<Flow1 />} />
          <Route path="/flow2" element={<Flow2 />} />
          <Route path="/flow3" element={<Flow3 />} />
          <Route path="/search" element={<Search />} />
          <Route
            path="/settings"
            element={
              <RequireAdmin>
                <Settings />
              </RequireAdmin>
            }
          />
          <Route
            path="/records/:flow/:id/edit"
            element={
              <RequireAdmin>
                <EditRecord />
              </RequireAdmin>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DBProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DBProvider>
    </AuthProvider>
  )
}
