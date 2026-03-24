'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthDone() {
  const params = useSearchParams()
  const provider = params.get('provider') ?? 'unknown'
  const projectId = params.get('project') ?? ''

  useEffect(() => {
    // BroadcastChannel works even when window.opener is cleared by cross-origin navigation
    try {
      const ch = new BroadcastChannel('forge-oauth')
      ch.postMessage({ type: 'oauth-success', provider, projectId })
      ch.close()
    } catch {}
    // Also try window.opener as fallback
    try { window.opener?.postMessage({ type: 'oauth-success', provider, projectId }, window.location.origin) } catch {}
    const t = setTimeout(() => window.close(), 800)
    return () => clearTimeout(t)
  }, [provider, projectId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3 3 7-6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Connected successfully</p>
        <p className="text-xs text-gray-400 mt-1">You can close this window</p>
      </div>
    </div>
  )
}

export default function AuthDonePage() {
  return (
    <Suspense>
      <AuthDone />
    </Suspense>
  )
}
