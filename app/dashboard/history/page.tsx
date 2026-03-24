'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Analysis } from '@/types'

const typeLabels: Record<string, string> = {
  idea: 'Idea Analysis',
  market: 'Market Analysis',
  distribution: 'Distribution',
  gaps: 'Market Gaps',
  patent: 'Patent Analysis',
  acquire: 'Acquire',
}

const typeColors: Record<string, string> = {
  idea: 'tag-amber',
  market: 'tag-blue',
  distribution: 'tag-green',
  gaps: 'tag-green',
  patent: 'tag-gray',
  acquire: 'tag-gray',
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Analysis | null>(null)

  useEffect(() => {
    fetch('/api/analyses')
      .then((r) => r.json())
      .then((d) => setAnalyses(d.analyses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Topbar title="Build History" subtitle="Past analyses & sessions" />
      <div className="p-5 max-w-4xl mx-auto">
        {loading ? (
          <div className="shimmer-bar rounded-full" />
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-ink4" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink mb-1">No analyses yet</p>
            <p className="text-xs text-ink4 max-w-xs">
              Run an idea analysis, market research, or any other analysis to see your history here.
            </p>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* List */}
            <div className="w-64 shrink-0 space-y-2">
              {analyses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={cn(
                    'w-full text-left p-3 rounded-forge border transition-colors',
                    selected?.id === a.id
                      ? 'border-ink bg-surface'
                      : 'border-border bg-surface hover:border-border2'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('tag text-[10px]', typeColors[a.type] || 'tag-gray')}>
                      {typeLabels[a.type] || a.type}
                    </span>
                  </div>
                  <p className="text-xs text-ink truncate">
                    {(a.input as Record<string, string>).idea ||
                      (a.input as Record<string, string>).query ||
                      (a.input as Record<string, string>).sector ||
                      (a.input as Record<string, string>).invention ||
                      'Analysis'}
                  </p>
                  <p className="text-[10px] text-ink4 mt-0.5">{formatRelativeTime(a.created_at)}</p>
                </button>
              ))}
            </div>

            {/* Detail */}
            {selected && (
              <div className="flex-1 bg-surface border border-border rounded-forge p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn('tag', typeColors[selected.type] || 'tag-gray')}>
                    {typeLabels[selected.type] || selected.type}
                  </span>
                  <span className="text-xs text-ink4">{formatRelativeTime(selected.created_at)}</span>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-ink2 mb-2">Input</p>
                  <pre className="text-xs bg-surface2 border border-border rounded-forge p-3 overflow-auto text-ink3 font-mono">
                    {JSON.stringify(selected.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink2 mb-2">Result</p>
                  <pre className="text-xs bg-surface2 border border-border rounded-forge p-3 overflow-auto text-ink3 font-mono max-h-96 scrollbar-thin">
                    {JSON.stringify(selected.result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
