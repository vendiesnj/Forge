'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { NextStepBar } from '@/components/next-step-bar'
import { useProject } from '@/components/project-context'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { cn } from '@/lib/utils'
import type { MarketAnalysis } from '@/types'

export default function MarketPage() {
  const { activeProject } = useProject()
  const { result, loading, pending, error, regenerate } = useProjectAnalysis<MarketAnalysis>('market')

  // localStorage safety net — shows last-seen result immediately even before context hydrates
  const [localResult, setLocalResult] = useState<MarketAnalysis | null>(null)
  useEffect(() => {
    if (!activeProject?.id) return
    try {
      const raw = localStorage.getItem(`forge:analysis:${activeProject.id}:market`)
      if (raw) setLocalResult(JSON.parse(raw) as MarketAnalysis)
    } catch {}
  }, [activeProject?.id])
  useEffect(() => {
    if (!result || !activeProject?.id) return
    try { localStorage.setItem(`forge:analysis:${activeProject.id}:market`, JSON.stringify(result)) } catch {}
  }, [result, activeProject?.id])

  const displayResult = result ?? localResult

  const maturityColor = (m: string) => {
    if (m === 'emerging') return 'tag-green'
    if (m === 'growing') return 'tag-amber'
    return 'tag-blue'
  }

  return (
    <>
      <Topbar title="Market Analysis" subtitle="Understand your market" />
      <div className="p-5 max-w-3xl mx-auto">

        {!activeProject && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">📊</div>
            <p className="text-sm font-medium text-ink mb-1">No project selected</p>
            <p className="text-xs text-ink4 max-w-xs">Select a project from the sidebar. Your market analysis will appear here automatically after you run Idea Lab.</p>
          </div>
        )}

        {activeProject && (loading || pending) && !displayResult && (
          <div className="space-y-3">
            <div className="bg-surface border border-border rounded-forge p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0" />
                <p className="text-sm text-ink3">Analyzing your market...</p>
              </div>
              <div className="space-y-2">
                <div className="shimmer-bar rounded" style={{ height: 12, width: '60%' }} />
                <div className="shimmer-bar rounded" style={{ height: 12, width: '40%' }} />
                <div className="shimmer-bar rounded mt-4" style={{ height: 12, width: '80%' }} />
                <div className="shimmer-bar rounded" style={{ height: 12, width: '70%' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">{error}</div>
        )}

        {activeProject && !loading && !pending && !displayResult && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">📊</div>
            <p className="text-sm font-medium text-ink mb-1">No analysis yet</p>
            <p className="text-xs text-ink4 max-w-xs mb-4">Run Idea Lab first and this will populate automatically.</p>
            <button
              onClick={() => regenerate({ query: activeProject.idea })}
              className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Run now
            </button>
          </div>
        )}

        {displayResult && (
          <div className="animate-fadeUp space-y-4">
            <div className="bg-surface border border-border rounded-forge p-5">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-24">
                  <p className="text-xs text-ink4 mb-0.5">Market Size</p>
                  <p className="text-lg font-bold text-ink">{displayResult.marketSize}</p>
                </div>
                <div className="flex-1 min-w-24">
                  <p className="text-xs text-ink4 mb-0.5">Growth Rate</p>
                  <p className="text-lg font-bold text-ink">{displayResult.growthRate}</p>
                </div>
                <div className="flex-1 min-w-24">
                  <p className="text-xs text-ink4 mb-0.5">Buyer Type</p>
                  <p className="text-lg font-bold text-ink">{displayResult.buyerType}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn('tag', maturityColor(displayResult.maturity))}>{displayResult.maturity} market</span>
                <button
                  onClick={() => regenerate({ query: activeProject!.idea })}
                  className="text-xs text-ink4 hover:text-ink transition-colors underline underline-offset-2"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-forge p-4">
              <p className="text-xs font-medium text-ink2 mb-3">Key Players</p>
              <div className="space-y-2">
                {displayResult.players.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-ink">{p.name}</span>
                        <span className="tag tag-gray">{p.share}</span>
                      </div>
                      <p className="text-xs text-ink3">{p.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-forge p-4">
              <p className="text-xs font-medium text-ink2 mb-3">Market Gaps</p>
              <div className="space-y-3">
                {displayResult.gaps.map((g, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-surface2 rounded-forge border border-border">
                    <span className="text-xl">{g.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-ink mb-0.5">{g.title}</p>
                      <p className="text-xs text-ink3">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-forge p-4">
              <p className="text-xs font-medium text-ink2 mb-3">Target Audience</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-ink4 mb-1">Who They Are</p>
                  <p className="text-sm text-ink2">{displayResult.audience.primary}</p>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-1">Willing to Pay</p>
                  <p className="text-sm font-semibold text-ink">{displayResult.audience.willingToPay}</p>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-2">Pain Points</p>
                  <ul className="space-y-1">
                    {displayResult.audience.painPoints.map((p, i) => (
                      <li key={i} className="text-xs text-ink3 flex gap-1.5"><span className="text-red mt-0.5">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-2">Where They Hang Out</p>
                  <ul className="space-y-1">
                    {displayResult.audience.whereTheyHangOut.map((p, i) => (
                      <li key={i} className="text-xs text-ink3 flex gap-1.5"><span className="text-blue mt-0.5">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <NextStepBar href="/dashboard/build-guide" label="Build Guide" description="Get your tech stack, setup steps, and Claude Code prompts" />
          </div>
        )}
      </div>
    </>
  )
}
