'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'

const LABELS: Record<string, string> = {
  github: 'GitHub',
  vercel: 'Vercel',
}

export function ConnectionHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { markStepComplete } = useProject()
  const { refresh } = useIntegrations()
  const [toast, setToast] = useState<{ provider: string; show: boolean } | null>(null)
  // Prevent double-processing when router.replace changes searchParams
  const handled = useRef<Set<string>>(new Set())

  // Handle URL params — runs when searchParams change
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected && !handled.current.has(connected)) {
      handled.current.add(connected)
      refresh()
      if (connected === 'github' || connected === 'vercel') markStepComplete('keys_generated')
      router.replace(pathname)
      setToast({ provider: connected, show: true })
    }

    if ((error === 'github_not_configured' || error === 'vercel_not_configured') && !handled.current.has(error)) {
      handled.current.add(error)
      console.error(`OAuth not configured: ${error}`)
      router.replace(pathname)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toast lifecycle — independent effect so cleanup never cancels the timers
  useEffect(() => {
    if (!toast?.show) return
    const hide = setTimeout(() => setToast(t => t ? { ...t, show: false } : null), 3200)
    const remove = setTimeout(() => setToast(null), 3900)
    return () => { clearTimeout(hide); clearTimeout(remove) }
  }, [toast?.provider]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 transition-all duration-500 ease-in-out"
      style={{
        opacity: toast.show ? 1 : 0,
        transform: `translateX(-50%) translateY(${toast.show ? '0px' : '10px'})`,
      }}
    >
      <div className="flex items-center gap-2.5 bg-ink text-white text-sm font-medium px-4 py-3 rounded-forge shadow-lg whitespace-nowrap">
        <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
          <circle cx="8" cy="8" r="7" strokeWidth="1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l2 2 4-4" />
        </svg>
        {LABELS[toast.provider] ?? toast.provider} connected successfully
      </div>
    </div>
  )
}
