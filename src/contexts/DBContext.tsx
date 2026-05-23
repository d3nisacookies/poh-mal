import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getDB, getSettingsBundle } from '../db/db'
import { DEFAULT_SETTINGS, type PricingSettings } from '../db/schema'

interface DBContextValue {
  ready: boolean
  settings: PricingSettings
  settingsUpdatedAt: string
  refreshSettings: () => Promise<void>
}

const DBContext = createContext<DBContextValue | undefined>(undefined)

export function DBProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS)
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState('')

  const refreshSettings = useCallback(async () => {
    const bundle = await getSettingsBundle()
    setSettings(bundle.value)
    setSettingsUpdatedAt(bundle.updatedAt)
  }, [])

  useEffect(() => {
    const boot = async () => {
      await getDB()
      await refreshSettings()
      setReady(true)
    }
    void boot()
  }, [refreshSettings])

  const value = useMemo(
    () => ({ ready, settings, settingsUpdatedAt, refreshSettings }),
    [ready, refreshSettings, settings, settingsUpdatedAt],
  )

  return <DBContext.Provider value={value}>{children}</DBContext.Provider>
}

export function useDBContext(): DBContextValue {
  const context = useContext(DBContext)
  if (!context) throw new Error('useDBContext must be used within DBProvider')
  return context
}
