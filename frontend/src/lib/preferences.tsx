import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { Preferences } from '../types'
import { useAuth } from './auth'

interface PreferencesContextValue {
  prefs: Preferences
  loading: boolean
  save: (patch: Partial<Preferences>) => Promise<void>
}

const DEFAULT_PREFS: Preferences = { tone: 'Bullet points', theme: 'dark' }

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api
      .getPreferences()
      .then((res) => setPrefs(res.preferences))
      .catch(() => {
        // defaults are fine
      })
      .finally(() => setLoading(false))
  }, [user])

  const save = useCallback(async (patch: Partial<Preferences>) => {
    const res = await api.savePreferences(patch)
    setPrefs(res.preferences)
  }, [])

  const value = useMemo(() => ({ prefs, loading, save }), [prefs, loading, save])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
