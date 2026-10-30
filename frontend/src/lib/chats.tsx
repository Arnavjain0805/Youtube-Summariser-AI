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
import type { ChatMeta } from '../types'
import { useAuth } from './auth'

interface ChatsContextValue {
  chats: ChatMeta[]
  loading: boolean
  refresh: () => Promise<void>
  upsert: (meta: ChatMeta) => void
  remove: (id: string) => void
}

const ChatsContext = createContext<ChatsContextValue | null>(null)

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [chats, setChats] = useState<ChatMeta[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getChats()
      setChats(res.chats)
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void refresh()
  }, [user, refresh])

  const upsert = useCallback((meta: ChatMeta) => {
    setChats((prev) => [meta, ...prev.filter((c) => c.id !== meta.id)])
  }, [])

  const remove = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const value = useMemo(
    () => ({ chats, loading, refresh, upsert, remove }),
    [chats, loading, refresh, upsert, remove],
  )
  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>
}

export function useChats(): ChatsContextValue {
  const ctx = useContext(ChatsContext)
  if (!ctx) throw new Error('useChats must be used within ChatsProvider')
  return ctx
}
