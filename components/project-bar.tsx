'use client'

import Link from 'next/link'
import { useProject } from '@/components/project-context'
import { ProjectStatusPanel } from '@/components/project-status-panel'
import { cn } from '@/lib/utils'

const buildSteps = [
  { id: 'idea_analyzed',        label: 'Idea',         href: '/dashboard/idea-lab' },
  { id: 'market_researched',    label: 'Market',       href: '/dashboard/market' },
  { id: 'keys_generated',       label: 'Keys',         href: '/dashboard/services' },
  { id: 'build_guide_generated',label: 'Build',        href: '/dashboard/build-guide' },
  { id: 'distribution_planned', label: 'Distribution', href: '/dashboard/distribution' },
  { id: 'launched',             label: 'Launched',     href: null },
]

const trackEmoji: Record<string, string> = {
  software: '💻',
  invention: '⚙️',
  business: '🏢',
}

export function ProjectBar() {
  const { activeProject } = useProject()
  if (!activeProject) return null

  const completed = activeProject.steps_completed ?? []
  const progressPct = Math.round((completed.length / buildSteps.length) * 100)

  return (
    <div className="h-10 bg-surface2 border-b border-border flex items-center px-5 gap-4 shrink-0">
      {/* Project name */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-0 max-w-[160px]">
        <span className="text-sm">{trackEmoji[activeProject.track] ?? '📁'}</span>
        <span className="text-xs font-semibold text-ink truncate">{activeProject.name}</span>
      </div>

      {/* Status panel toggle */}
      <ProjectStatusPanel />

      {/* Divider */}
      <div className="w-px h-4 bg-border shrink-0" />

      {/* Steps */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {buildSteps.map((step, i) => {
          const done = completed.includes(step.id)
          const isLast = i === buildSteps.length - 1

          const content = (
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors',
              done
                ? 'text-ink font-medium'
                : 'text-ink4 hover:text-ink3'
            )}>
              <span className={cn(
                'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 text-[8px] font-bold',
                done ? 'bg-ink border-ink text-white' : 'border-border3 text-ink4'
              )}>
                {done ? '✓' : i + 1}
              </span>
              {step.label}
            </div>
          )

          return (
            <div key={step.id} className="flex items-center gap-1">
              {step.href ? (
                <Link href={step.href} className="hover:opacity-80 transition-opacity">
                  {content}
                </Link>
              ) : (
                <div>{content}</div>
              )}
              {!isLast && (
                <span className="text-border3 text-xs shrink-0">›</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-ink rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[10px] text-ink4">{progressPct}%</span>
      </div>
    </div>
  )
}
