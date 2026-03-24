'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { AnalysisType } from '@/types'

interface NewProjectModalProps {
  onClose: () => void
}

type Stage = 'idea' | 'building' | 'built'

const STAGES: { value: Stage; label: string; emoji: string; desc: string }[] = [
  { value: 'idea',     emoji: '💡', label: 'Just an idea',    desc: 'Starting from scratch — validate and plan' },
  { value: 'building', emoji: '🔨', label: 'In progress',     desc: 'Have some code, want analysis & guidance' },
  { value: 'built',    emoji: '🚀', label: 'Already built',   desc: 'Connect your repo, run analysis, then list on marketplace' },
]

interface PageOption {
  type: AnalysisType | 'idea_lab'
  label: string
  sublabel: string
  route: string
}

const PAGE_OPTIONS: PageOption[] = [
  { type: 'idea_lab',     label: 'Idea Lab',          sublabel: 'Validate concept, score, MVP features', route: '/dashboard/idea-lab' },
  { type: 'market',       label: 'Market Analysis',   sublabel: 'Market size, trends, competition',      route: '/dashboard/market' },
  { type: 'buildguide',   label: 'Build Guide',       sublabel: 'Setup steps, Claude Code prompts',      route: '/dashboard/build-guide' },
  { type: 'distribution', label: 'Distribution',      sublabel: 'Launch channels, GTM strategy',         route: '/dashboard/distribution' },
  { type: 'gaps',         label: 'Market Gaps',       sublabel: 'Opportunities & whitespace',            route: '/dashboard/gaps' },
]

const STAGE_DEFAULTS: Record<Stage, (PageOption['type'])[]> = {
  idea:     ['idea_lab', 'market', 'buildguide', 'distribution', 'gaps'],
  building: ['market', 'buildguide'],
  built:    [],
}

const STAGE_ROUTE: Record<Stage, string> = {
  idea:     '/dashboard/idea-lab',
  building: '/dashboard/build-guide',
  built:    '/dashboard/overview',
}

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  const router = useRouter()
  const { refreshProjects, setActiveProject, triggerBackgroundAnalyses } = useProject()
  const [name, setName] = useState('')
  const [idea, setIdea] = useState('')
  const [track, setTrack] = useState<'software' | 'invention' | 'business'>('software')
  const [stage, setStage] = useState<Stage>('idea')
  const [selected, setSelected] = useState<Set<PageOption['type']>>(new Set(STAGE_DEFAULTS.idea))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleStageChange = (s: Stage) => {
    setStage(s)
    setSelected(new Set(STAGE_DEFAULTS[s]))
  }

  const toggleOption = (type: PageOption['type']) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), idea: idea.trim(), track }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')

      const project = data.project
      setActiveProject(project)
      await refreshProjects()

      // Trigger background analyses for everything except idea_lab (which runs on-page)
      const bgTypes = Array.from(selected).filter(t => t !== 'idea_lab') as AnalysisType[]
      if (bgTypes.length > 0) {
        triggerBackgroundAnalyses(project, 'intermediate', bgTypes)
      }

      // Route: if idea_lab selected → always go there (with autorun if idea text provided).
      // Otherwise use stage default or first selected page.
      if (selected.has('idea_lab')) {
        router.push(idea.trim() ? '/dashboard/idea-lab?autorun=1' : '/dashboard/idea-lab')
      } else {
        const firstSelected = PAGE_OPTIONS.find(p => p.type !== 'idea_lab' && selected.has(p.type))
        router.push(firstSelected?.route ?? STAGE_ROUTE[stage])
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const ctaLabel = selected.has('idea_lab')
    ? 'Start in Idea Lab →'
    : stage === 'built'
    ? 'Go to Overview →'
    : stage === 'building'
    ? 'Jump to Build Guide →'
    : 'Create Project →'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-forge border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">New Project</h2>
          <button onClick={onClose} className="text-ink4 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Project name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My awesome project..."
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">
              Description
              <span className="text-ink4 font-normal ml-1">— needed for any analysis to run</span>
            </label>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder={
                stage === 'built'
                  ? 'Briefly describe what your project does...'
                  : stage === 'building'
                  ? 'What are you building? What problem does it solve?'
                  : 'Describe your idea — what it does, who it\'s for, what problem it solves...'
              }
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
            />
          </div>

          {/* Track */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Track</label>
            <div className="grid grid-cols-3 gap-2">
              {(['software', 'invention', 'business'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrack(t)}
                  className={cn(
                    'py-2 text-xs font-medium rounded-forge border transition-colors capitalize',
                    track === t ? 'bg-ink text-white border-ink' : 'bg-surface border-border text-ink3 hover:border-border2'
                  )}
                >
                  {t === 'software' ? '💻 Software' : t === 'invention' ? '⚙️ Invention' : '🏢 Business'}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">Where are you?</label>
            <div className="grid grid-cols-3 gap-2">
              {STAGES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStageChange(s.value)}
                  className={cn(
                    'flex flex-col items-start gap-1 p-3 rounded-forge border text-left transition-all',
                    stage === s.value ? 'bg-ink text-white border-ink' : 'bg-surface border-border text-ink3 hover:border-border2'
                  )}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{s.label}</span>
                  <span className={cn('text-[10px] leading-tight', stage === s.value ? 'text-white/60' : 'text-ink4')}>
                    {s.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Page checklist */}
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1.5">What do you want Forge to calculate?</label>
            <div className="space-y-1.5">
              {PAGE_OPTIONS.map(opt => {
                const checked = selected.has(opt.type)
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => toggleOption(opt.type)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-forge border text-left transition-all',
                      checked ? 'bg-surface2 border-border2' : 'border-border hover:border-border2'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border',
                      checked ? 'bg-ink border-ink' : 'border-border bg-surface'
                    )}>
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 5l2.5 2.5L8 3" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-xs font-medium', checked ? 'text-ink' : 'text-ink3')}>{opt.label}</span>
                      <span className="text-[10px] text-ink4 ml-2">{opt.sublabel}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {selected.size === 0 && (
              <p className="text-[10px] text-ink4 mt-1.5">Nothing selected — project will be created and you can run analyses manually.</p>
            )}
          </div>

          {error && <p className="text-xs text-red">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-border rounded-forge text-ink3 hover:text-ink hover:border-border2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 text-sm bg-ink text-white rounded-forge font-medium hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
              )}
              {saving ? 'Creating...' : ctaLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
