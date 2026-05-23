import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserRole } from '../db/schema'

interface AuthContextValue {
  role: UserRole | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (role: UserRole, password: string) => boolean
  logout: () => void
}

const AUTH_KEY = 'logistics-auth-role'
const ADMIN_KEY = 'logistics-admin-password'
const STAFF_KEY = 'logistics-staff-password'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function ensureDefaults(): void {
  if (!localStorage.getItem(ADMIN_KEY)) localStorage.setItem(ADMIN_KEY, 'admin123')
  if (!localStorage.getItem(STAFF_KEY)) localStorage.setItem(STAFF_KEY, 'staff123')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    ensureDefaults()
    const savedRole = sessionStorage.getItem(AUTH_KEY)
    if (savedRole === 'admin' || savedRole === 'staff') {
      setRole(savedRole)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      isAuthenticated: role !== null,
      isAdmin: role === 'admin',
      login: (nextRole, password) => {
        ensureDefaults()
        const key = nextRole === 'admin' ? ADMIN_KEY : STAFF_KEY
        const storedPassword = localStorage.getItem(key)
        const valid = storedPassword === password
        if (valid) {
          sessionStorage.setItem(AUTH_KEY, nextRole)
          setRole(nextRole)
        }
        return valid
      },
      logout: () => {
        sessionStorage.removeItem(AUTH_KEY)
        setRole(null)
      },
    }),
    [role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
