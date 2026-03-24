'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { cn } from '@/lib/utils'
import type { DistributionAnalysis, Stage } from '@/types'

// ─── Distribution checklist storage ─────────────────────────────────────────

interface DistroItem {
  id: string
  label: string
  done: boolean
  note: string
}

function loadDistroItems(projectId: string): DistroItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`forge:distro:${projectId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDistroItems(projectId: string, items: DistroItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`forge:distro:${projectId}`, JSON.stringify(items))
}

// ─── Build stage ─────────────────────────────────────────────────────────────

const STAGE_STEPS = [
  'idea_analyzed',
  'market_researched',
  'keys_generated',
  'build_guide_generated',
  'distribution_planned',
  'launched',
]

function getBuildStage(completed: string[]): { label: string; color: string; pct: number } {
  const done = STAGE_STEPS.filter(s => completed.includes(s)).length
  const pct = Math.round((done / STAGE_STEPS.length) * 100)
  if (done === 0)       return { label: 'Idea Stage', color: 'text-amber-600', pct }
  if (done <= 2)        return { label: 'Early Build', color: 'text-blue-600', pct }
  if (done <= 4)        return { label: 'Building', color: 'text-indigo-600', pct }
  if (done < STAGE_STEPS.length) return { label: 'Near Launch', color: 'text-purple-600', pct }
  return { label: 'Launched 🚀', color: 'text-green-600', pct: 100 }
}

// ─── Default distribution channels ───────────────────────────────────────────

const DEFAULT_CHANNELS = [
  'Product Hunt',
  'Twitter / X',
  'LinkedIn',
  'Hacker News',
  'Reddit',
  'Email newsletter',
  'App Store / Play Store',
  'Upload to Forge',
]

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectStatusPanel() {
  const { activeProject, analysisCache, refreshProjects } = useProject()
  const { github, vercel } = useIntegrations()
  const [open, setOpen] = useState(false)
  const [distroItems, setDistroItems] = useState<DistroItem[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditingNote(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Load / sync distro items when project changes
  useEffect(() => {
    if (!activeProject) { setDistroItems([]); return }
    const stored = loadDistroItems(activeProject.id)

    // Get channels from cached analysis if available
    const key = `${activeProject.id}:distribution` as never
    const distroResult = analysisCache[key] as DistributionAnalysis | undefined
    const analysisChannels = distroResult?.channels?.map(c => c.name) ?? []

    // Build channel set: analysis channels + defaults (no duplicates), always include Forge
    const allLabels = Array.from(new Set([
      ...analysisChannels,
      ...DEFAULT_CHANNELS,
    ]))

    // Merge with stored state (preserve done/note)
    const storedMap = Object.fromEntries(stored.map(i => [i.id, i]))
    const merged: DistroItem[] = allLabels.map(label => {
      const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-')
      return storedMap[id] ?? { id, label, done: false, note: '' }
    })

    setDistroItems(merged)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, analysisCache])

  if (!activeProject) return null

  const completed = activeProject.steps_completed ?? []
  const stage = getBuildStage(completed)

  // Missing integrations
  const missingIntegrations: { label: string; href: string }[] = []
  if (!github) missingIntegrations.push({ label: 'GitHub', href: '/dashboard/checks?highlight=github' })
  if (!vercel) missingIntegrations.push({ label: 'Vercel', href: '/dashboard/checks?highlight=vercel' })

  // Missing build steps
  const keySteps = [
    { id: 'idea_analyzed',        label: 'Idea analysis',    href: '/dashboard/idea-lab' },
    { id: 'build_guide_generated',label: 'Build guide',      href: '/dashboard/build-guide' },
    { id: 'keys_generated',       label: 'API keys',         href: '/dashboard/checks' },
  ]
  const missingSteps = keySteps.filter(s => !completed.includes(s.id))

  // Count pending issues for badge
  const issueCount = missingIntegrations.length + missingSteps.length

  const toggleItem = (id: string) => {
    const next = distroItems.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    )
    setDistroItems(next)
    saveDistroItems(activeProject.id, next)
  }

  const updateNote = (id: string, note: string) => {
    const next = distroItems.map(item =>
      item.id === id ? { ...item, note } : item
    )
    setDistroItems(next)
    saveDistroItems(activeProject.id, next)
  }

  const doneCount = distroItems.filter(i => i.done).length

  const updateStage = useCallback(async (newStage: Stage) => {
    if (!activeProject) return
    await fetch(`/api/projects/${activeProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    refreshProjects()
  }, [activeProject, refreshProjects])

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
          open
            ? 'bg-ink text-white'
            : 'text-ink3 hover:text-ink hover:bg-surface2 border border-transparent hover:border-border'
        )}
      >
        <span className={stage.color}>●</span>
        <span>{stage.label}</span>
        {issueCount > 0 && (
          <span className="ml-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
            {issueCount}
          </span>
        )}
        <svg
          className={cn('w-3 h-3 transition-transform', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-80 bg-surface border border-border rounded-forge shadow-lg overflow-hidden">

          {/* Stage header */}
          <div className="px-4 py-3 border-b border-border bg-surface2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink">Build Progress</span>
              <span className={cn('text-xs font-semibold', stage.color)}>{stage.label}</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ink rounded-full transition-all duration-500"
                style={{ width: `${stage.pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-ink4">{completed.length} of {STAGE_STEPS.length} steps done</span>
              <span className="text-[10px] text-ink4">{stage.pct}%</span>
            </div>
            {/* Stage selector */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {([
                { value: 'idea' as Stage, emoji: '💡', label: 'Idea' },
                { value: 'building' as Stage, emoji: '🔨', label: 'Building' },
                { value: 'built' as Stage, emoji: '🚀', label: 'Built' },
              ] as const).map(s => {
                const active = (activeProject.stage ?? 'idea') === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => updateStage(s.value)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded border text-center transition-all',
                      active ? 'bg-ink text-white border-ink' : 'border-border text-ink3 hover:border-border2 bg-surface'
                    )}
                  >
                    <span className="text-sm">{s.emoji}</span>
                    <span className="text-[10px] font-medium">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Missing items */}
          {(missingIntegrations.length > 0 || missingSteps.length > 0) && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-2">Action needed</p>
              <div className="space-y-1.5">
                {missingIntegrations.map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-xs text-ink hover:text-ink2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Connect {item.label}</span>
                    <span className="ml-auto text-ink4 group-hover:text-ink3">→</span>
                  </Link>
                ))}
                {missingSteps.map(step => (
                  <Link
                    key={step.id}
                    href={step.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-xs text-ink hover:text-ink2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-border2 shrink-0" />
                    <span>Run {step.label}</span>
                    <span className="ml-auto text-ink4 group-hover:text-ink3">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Features shortcut */}
          <div className="px-4 py-3 border-b border-border">
            <Link
              href="/dashboard/features"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-xs text-ink hover:text-ink2 group"
            >
              <span className="text-base">✦</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Feature recommendations</p>
                <p className="text-ink4 text-[10px]">Upload your code to get AI suggestions</p>
              </div>
              <span className="text-ink4 group-hover:text-ink3 shrink-0">→</span>
            </Link>
          </div>

          {/* Distribution checklist */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">Distribution</p>
              <span className="text-[10px] text-ink4">{doneCount}/{distroItems.length}</span>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1 -mr-1">
              {distroItems.map(item => (
                <div key={item.id} className="group">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                        item.done
                          ? 'bg-ink border-ink text-white'
                          : 'border-border hover:border-ink3'
                      )}
                    >
                      {item.done && (
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </button>
                    <span className={cn(
                      'text-xs flex-1 min-w-0 truncate',
                      item.done ? 'text-ink4 line-through' : 'text-ink'
                    )}>
                      {item.label}
                      {item.label === 'Upload to Forge' && (
                        <span className="ml-1 text-[9px] text-amber-500 font-semibold">NEW</span>
                      )}
                    </span>
                    <button
                      onClick={() => setEditingNote(editingNote === item.id ? null : item.id)}
                      className={cn(
                        'text-[10px] transition-colors shrink-0',
                        item.note ? 'text-ink3' : 'text-ink4 opacity-0 group-hover:opacity-100',
                        editingNote === item.id && 'text-ink'
                      )}
                    >
                      {item.note ? '📝' : '+ note'}
                    </button>
                  </div>
                  {editingNote === item.id && (
                    <div className="mt-1 ml-5">
                      <input
                        autoFocus
                        type="text"
                        value={item.note}
                        onChange={e => updateNote(item.id, e.target.value)}
                        onBlur={() => setEditingNote(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingNote(null)}
                        placeholder="Add a note…"
                        className="w-full text-[11px] bg-surface2 border border-border rounded px-2 py-1 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                      />
                    </div>
                  )}
                  {item.note && editingNote !== item.id && (
                    <p className="mt-0.5 ml-5 text-[10px] text-ink3 truncate">{item.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
