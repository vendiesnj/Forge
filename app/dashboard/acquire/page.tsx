'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { AcquireAnalysis } from '@/types'

const typeColors: Record<string, string> = {
  SaaS: 'tag-blue',
  'E-commerce': 'tag-amber',
  Service: 'tag-green',
  Retail: 'tag-gray',
  Content: 'tag-gray',
}

export default function AcquirePage() {
  const { activeProject } = useProject()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AcquireAnalysis | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (activeProject) {
      setQuery(activeProject.idea)
      setResult(null)
      setSelected(null)
    }
  }, [activeProject])

  const handleAnalyze = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setSelected(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'acquire', input: { query: query.trim() } }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data.result as AcquireAnalysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="Acquire a Business" subtitle="Find acquisition targets" />
      <div className="p-5 max-w-4xl mx-auto">
        {/* Input */}
        <div className="bg-surface border border-border rounded-forge p-4 mb-4">
          <label className="block text-xs font-medium text-ink2 mb-2">What type of business are you looking to acquire?</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="e.g. profitable SaaS tool under $500k, e-commerce brand in pet niche, B2B service agency..."
            className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleAnalyze}
              disabled={loading || !query.trim()}
              className="px-4 py-1.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
              )}
              {loading ? 'Searching...' : 'Find Listings'}
            </button>
          </div>
        </div>

        {loading && <div className="shimmer-bar rounded-full mb-4" />}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">
            {error}
          </div>
        )}

        {result && (
          <div className="animate-fadeUp space-y-4">
            {/* Valuation note */}
            <div className="p-4 bg-amber-bg border border-amber-border rounded-forge">
              <p className="text-xs font-medium text-amber mb-1">Valuation Context</p>
              <p className="text-xs text-ink2">{result.valuationNote}</p>
            </div>

            {/* Listings grid */}
            <div className="grid grid-cols-2 gap-3">
              {result.listings.map((listing, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={cn(
                    'text-left p-4 rounded-forge border transition-all',
                    selected === i
                      ? 'border-ink bg-surface shadow-sm'
                      : 'border-border bg-surface hover:border-border2'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{listing.name}</p>
                      <span className={cn('tag text-[10px]', typeColors[listing.type] || 'tag-gray')}>
                        {listing.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink">{listing.price}</p>
                      <p className="text-[10px] text-ink4">{listing.revenue}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink3 leading-relaxed line-clamp-2">{listing.description}</p>

                  {/* Flag summary */}
                  <div className="flex gap-2 mt-2">
                    {listing.greenFlags.length > 0 && (
                      <span className="text-[10px] text-green">✓ {listing.greenFlags.length} positives</span>
                    )}
                    {listing.yellowFlags.length > 0 && (
                      <span className="text-[10px] text-amber">⚠ {listing.yellowFlags.length} cautions</span>
                    )}
                    {listing.redFlags.length > 0 && (
                      <span className="text-[10px] text-red">✗ {listing.redFlags.length} risks</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Detail panel */}
            {selected !== null && result.listings[selected] && (
              <div className="bg-surface border border-border rounded-forge p-5 animate-fadeUp">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-0.5">{result.listings[selected].name}</h3>
                    <p className="text-xs text-ink3">{result.listings[selected].description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-ink">{result.listings[selected].price}</p>
                    <p className="text-xs text-ink4">{result.listings[selected].revenue} ARR</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-medium text-green mb-2">Green Flags</p>
                    <ul className="space-y-1">
                      {result.listings[selected].greenFlags.map((f, j) => (
                        <li key={j} className="text-xs text-ink3 flex gap-1.5">
                          <span className="text-green">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber mb-2">Yellow Flags</p>
                    <ul className="space-y-1">
                      {result.listings[selected].yellowFlags.map((f, j) => (
                        <li key={j} className="text-xs text-ink3 flex gap-1.5">
                          <span className="text-amber">⚠</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red mb-2">Red Flags</p>
                    <ul className="space-y-1">
                      {result.listings[selected].redFlags.map((f, j) => (
                        <li key={j} className="text-xs text-ink3 flex gap-1.5">
                          <span className="text-red">✗</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* DD Checklist */}
            <div className="bg-surface border border-border rounded-forge p-4">
              <p className="text-xs font-medium text-ink2 mb-3">Due Diligence Checklist</p>
              <div className="grid grid-cols-2 gap-2">
                {result.ddChecklist.map((item, i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer group">
                    <input type="checkbox" className="mt-0.5 accent-amber shrink-0" />
                    <span className="text-xs text-ink3 group-hover:text-ink transition-colors">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Link to BizBuySell */}
            {result.searchUrl && (
              <a
                href={result.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-surface border border-border rounded-forge hover:border-border2 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-ink">Search on BizBuySell</p>
                  <p className="text-xs text-ink4">Browse real listings matching your criteria</p>
                </div>
                <svg className="w-4 h-4 text-ink4" viewBox="0 0 16 16" fill="none">
                  <path d="M3 13L13 3M8 3h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </>
  )
}
