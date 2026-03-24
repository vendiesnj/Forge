'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PageExplainerProps {
  text: string
  storageKey?: string
}

export function PageExplainer({ text, storageKey }: PageExplainerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey || typeof window === 'undefined') return false
    return localStorage.getItem(`explainer_${storageKey}`) === '1'
  })

  const dismiss = () => {
    if (storageKey) localStorage.setItem(`explainer_${storageKey}`, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className={cn(
      'flex items-start justify-between gap-3 px-4 py-3 mb-4',
      'bg-surface border border-border rounded-forge'
    )}>
      <p className="text-xs text-ink3 leading-relaxed">{text}</p>
      <button
        onClick={dismiss}
        className="shrink-0 text-ink4 hover:text-ink transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
