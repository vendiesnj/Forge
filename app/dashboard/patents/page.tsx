'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { PatentAnalysis } from '@/types'

const patentabilityColors: Record<string, string> = {
  high: 'tag-green',
  medium: 'tag-amber',
  low: 'tag-red',
}

export default function PatentsPage() {
  const { activeProject } = useProject()
  const [invention, setInvention] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PatentAnalysis | null>(null)

  useEffect(() => {
    if (activeProject) {
      setInvention(activeProject.idea)
      setResult(null)
    }
  }, [activeProject])

  const handleAnalyze = async () => {
    if (!invention.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'patent', input: { invention: invention.trim() } }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data.result as PatentAnalysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="Patents & IP" subtitle="Protect your invention" />
      <div className="p-5 max-w-3xl mx-auto">
        {/* Input */}
        <div className="bg-surface border border-border rounded-forge p-4 mb-4">
          <label className="block text-xs font-medium text-ink2 mb-2">Describe your invention</label>
          <textarea
            value={invention}
            onChange={(e) => setInvention(e.target.value)}
            rows={4}
            placeholder="e.g. A self-cleaning water filtration system using ultrasonic vibrations to dislodge particulates, combined with UV-C LED sterilization..."
            className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleAnalyze}
              disabled={loading || !invention.trim()}
              className="px-4 py-1.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
              )}
              {loading ? 'Analyzing...' : 'Analyze Patent Potential'}
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
            {/* Overview */}
            <div className="bg-surface border border-border rounded-forge p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-semibold text-ink capitalize">{result.patentType} Patent</h2>
                    <span className={cn('tag', patentabilityColors[result.patentability])}>
                      {result.patentability} patentability
                    </span>
                  </div>
                  <p className="text-xs text-ink3 leading-relaxed">{result.reasoning}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-surface2 rounded-forge p-3 border border-border">
                  <p className="text-[10px] text-ink4 mb-0.5">Estimated Cost</p>
                  <p className="text-sm font-semibold text-ink">{result.estimatedCost}</p>
                </div>
                <div className="bg-surface2 rounded-forge p-3 border border-border">
                  <p className="text-[10px] text-ink4 mb-0.5">Time to Protection</p>
                  <p className="text-sm font-semibold text-ink">{result.timeToProtection}</p>
                </div>
                <div className="bg-surface2 rounded-forge p-3 border border-border col-span-1">
                  <p className="text-[10px] text-ink4 mb-1">Prior Art Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {result.priorArtKeywords.slice(0, 2).map((k, i) => (
                      <span key={i} className="tag tag-gray text-[10px]">{k}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 p-3 bg-surface2 rounded-forge border border-border">
                <p className="text-xs text-ink3">{result.patentabilityReason}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-surface border border-border rounded-forge p-4">
              <p className="text-xs font-medium text-ink2 mb-3">Filing Roadmap</p>
              <div className="space-y-4">
                {result.steps.map((step) => (
                  <div key={step.num} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {step.num}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink mb-0.5">{step.title}</p>
                      <p className="text-xs text-ink3 leading-relaxed mb-1.5">{step.desc}</p>
                      {step.link && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue hover:underline flex items-center gap-1"
                        >
                          {step.link.replace('https://', '').split('/')[0]}
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 10L10 2M5 2h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prior art keywords */}
            <div className="bg-surface border border-border rounded-forge p-4">
              <p className="text-xs font-medium text-ink2 mb-2">Prior Art Search Keywords</p>
              <p className="text-xs text-ink4 mb-3">Use these in Google Patents, USPTO, and Espacenet searches</p>
              <div className="flex flex-wrap gap-2">
                {result.priorArtKeywords.map((k, i) => (
                  <span key={i} className="tag tag-blue">{k}</span>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: 'USPTO Patent Full-Text Database', url: 'https://patft.uspto.gov', desc: 'Search granted US patents' },
                { title: 'Google Patents', url: 'https://patents.google.com', desc: 'Search global patent database' },
                { title: 'Espacenet', url: 'https://worldwide.espacenet.com', desc: 'European Patent Office database' },
                { title: 'USPTO Filing Guide', url: 'https://www.uspto.gov/patents/apply', desc: 'Official patent application guide' },
              ].map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface border border-border rounded-forge p-3 hover:border-border2 transition-colors group"
                >
                  <p className="text-xs font-medium text-ink group-hover:text-blue mb-0.5">{r.title}</p>
                  <p className="text-[10px] text-ink4">{r.desc}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
