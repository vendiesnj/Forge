'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { cn } from '@/lib/utils'

const typeLabels: Record<string, { label: string; color: string }> = {
  idea: { label: 'Idea Analysis', color: 'bg-amber' },
  market: { label: 'Market Analysis', color: 'bg-blue' },
  distribution: { label: 'Distribution', color: 'bg-green' },
  gaps: { label: 'Market Gaps', color: 'bg-green' },
  patent: { label: 'Patent Analysis', color: 'bg-ink3' },
  acquire: { label: 'Acquire', color: 'bg-ink3' },
}

interface Stats {
  totalAnalyses: number
  totalProjects: number
  totalRequests: number
  typeCounts: Record<string, number>
  recentActivity: Array<{ type: string; created_at: string; input: Record<string, string> }>
  projects: Array<{ id: string; name: string; track: string; created_at: string }>
  last30Days: Record<string, number>
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxTypeCount = stats ? Math.max(...Object.values(stats.typeCounts), 1) : 1

  return (
    <>
      <Topbar title="Performance" subtitle="Your real activity" />
      <div className="p-5 max-w-4xl mx-auto space-y-4">

        {loading && <div className="shimmer-bar rounded-full" />}

        {!loading && stats && (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Analyses Run', value: stats.totalAnalyses, sub: 'total AI analyses' },
                { label: 'Projects', value: stats.totalProjects, sub: 'ideas saved' },
                { label: 'Build Requests', value: stats.totalRequests, sub: 'posted to marketplace' },
              ].map((m) => (
                <div key={m.label} className="bg-surface border border-border rounded-forge p-4">
                  <p className="text-xs text-ink4 mb-1">{m.label}</p>
                  <p className="text-2xl font-bold text-ink">{m.value}</p>
                  <p className="text-xs text-ink4 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Analyses by type */}
            <div className="bg-surface border border-border rounded-forge p-5">
              <p className="text-xs font-medium text-ink2 mb-4">Analyses by type</p>
              {Object.keys(typeLabels).map((type) => {
                const count = stats.typeCounts[type] || 0
                const pct = Math.round((count / maxTypeCount) * 100)
                const meta = typeLabels[type]
                return (
                  <div key={type} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink2">{meta.label}</span>
                      <span className="text-xs font-medium text-ink">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', meta.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {stats.totalAnalyses === 0 && (
                <p className="text-xs text-ink4 text-center py-4">No analyses yet — run your first one in Idea Lab</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Projects list */}
              <div className="bg-surface border border-border rounded-forge p-5">
                <p className="text-xs font-medium text-ink2 mb-3">Your Projects</p>
                {stats.projects.length === 0 ? (
                  <p className="text-xs text-ink4">No projects yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.projects.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="text-sm">
                          {p.track === 'software' ? '💻' : p.track === 'invention' ? '⚙️' : '🏢'}
                        </span>
                        <span className="text-xs text-ink truncate flex-1">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div className="bg-surface border border-border rounded-forge p-5">
                <p className="text-xs font-medium text-ink2 mb-3">Recent Activity</p>
                {stats.recentActivity.length === 0 ? (
                  <p className="text-xs text-ink4">No activity yet</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-thin">
                    {stats.recentActivity.map((a, i) => {
                      const label = typeLabels[a.type]?.label ?? a.type
                      const preview = a.input?.idea || a.input?.query || a.input?.sector || a.input?.invention || ''
                      return (
                        <div key={i} className="flex items-start gap-2 py-1 border-b border-border/50 last:border-0">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', typeLabels[a.type]?.color ?? 'bg-ink4')} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-ink">{label}</p>
                            {preview && <p className="text-[10px] text-ink4 truncate">{preview}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && !stats && (
          <p className="text-sm text-ink4 text-center py-10">Could not load stats</p>
        )}
      </div>
    </>
  )
}
