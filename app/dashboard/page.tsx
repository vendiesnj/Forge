'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { cn } from '@/lib/utils'
import type { Stage } from '@/types'

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { value: Stage; emoji: string; label: string; desc: string; ctaLabel: string }[] = [
  {
    value: 'idea',
    emoji: '💡',
    label: 'New idea',
    desc: 'Validate, plan, and build from scratch',
    ctaLabel: 'Start in Idea Lab →',
  },
  {
    value: 'building',
    emoji: '🔨',
    label: 'In progress',
    desc: 'Have code — analyze it, check keys, get features',
    ctaLabel: 'Go to Features →',
  },
  {
    value: 'built',
    emoji: '🚀',
    label: 'Already built',
    desc: 'Live app — list on marketplace and grow',
    ctaLabel: 'List on Marketplace →',
  },
]

// ─── Idea stage hub ───────────────────────────────────────────────────────────

const IDEA_STEPS: { stepId: string; cacheType: string | null; label: string; href: string; desc: string }[] = [
  { stepId: 'idea_analyzed',        cacheType: 'idea',         label: 'Idea analysis',       href: '/dashboard/idea-lab',    desc: 'Score your concept, MVP features & action plan' },
  { stepId: 'market_researched',    cacheType: 'market',       label: 'Market research',     href: '/dashboard/market',       desc: 'Market size, competitors, timing & gaps' },
  { stepId: 'build_guide_generated',cacheType: 'buildguide',   label: 'Build guide',         href: '/dashboard/build-guide',  desc: 'Tech stack, setup steps, deploy checklist' },
  { stepId: 'distribution_planned', cacheType: 'distribution', label: 'Distribution',        href: '/dashboard/distribution', desc: 'Launch channels & go-to-market strategy' },
  { stepId: 'gaps_analyzed',        cacheType: 'gaps',         label: 'Market gaps',         href: '/dashboard/gaps',         desc: 'Whitespace opportunities in your market' },
  { stepId: 'listed_on_marketplace',cacheType: null,           label: 'List on Marketplace', href: '/dashboard/marketplace',  desc: 'Showcase your app to orgs, buyers & investors' },
]

function IdeaHub() {
  const { activeProject, analysisCache, pendingAnalyses } = useProject()
  if (!activeProject) return null
  const completed = activeProject.steps_completed ?? []

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">{activeProject.name}</h1>
        <p className="text-sm text-ink3 mt-1">Your analysis pipeline — run each step in order.</p>
      </div>

      <div className="space-y-2">
        {IDEA_STEPS.map((step, i) => {
          const cacheKey = step.cacheType ? (`${activeProject.id}:${step.cacheType}` as never) : null
          const pending = cacheKey ? pendingAnalyses.has(cacheKey) : false
          const ready = (cacheKey ? !!analysisCache[cacheKey] : false) || completed.includes(step.stepId)
          const isNextUp = !ready && !pending && (i === 0 || IDEA_STEPS.slice(0, i).some(s => s.cacheType ? !!analysisCache[`${activeProject.id}:${s.cacheType}` as never] : completed.includes(s.stepId)))

          return (
            <Link
              key={step.stepId}
              href={step.href}
              className={cn(
                'flex items-center gap-4 p-4 rounded-forge border transition-all group',
                ready ? 'bg-surface border-border hover:border-border2' :
                isNextUp ? 'bg-surface border-border2 shadow-sm hover:shadow-md' :
                pending ? 'bg-surface border-border' :
                'bg-surface border-border opacity-50'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                ready ? 'bg-ink text-white' :
                pending ? 'bg-ink/15 border-2 border-ink text-ink animate-pulse' :
                isNextUp ? 'bg-ink text-white' :
                'bg-surface2 border border-border text-ink4'
              )}>
                {ready ? '✓' : pending ? '…' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-medium', ready || isNextUp ? 'text-ink' : 'text-ink3')}>{step.label}</p>
                  {pending && <span className="text-[10px] text-ink3 animate-pulse">generating…</span>}
                  {ready && <span className="text-[10px] text-green-600 font-medium">✓ ready</span>}
                </div>
                <p className="text-xs text-ink4 mt-0.5">{step.desc}</p>
              </div>
              <span className="text-sm text-ink4 group-hover:text-ink transition-colors shrink-0">→</span>
            </Link>
          )
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-border">
        <Link
          href="/dashboard/idea-lab"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors"
        >
          {completed.includes('idea_analyzed') ? 'View Idea Lab →' : 'Start with Idea Lab →'}
        </Link>
      </div>
    </div>
  )
}

// ─── Building stage hub ───────────────────────────────────────────────────────

function BuildingHub() {
  const { activeProject } = useProject()
  const { github, vercel } = useIntegrations()
  if (!activeProject) return null
  const completed = activeProject.steps_completed ?? []

  const missingKeys = [
    !github && { label: 'GitHub', id: 'github' },
    !vercel && { label: 'Vercel', id: 'vercel' },
  ].filter(Boolean) as { label: string; id: string }[]

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">{activeProject.name}</h1>
        <p className="text-sm text-ink3 mt-1">Upload your code to get AI-powered analysis and build guidance.</p>
      </div>

      <div className="space-y-3">
        <Link href="/dashboard/features" className="flex items-center gap-4 p-4 rounded-forge border border-border2 bg-surface hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-forge bg-ink text-white flex items-center justify-center text-xl shrink-0">💻</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Upload code → get feature analysis</p>
            <p className="text-xs text-ink3 mt-0.5">Claude reads your codebase and suggests what to build next</p>
          </div>
          <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
        </Link>

        <Link
          href={missingKeys.length === 1 ? `/dashboard/checks?highlight=${missingKeys[0].id}` : '/dashboard/checks'}
          className="flex items-center gap-4 p-4 rounded-forge border bg-surface hover:border-border2 transition-all group"
        >
          <div className={cn('w-10 h-10 rounded-forge flex items-center justify-center text-xl shrink-0', missingKeys.length === 0 ? 'bg-green-100' : 'bg-amber-50')}>🔑</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink">Keys & Services</p>
              {missingKeys.length === 0
                ? <span className="text-[10px] text-green-600 font-medium">All connected ✓</span>
                : <span className="text-[10px] text-amber-600 font-medium">{missingKeys.length} not connected</span>}
            </div>
            <p className="text-xs text-ink3 mt-0.5">
              {missingKeys.length === 0 ? 'GitHub and Vercel are connected' : `Connect ${missingKeys.map(k => k.label).join(' + ')} to enable deployment`}
            </p>
          </div>
          <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
        </Link>

        <Link href="/dashboard/build-guide" className="flex items-center gap-4 p-4 rounded-forge border bg-surface hover:border-border2 transition-all group">
          <div className="w-10 h-10 rounded-forge bg-surface2 flex items-center justify-center text-xl shrink-0">🔧</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink">Build Guide</p>
              {completed.includes('build_guide_generated') && <span className="text-[10px] text-green-600 font-medium">✓ ready</span>}
            </div>
            <p className="text-xs text-ink3 mt-0.5">Setup steps, deploy checklist, and Claude Code prompts</p>
          </div>
          <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
        </Link>

        <div className="pt-2 border-t border-border mt-1">
          <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wide mb-2">Launch</p>
          <Link href="/dashboard/marketplace" className="flex items-center gap-4 p-4 rounded-forge border border-border2 bg-surface hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-forge bg-ink text-white flex items-center justify-center text-xl shrink-0">🌟</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-ink">List on Marketplace</p>
                {completed.includes('listed_on_marketplace') && <span className="text-[10px] text-green-600 font-medium">✓ listed</span>}
              </div>
              <p className="text-xs text-ink3 mt-0.5">Attract buyers, investors, or co-founders</p>
            </div>
            <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Built stage hub ──────────────────────────────────────────────────────────

function BuiltHub() {
  const { activeProject, refreshProjects } = useProject()
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  if (!activeProject) return null

  const saveUrl = async () => {
    await fetch(`/api/projects/${activeProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_url: urlValue.trim() || null }),
    })
    refreshProjects()
    setEditingUrl(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">{activeProject.name}</h1>
        {activeProject.app_url && !editingUrl ? (
          <div className="flex items-center gap-2 mt-1">
            <a href={activeProject.app_url} target="_blank" rel="noopener noreferrer" className="text-sm text-ink3 hover:text-ink underline underline-offset-2 truncate max-w-xs">{activeProject.app_url}</a>
            <button onClick={() => { setUrlValue(activeProject.app_url ?? ''); setEditingUrl(true) }} className="text-[10px] text-ink4 hover:text-ink3">edit</button>
          </div>
        ) : editingUrl ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              type="url"
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveUrl(); if (e.key === 'Escape') setEditingUrl(false) }}
              placeholder="https://yourapp.com"
              className="text-sm px-2 py-1 border border-border rounded-forge bg-surface2 text-ink focus:outline-none focus:border-border2 w-64"
            />
            <button onClick={saveUrl} className="text-xs text-ink3 hover:text-ink">save</button>
            <button onClick={() => setEditingUrl(false)} className="text-xs text-ink4 hover:text-ink3">cancel</button>
          </div>
        ) : (
          <button onClick={() => { setUrlValue(''); setEditingUrl(true) }} className="text-sm text-ink4 hover:text-ink3 mt-1">+ add website URL</button>
        )}
        <p className="text-sm text-ink3 mt-2">Your app is live. Grow it, improve it, and connect with buyers or investors.</p>
      </div>

      <div className="space-y-3">
        <Link href="/dashboard/marketplace" className="flex items-center gap-4 p-4 rounded-forge border border-border2 bg-surface hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-forge bg-ink text-white flex items-center justify-center text-xl shrink-0">🌟</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">List on Forge Marketplace</p>
            <p className="text-xs text-ink3 mt-0.5">Attract buyers, investors, or co-founders</p>
          </div>
          <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
        </Link>

        <Link href="/dashboard/features" className="flex items-center gap-4 p-4 rounded-forge border bg-surface hover:border-border2 transition-all group">
          <div className="w-10 h-10 rounded-forge bg-surface2 flex items-center justify-center text-xl shrink-0">✦</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Feature suggestions</p>
            <p className="text-xs text-ink3 mt-0.5">Upload your code and Claude will suggest what to build next</p>
          </div>
          <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
        </Link>

        <Link href="/dashboard/distribution" className="flex items-center gap-4 p-4 rounded-forge border bg-surface hover:border-border2 transition-all group">
          <div className="w-10 h-10 rounded-forge bg-surface2 flex items-center justify-center text-xl shrink-0">📣</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Distribution channels</p>
            <p className="text-xs text-ink3 mt-0.5">Find the best places to reach your target customers</p>
          </div>
          <span className="text-ink4 group-hover:text-ink transition-colors shrink-0 text-lg">→</span>
        </Link>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter()
  const { setActiveProject, refreshProjects, triggerBackgroundAnalyses } = useProject()
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [name, setName] = useState('')
  const [idea, setIdea] = useState('')
  const [appUrl, setAppUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim() || !selectedStage) return
    setSaving(true)
    setError('')
    try {
      const body: Record<string, string> = { name: name.trim(), track: 'software', stage: selectedStage }
      if (idea.trim()) body.idea = idea.trim()
      if (appUrl.trim()) body.app_url = appUrl.trim()
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')
      const project = data.project
      setActiveProject(project)
      await refreshProjects()

      if (selectedStage === 'idea' && idea.trim()) {
        triggerBackgroundAnalyses(project, 'intermediate')
        router.push('/dashboard/idea-lab?autorun=1')
      } else if (selectedStage === 'building') {
        router.push('/dashboard/features')
      } else {
        router.push('/dashboard/marketplace')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-ink rounded-forge flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Welcome to Forge</h1>
          <p className="text-sm text-ink3 mt-2">Where are you with your project?</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {STAGES.map(stage => (
            <button
              key={stage.value}
              onClick={() => setSelectedStage(stage.value)}
              className={cn(
                'flex flex-col items-start gap-1.5 p-4 rounded-forge border text-left transition-all',
                selectedStage === stage.value
                  ? 'bg-ink text-white border-ink shadow-md'
                  : 'bg-surface border-border hover:border-border2 hover:shadow-sm'
              )}
            >
              <span className="text-2xl">{stage.emoji}</span>
              <span className={cn('text-sm font-semibold leading-tight', selectedStage === stage.value ? 'text-white' : 'text-ink')}>{stage.label}</span>
              <span className={cn('text-[11px] leading-tight', selectedStage === stage.value ? 'text-white/70' : 'text-ink4')}>{stage.desc}</span>
            </button>
          ))}
        </div>

        {selectedStage && (
          <div className="bg-surface border border-border rounded-forge p-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">Project name <span className="text-red">*</span></label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !idea.trim() && handleCreate()}
                placeholder="My awesome project"
                className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
              />
            </div>
            {selectedStage === 'built' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Website URL <span className="text-ink4 font-normal">(optional)</span></label>
                  <input
                    type="url"
                    value={appUrl}
                    onChange={e => setAppUrl(e.target.value)}
                    placeholder="https://yourapp.com"
                    className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">What does your app do? <span className="text-ink4 font-normal">(optional)</span></label>
                  <textarea
                    value={idea}
                    onChange={e => setIdea(e.target.value)}
                    rows={2}
                    placeholder="e.g. A SaaS dashboard for tracking social media metrics..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-ink2 mb-1.5">
                  {selectedStage === 'idea' ? 'Describe your idea' : 'What does your app do?'}
                  {selectedStage === 'idea' && <span className="text-ink4 font-normal ml-1">— powers AI analysis</span>}
                </label>
                <textarea
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  rows={3}
                  placeholder={selectedStage === 'idea'
                    ? 'e.g. An AI tool that helps indie developers find their first 100 customers...'
                    : 'e.g. A SaaS dashboard for tracking social media metrics...'}
                  className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
                />
              </div>
            )}
            {error && <p className="text-xs text-red">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" /></svg>}
              {saving ? 'Creating…' : STAGES.find(s => s.value === selectedStage)?.ctaLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function DashboardHome() {
  const router = useRouter()
  const { activeProject } = useProject()

  useEffect(() => {
    if (activeProject) router.replace('/dashboard/overview')
  }, [activeProject, router])

  if (!activeProject) return <EmptyState />
  return null
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardHome />
    </Suspense>
  )
}
