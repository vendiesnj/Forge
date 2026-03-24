'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'

interface Step {
  id: string
  label: string
  href: string
  time: string
  desc: string
}

const BASE_STEPS: Step[] = [
  { id: 'idea_analyzed',         label: 'Idea Analysis',         href: '/dashboard/idea-lab',    time: '~5 min',  desc: 'Score your concept and get an action plan' },
  { id: 'market_researched',     label: 'Market Research',       href: '/dashboard/market',       time: '~5 min',  desc: 'Market size, competitors, and timing' },
  { id: 'keys_generated',        label: 'API Keys & Services',   href: '/dashboard/checks',       time: '~30 min', desc: 'Connect GitHub, Vercel, and other services' },
  { id: 'build_guide_generated', label: 'Build Guide',           href: '/dashboard/build-guide',  time: '~5 min',  desc: 'Tech stack, setup steps, deploy checklist' },
  { id: 'distribution_planned',  label: 'Distribution Plan',     href: '/dashboard/distribution', time: '~5 min',  desc: 'Launch channels and go-to-market strategy' },
  { id: 'gaps_analyzed',         label: 'Market Gaps',           href: '/dashboard/gaps',         time: '~5 min',  desc: 'Whitespace opportunities in your market' },
  { id: 'listed_on_marketplace', label: 'Listed on Marketplace', href: '/dashboard/marketplace',  time: '~10 min', desc: 'Showcase your app to orgs, buyers & investors' },
]

const FEATURES_STEP: Step = {
  id: 'features_analyzed',
  label: 'Feature Analysis',
  href: '/dashboard/features',
  time: '~10 min',
  desc: 'Upload code for AI-powered feature suggestions',
}

function getStepsForStage(stage: 'idea' | 'building' | 'built'): { steps: Step[]; relevantIds: Set<string> } {
  if (stage === 'idea') {
    return { steps: BASE_STEPS, relevantIds: new Set(BASE_STEPS.map(s => s.id)) }
  }
  if (stage === 'building') {
    const steps = [...BASE_STEPS]
    // Insert features_analyzed after build_guide_generated
    const buildGuideIdx = steps.findIndex(s => s.id === 'build_guide_generated')
    steps.splice(buildGuideIdx + 1, 0, FEATURES_STEP)
    return { steps, relevantIds: new Set(steps.map(s => s.id)) }
  }
  // built
  const builtSteps = [
    BASE_STEPS.find(s => s.id === 'keys_generated')!,
    FEATURES_STEP,
    BASE_STEPS.find(s => s.id === 'distribution_planned')!,
    BASE_STEPS.find(s => s.id === 'listed_on_marketplace')!,
  ]
  return { steps: builtSteps, relevantIds: new Set(builtSteps.map(s => s.id)) }
}

function parseMinutes(time: string): number {
  const match = time.match(/(\d+)/)
  if (!match) return 0
  const num = parseInt(match[1], 10)
  if (time.includes('hr')) return num * 60
  return num
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function stageBadge(stage: 'idea' | 'building' | 'built') {
  if (stage === 'idea') return { emoji: '💡', label: 'Idea', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
  if (stage === 'building') return { emoji: '🔨', label: 'Building', color: 'bg-blue-50 text-blue-700 border-blue-200' }
  return { emoji: '🚀', label: 'Built', color: 'bg-green-50 text-green-700 border-green-200' }
}

export default function OverviewPage() {
  const { activeProject } = useProject()
  const router = useRouter()

  if (!activeProject) return null

  const stage = activeProject.stage
  const completed = new Set(activeProject.steps_completed ?? [])
  const { steps, relevantIds } = getStepsForStage(stage)

  const doneCount = steps.filter(s => completed.has(s.id)).length
  const totalCount = steps.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // Estimate time to launch
  const incompleteSteps = steps.filter(s => !completed.has(s.id))
  const taskMinutes = incompleteSteps.reduce((sum, s) => sum + parseMinutes(s.time), 0)
  const taskWeeks = Math.ceil(taskMinutes / (60 * 5)) // assume ~5 hrs/week on tasks
  const buildBuffer = stage === 'idea' ? 8 : stage === 'building' ? 4 : 0
  const estWeeksLow = buildBuffer + taskWeeks
  const estWeeksHigh = estWeeksLow + 2
  const isLaunched = completed.has('listed_on_marketplace')

  const badge = stageBadge(stage)

  return (
    <>
      <Topbar title="Project Overview" />
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-ink">{activeProject.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${badge.color}`}>
              {badge.emoji} {badge.label}
            </span>
          </div>
          {activeProject.app_url && (
            <a
              href={activeProject.app_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-ink3 hover:text-ink transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {activeProject.app_url}
            </a>
          )}
          <p className="text-xs text-ink4">Started {formatDate(activeProject.created_at)}</p>
        </div>

        {/* Overall Progress */}
        <div className="bg-surface border border-border rounded-forge p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Overall Progress</p>
            <span className="text-2xl font-bold text-ink">{pct}%</span>
          </div>
          <div className="h-3 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-ink rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-ink4">
            <span>{doneCount} of {totalCount} steps done</span>
            {isLaunched ? (
              <span className="text-green-600 font-medium">Launched!</span>
            ) : (
              <span>Est. {estWeeksLow}–{estWeeksHigh} weeks to launch</span>
            )}
          </div>
        </div>

        {/* Steps Checklist */}
        <div className="bg-surface border border-border rounded-forge overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-ink2">Steps Checklist</p>
          </div>
          <div className="divide-y divide-border">
            {steps.map((step, idx) => {
              const done = completed.has(step.id)
              const relevant = relevantIds.has(step.id)
              const dim = !done && !relevant

              return (
                <Link
                  key={step.id}
                  href={step.href}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors group ${dim ? 'opacity-40' : ''}`}
                >
                  {/* Circle / check */}
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                    done
                      ? 'bg-ink border-ink text-white'
                      : 'border-border2 text-ink4 bg-surface2 group-hover:border-ink3'
                  }`}>
                    {done ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3 3 7-6" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Label + desc */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? 'text-ink3 line-through' : 'text-ink'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-ink4 truncate">{step.desc}</p>
                  </div>

                  {/* Time badge */}
                  <span className="shrink-0 text-[10px] px-2 py-0.5 bg-surface2 border border-border rounded-full text-ink4">
                    {step.time}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Step navigation */}
        {(() => {
          const nextStep = steps.find(s => !completed.has(s.id))
          const lastDone = [...steps].reverse().find(s => completed.has(s.id))
          return (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => lastDone && router.push(lastDone.href)}
                disabled={!lastDone}
                className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-forge text-sm text-ink3 hover:text-ink hover:border-border2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {lastDone ? lastDone.label : 'Back'}
              </button>
              {nextStep ? (
                <Link
                  href={nextStep.href}
                  className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-forge text-sm font-medium hover:bg-ink2 transition-colors"
                >
                  Next: {nextStep.label}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <span className="text-sm text-green-600 font-medium">All steps complete!</span>
              )}
            </div>
          )
        })()}

        {/* Estimated Time to Launch */}
        <div className={`rounded-forge border p-4 ${isLaunched ? 'bg-green-50 border-green-200' : 'bg-surface border-border'}`}>
          {isLaunched ? (
            <p className="text-sm font-semibold text-green-700">Launched! Your app is live on the Marketplace.</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-ink2 mb-1">Estimated time to launch</p>
              <p className="text-2xl font-bold text-ink">{estWeeksLow}–{estWeeksHigh} weeks</p>
              <p className="text-xs text-ink4 mt-1">
                {incompleteSteps.length} steps remaining
                {buildBuffer > 0 && ` · includes ~${buildBuffer} week build buffer`}
              </p>
            </>
          )}
        </div>

        {/* Code/URL Status for building/built */}
        {(stage === 'building' || stage === 'built') && (
          <div className="bg-surface border border-border rounded-forge p-4">
            <p className="text-xs font-semibold text-ink2 mb-3">Code Analysis</p>
            {activeProject.app_url ? (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3 3 7-6" />
                  </svg>
                </span>
                <a
                  href={activeProject.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink hover:underline truncate"
                >
                  {activeProject.app_url}
                </a>
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
                  URL connected
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-ink3 flex-1">
                  Upload your code in Features for AI analysis
                </p>
                <Link
                  href="/dashboard/features"
                  className="shrink-0 text-xs px-3 py-1.5 border border-border rounded-forge text-ink3 hover:text-ink hover:border-border2 transition-colors"
                >
                  Go to Features
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}
