'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { cn } from '@/lib/utils'
import type { DistributionAnalysis } from '@/types'

const channelTypeColors: Record<string, string> = {
  Community: 'tag-green',
  Media: 'tag-blue',
  Outreach: 'tag-amber',
  Partnership: 'tag-gray',
  Content: 'tag-blue',
}

export default function DistributionPage() {
  const { activeProject } = useProject()
  const { result, loading, pending, error, regenerate } = useProjectAnalysis<DistributionAnalysis>('distribution')

  // localStorage safety net — shows last-seen result immediately even before context hydrates
  const [localResult, setLocalResult] = useState<DistributionAnalysis | null>(null)
  useEffect(() => {
    if (!activeProject?.id) return
    try {
      const raw = localStorage.getItem(`forge:analysis:${activeProject.id}:distribution`)
      if (raw) setLocalResult(JSON.parse(raw) as DistributionAnalysis)
    } catch {}
  }, [activeProject?.id])
  useEffect(() => {
    if (!result || !activeProject?.id) return
    try { localStorage.setItem(`forge:analysis:${activeProject.id}:distribution`, JSON.stringify(result)) } catch {}
  }, [result, activeProject?.id])

  const displayResult = result ?? localResult

  return (
    <>
      <Topbar title="Distribution" subtitle="Find your launch channels" />
      <div className="p-5 max-w-3xl mx-auto">

        {!activeProject && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">📣</div>
            <p className="text-sm font-medium text-ink mb-1">No project selected</p>
            <p className="text-xs text-ink4 max-w-xs">Select a project from the sidebar. Your distribution strategy will appear here automatically after you run Idea Lab.</p>
          </div>
        )}

        {activeProject && (loading || pending) && !displayResult && (
          <div className="bg-surface border border-border rounded-forge p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-ink3">Mapping your launch channels...</p>
            </div>
            <div className="space-y-2">
              <div className="shimmer-bar rounded" style={{ height: 12, width: '70%' }} />
              <div className="shimmer-bar rounded" style={{ height: 12, width: '50%' }} />
              <div className="shimmer-bar rounded mt-4" style={{ height: 12, width: '65%' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">{error}</div>
        )}

        {activeProject && !loading && !pending && !displayResult && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">📣</div>
            <p className="text-sm font-medium text-ink mb-1">No strategy yet</p>
            <p className="text-xs text-ink4 max-w-xs mb-4">Run Idea Lab first and this will populate automatically.</p>
            <button
              onClick={() => regenerate({ desc: activeProject.idea })}
              className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Run now
            </button>
          </div>
        )}

        {displayResult && (
          <div className="animate-fadeUp space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink4">{displayResult.channels.length} channels identified</p>
              <button
                onClick={() => regenerate({ desc: activeProject!.idea })}
                className="text-xs text-ink4 hover:text-ink transition-colors underline underline-offset-2"
              >
                Regenerate
              </button>
            </div>
            {displayResult.channels.map((ch, i) => (
              <div key={i} className="bg-surface border border-border rounded-forge p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-ink">{ch.name}</h3>
                      <span className={cn('tag', channelTypeColors[ch.type] || 'tag-gray')}>{ch.type}</span>
                    </div>
                    <p className="text-xs text-ink3 mt-1 leading-relaxed">{ch.why}</p>
                  </div>
                </div>
                <div className="ml-11 space-y-2">
                  <div className="bg-surface2 rounded-forge p-3 border border-border">
                    <p className="text-[10px] text-ink4 uppercase font-medium mb-1">Action</p>
                    <p className="text-xs text-ink2">{ch.action}</p>
                  </div>
                  {ch.contacts.length > 0 && (
                    <div>
                      <p className="text-[10px] text-ink4 uppercase font-medium mb-1.5">Contacts / Communities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ch.contacts.map((c, j) => (
                          <span key={j} className="tag tag-gray">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
