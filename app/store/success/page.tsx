'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ink mb-2">Purchase complete</h1>
        <p className="text-sm text-ink3 mb-6">
          Your payment was successful. You&apos;ll receive a confirmation email shortly.
        </p>
        {sessionId && (
          <p className="text-[10px] text-ink4 font-mono mb-6 break-all">
            Session: {sessionId}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Link href="/store" className="text-sm text-ink3 hover:text-ink transition-colors">
            ← Back to store
          </Link>
          <Link href="/dashboard" className="text-sm text-ink3 hover:text-ink transition-colors">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
