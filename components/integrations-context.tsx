'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface Integration {
  provider: string
  meta: {
    login?: string
    avatar_url?: string
    name?: string
    username?: string
  }
  connected_at?: string
}

interface IntegrationsContextValue {
  github: Integration | null
  vercel: Integration | null
  loading: boolean
  refresh: () => Promise<void>
}

const IntegrationsContext = createContext<IntegrationsContextValue>({
  github: null,
  vercel: null,
  loading: true,
  refresh: async () => {},
})

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const [github, setGithub] = useState<Integration | null>(null)
  const [vercel, setVercel] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations')
      if (!res.ok) return
      const data = await res.json()
      setGithub(data.integrations?.find((i: Integration) => i.provider === 'github') ?? null)
      setVercel(data.integrations?.find((i: Integration) => i.provider === 'vercel') ?? null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <IntegrationsContext.Provider value={{ github, vercel, loading, refresh }}>
      {children}
    </IntegrationsContext.Provider>
  )
}

export function useIntegrations() {
  return useContext(IntegrationsContext)
}
