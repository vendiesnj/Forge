'use client'

import { useEffect, useState } from 'react'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { AnalysisType } from '@/types'

interface Step {
  type: AnalysisType | '_idea'
  label: string
}

const STEPS: Step[] = [
  { type: '_idea',        label: 'Idea analysis' },
  { type: 'market',       label: 'Market research' },
  { type: 'buildguide',   label: 'Build guide' },
  { type: 'distribution', label: 'Distribution' },
  { type: 'gaps',         label: 'Market gaps' },
]

interface Props {
  ideaGenerating: boolean
  projectId: string | null
}

export function AnalysisProgress({ ideaGenerating, projectId }: Props) {
  const { pendingAnalyses, analysisCache } = useProject()
  const [visible, setVisible] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const getStatus = (type: Step['type']): 'waiting' | 'loading' | 'done' => {
    if (type === '_idea') {
      if (ideaGenerating) return 'loading'
      if (!projectId) return 'waiting'
      return analysisCache[`${projectId}:idea` as never] ? 'done' : 'waiting'
    }
    if (!projectId) return 'waiting'
    const key = `${projectId}:${type}` as never
    if (analysisCache[key]) return 'done'
    if (pendingAnalyses.has(key)) return 'loading'
    return 'waiting'
  }

  const statuses = STEPS.map(s => getStatus(s.type))
  const doneCount = statuses.filter(s => s === 'done').length
  const loadingIdx = statuses.findIndex(s => s === 'loading')

  const isActive = ideaGenerating || (projectId
    ? STEPS.some(s => s.type !== '_idea' && pendingAnalyses.has(`${projectId}:${s.type}` as never))
    : false)

  const pct = Math.round((doneCount / STEPS.length) * 100)

  useEffect(() => {
    if (isActive || ideaGenerating) {
      setVisible(true)
      setAllDone(false)
    } else if (doneCount > 0 && !isActive && !ideaGenerating) {
      setAllDone(true)
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
  }, [isActive, ideaGenerating, doneCount])

  if (!visible) return null

  const currentStepLabel = loadingIdx >= 0 ? STEPS[loadingIdx].label : allDone ? 'Complete' : 'Starting…'

  return (
    <div className={cn(
      'transition-opacity duration-700',
      allDone && doneCount === STEPS.length ? 'opacity-40' : 'opacity-100'
    )}>
      {/* Step labels row */}
      <div className="flex items-start mb-3">
        {STEPS.map((step, i) => {
          const status = statuses[i]
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.type} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 mb-1.5',
                  status === 'done'
                    ? 'bg-ink text-white'
                    : status === 'loading'
                    ? 'bg-ink/20 text-ink border-2 border-ink animate-pulse'
                    : 'bg-surface2 text-ink4 border border-border'
                )}>
                  {status === 'done'
                    ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 5" /></svg>
                    : i + 1
                  }
                </div>
                {/* Label */}
                <span className={cn(
                  'text-[11px] text-center leading-tight px-0.5',
                  status === 'done' ? 'text-ink3' :
                  status === 'loading' ? 'text-ink font-semibold' :
                  'text-ink4'
                )}>
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div className="flex-shrink-0 w-4 mt-3.5">
                  <div className={cn(
                    'h-0.5 w-full transition-colors duration-500',
                    statuses[i] === 'done' ? 'bg-ink' : 'bg-border'
                  )} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-surface2 rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full bg-ink rounded-full transition-all duration-700 ease-out"
          style={{ width: `${allDone ? 100 : pct}%` }}
        />
        {!allDone && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink3">
          {allDone
            ? '✓ All analyses complete — navigate to any page to see results'
            : <><span className="font-medium text-ink">{currentStepLabel}</span> in progress…</>
          }
        </p>
        <p className="text-xs text-ink4 tabular-nums">{doneCount} / {STEPS.length}</p>
      </div>
    </div>
  )
}

// ─── Slim bar for topbar ──────────────────────────────────────────────────────

export function TopbarProgressBar() {
  const { activeProject, pendingAnalyses, analysisCache } = useProject()
  const [show, setShow] = useState(false)
  const [exiting, setExiting] = useState(false)

  const projectId = activeProject?.id
  const BG_TYPES = ['idea', 'market', 'buildguide', 'distribution', 'gaps'] as AnalysisType[]
  const pending = projectId
    ? BG_TYPES.filter(t => pendingAnalyses.has(`${projectId}:${t}` as never)).length
    : 0
  const completed = projectId
    ? BG_TYPES.filter(t => !!analysisCache[`${projectId}:${t}` as never]).length
    : 0
  const pct = Math.round((completed / BG_TYPES.length) * 100)

  useEffect(() => {
    if (pending > 0) {
      setShow(true)
      setExiting(false)
    } else if (show && pending === 0) {
      const t = setTimeout(() => {
        setExiting(true)
        const t2 = setTimeout(() => setShow(false), 400)
        return () => clearTimeout(t2)
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [pending, show])

  if (!show) return null

  return (
    <div className={cn(
      'absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden transition-opacity duration-400',
      exiting ? 'opacity-0' : 'opacity-100'
    )}>
      <div
        className="h-full bg-ink transition-all duration-700 ease-out"
        style={{ width: `${exiting ? 100 : pct}%` }}
      />
    </div>
  )
}

// ─── Global banner shown across all pages ─────────────────────────────────────

const BG_STEPS = [
  { type: 'market'       as AnalysisType, label: 'Market' },
  { type: 'buildguide'   as AnalysisType, label: 'Build guide' },
  { type: 'distribution' as AnalysisType, label: 'Distribution' },
  { type: 'gaps'         as AnalysisType, label: 'Gaps' },
]

export function GlobalProgressBanner() {
  const { activeProject, pendingAnalyses, analysisCache, triggeredTypes } = useProject()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const projectId = activeProject?.id

  // Only show steps that were actually triggered for this project
  const triggered = projectId ? (triggeredTypes[projectId] ?? null) : null
  const visibleSteps = triggered
    ? BG_STEPS.filter(s => triggered.includes(s.type))
    : BG_STEPS

  const statuses = visibleSteps.map(s => {
    if (!projectId) return 'waiting' as const
    const key = `${projectId}:${s.type}` as never
    if (analysisCache[key]) return 'done' as const
    if (pendingAnalyses.has(key)) return 'loading' as const
    return 'waiting' as const
  })

  const anyPending = statuses.some(s => s === 'loading')
  const doneCount = statuses.filter(s => s === 'done').length
  const pct = visibleSteps.length > 0 ? Math.round((doneCount / visibleSteps.length) * 100) : 0

  useEffect(() => {
    if (anyPending) {
      setVisible(true)
      setLeaving(false)
    } else if (visible && !anyPending) {
      const t = setTimeout(() => {
        setLeaving(true)
        const t2 = setTimeout(() => setVisible(false), 500)
        return () => clearTimeout(t2)
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [anyPending, visible])

  if (!visible) return null

  const currentStep = visibleSteps.find((s, i) => statuses[i] === 'loading')

  return (
    <div className={cn(
      'border-b border-border bg-surface transition-all duration-500 overflow-hidden',
      leaving ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
    )}>
      <div className="px-5 py-2 flex items-center gap-4">
        {/* Spinner */}
        <div className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0" />

        {/* Current step label */}
        <span className="text-xs text-ink3 shrink-0">
          {leaving
            ? <span className="text-green-600 font-medium">All pages ready</span>
            : currentStep
            ? <>Generating <span className="font-medium text-ink">{currentStep.label}</span>…</>
            : 'Starting…'
          }
        </span>

        {/* Step pills */}
        <div className="flex items-center gap-1.5 flex-1">
          {visibleSteps.map((step, i) => {
            const status = statuses[i]
            return (
              <span key={step.type} className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all duration-300',
                status === 'done'    ? 'bg-ink text-white border-ink' :
                status === 'loading' ? 'bg-surface2 text-ink border-ink animate-pulse' :
                'bg-surface2 text-ink4 border-border'
              )}>
                {status === 'done' ? '✓ ' : ''}{step.label}
              </span>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="w-24 shrink-0">
          <div className="h-1 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-ink rounded-full transition-all duration-700 ease-out"
              style={{ width: `${leaving ? 100 : pct}%` }}
            />
          </div>
        </div>

        {/* Count */}
        <span className="text-[10px] text-ink4 tabular-nums shrink-0">{doneCount}/{visibleSteps.length}</span>
      </div>
    </div>
  )
}
