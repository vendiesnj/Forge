'use client'

import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { cn, scoreBg } from '@/lib/utils'
import type { GapsAnalysis } from '@/types'

const complexityColors: Record<string, string> = {
  low: 'tag-green',
  medium: 'tag-amber',
  high: 'tag-red',
}

export default function GapsPage() {
  const { activeProject } = useProject()
  const { result, loading, pending, error, regenerate } = useProjectAnalysis<GapsAnalysis>('gaps')

  return (
    <>
      <Topbar title="Market Gaps" subtitle="Discover underserved opportunities" />
      <div className="p-5 max-w-3xl mx-auto">

        {!activeProject && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">🔍</div>
            <p className="text-sm font-medium text-ink mb-1">No project selected</p>
            <p className="text-xs text-ink4 max-w-xs">Select a project from the sidebar. Market gaps will appear here automatically after you run Idea Lab.</p>
          </div>
        )}

        {activeProject && (loading || pending) && !result && (
          <div className="bg-surface border border-border rounded-forge p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-ink3">Finding market gaps...</p>
            </div>
            <div className="space-y-2">
              <div className="shimmer-bar rounded" style={{ height: 12, width: '55%' }} />
              <div className="shimmer-bar rounded" style={{ height: 12, width: '75%' }} />
              <div className="shimmer-bar rounded mt-4" style={{ height: 12, width: '45%' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">{error}</div>
        )}

        {activeProject && !loading && !pending && !result && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">🔍</div>
            <p className="text-sm font-medium text-ink mb-1">No gaps analysis yet</p>
            <p className="text-xs text-ink4 max-w-xs mb-4">Run Idea Lab first and this will populate automatically.</p>
            <button
              onClick={() => regenerate({ sector: activeProject.idea })}
              className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Run now
            </button>
          </div>
        )}

        {result && (
          <div className="animate-fadeUp space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink4">{result.opportunities.length} opportunities identified</p>
              <button
                onClick={() => regenerate({ sector: activeProject!.idea })}
                className="text-xs text-ink4 hover:text-ink transition-colors underline underline-offset-2"
              >
                Regenerate
              </button>
            </div>
            {result.opportunities
              .sort((a, b) => b.score - a.score)
              .map((opp, i) => (
                <div key={i} className="bg-surface border border-border rounded-forge p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-ink mb-1">{opp.title}</h3>
                      <p className="text-xs text-ink3 leading-relaxed">{opp.summary}</p>
                    </div>
                    <div className={cn('flex items-center justify-center w-10 h-10 rounded-forge border text-sm font-bold shrink-0', scoreBg(opp.score))}>
                      {opp.score}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-surface2 rounded-forge p-2 border border-border">
                      <p className="text-[10px] text-ink4 mb-0.5">Target User</p>
                      <p className="text-xs text-ink2">{opp.targetUser}</p>
                    </div>
                    <div className="bg-surface2 rounded-forge p-2 border border-border">
                      <p className="text-[10px] text-ink4 mb-0.5">Revenue Model</p>
                      <p className="text-xs text-ink2">{opp.revenueModel}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] text-ink4 mb-0.5">Why Now</p>
                    <p className="text-xs text-ink3">{opp.whyNow}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('tag', complexityColors[opp.buildComplexity] || 'tag-gray')}>{opp.buildComplexity} complexity</span>
                    {opp.tags.map((tag, j) => (
                      <span key={j} className="tag tag-gray">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  )
}
