'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/topbar'
import { PageExplainer } from '@/components/page-explainer'
import { NextStepBar } from '@/components/next-step-bar'
import { AnalysisProgress } from '@/components/analysis-progress'
import { useProject } from '@/components/project-context'
import { useProfile } from '@/components/profile-context'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { cn, scoreBg } from '@/lib/utils'
import type { Track, IdeaAnalysis } from '@/types'

const tracks: { value: Track; label: string; emoji: string; desc: string }[] = [
  { value: 'software', label: 'Software', emoji: '💻', desc: 'Apps, SaaS, tools' },
  { value: 'invention', label: 'Invention', emoji: '⚙️', desc: 'Hardware, devices, processes' },
  { value: 'business', label: 'Business', emoji: '🏢', desc: 'Services, stores, agencies' },
]

function ExpandableCard({
  icon, title, badge, defaultOpen = false, children,
}: {
  icon: string; title: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface border border-border rounded-forge overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-ink">{title}</span>
          {badge}
        </div>
        <svg
          className={cn('w-4 h-4 text-ink4 transition-transform shrink-0', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 border-t border-border pt-3">{children}</div>}
    </div>
  )
}

function LevelBadge({ level }: { level: string }) {
  const color = level === 'low' ? 'tag-green' : level === 'medium' ? 'tag-amber' : 'tag-red'
  return <span className={cn('tag', color)}>{level}</span>
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="text-blue underline underline-offset-2 hover:opacity-70 transition-opacity"
    >
      {children}
    </a>
  )
}

const platformLinks: Record<string, string> = {
  market: '/dashboard/market',
  distribution: '/dashboard/distribution',
  gaps: '/dashboard/gaps',
  patents: '/dashboard/patents',
}

function IdeaLabPage() {
  const { activeProject, refreshProjects, setActiveProject, triggerBackgroundAnalyses } = useProject()
  const { skillLevel } = useProfile()
  const searchParams = useSearchParams()
  const autoRun = searchParams.get('autorun') === '1'
  const autoFiredRef = useRef(false)
  const [track, setTrack] = useState<Track>('software')
  const [idea, setIdea] = useState('')
  const [generationProjectId, setGenerationProjectId] = useState<string | null>(null)
  const { result, loading, pending, generating, error, regenerate, cancel } = useProjectAnalysis<IdeaAnalysis>('idea')

  // Pre-fill inputs from active project; don't wipe the cached result
  useEffect(() => {
    if (activeProject) {
      setIdea(activeProject.idea ?? '')
      setTrack(activeProject.track)
    }
  }, [activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once analysis result arrives, update the project name to the AI-generated product name
  const lastUpdatedProjectId = useRef<string | null>(null)
  useEffect(() => {
    if (!result?.productName || !activeProject) return
    if (lastUpdatedProjectId.current === activeProject.id) return
    if (activeProject.name === result.productName) return
    lastUpdatedProjectId.current = activeProject.id
    fetch(`/api/projects/${activeProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: result.productName }),
    })
      .then(() => refreshProjects())
      .catch(() => {})
  }, [result?.productName, activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = useCallback(async () => {
    if (!idea.trim()) return

    let currentProject = activeProject

    if (currentProject) {
      // Update existing project's idea text
      fetch(`/api/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), track }),
      })
        .then(() => refreshProjects())
        .catch(() => {})
    } else {
      // Auto-create project before analysis so the result is always saved
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: idea.trim().split(' ').slice(0, 6).join(' '),
            idea: idea.trim(),
            track,
          }),
        })
        const data = await res.json()
        if (data.project) {
          currentProject = data.project
          setActiveProject(data.project)
          refreshProjects()
        }
      } catch {
        // Continue without project — result still shows in memory
      }
    }

    // Pass the project ID directly so regenerate saves to it even if
    // React hasn't re-rendered with the new activeProject yet
    await regenerate(
      { idea: idea.trim(), track, skillLevel: skillLevel ?? 'intermediate' },
      currentProject?.id,
    )

    // Kick off background analyses
    if (currentProject) {
      setGenerationProjectId(currentProject.id)
      const updatedProject = { ...currentProject, idea: idea.trim(), track }
      triggerBackgroundAnalyses(updatedProject, skillLevel ?? 'intermediate')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, track, activeProject, skillLevel, regenerate, triggerBackgroundAnalyses])

  // Auto-run when coming from new project modal with ?autorun=1
  // Guard on activeProject so we don't fire before context hydrates (which would use null project and create a duplicate)
  useEffect(() => {
    if (!autoRun || autoFiredRef.current) return
    if (!activeProject || !idea.trim() || generating || result) return
    autoFiredRef.current = true
    handleAnalyze()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, idea, activeProject?.id])

  return (
    <>
      <Topbar title="Idea Lab" subtitle="Validate your concept" />
      <div className="p-5 max-w-3xl mx-auto">
        <PageExplainer
          storageKey="idea-lab"
          text="Describe your idea and Forge will score it, break down the market, map your competition, suggest MVP features, recommend a tech stack, and give you a prioritized action plan. Select a project first to save results and track your progress."
        />
        {/* Track selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-ink3 mb-2">Select track</p>
          <div className="grid grid-cols-3 gap-2">
            {tracks.map((t) => (
              <button
                key={t.value}
                onClick={() => setTrack(t.value)}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-forge border transition-all text-left',
                  track === t.value
                    ? 'border-ink bg-ink text-white'
                    : 'border-border bg-surface text-ink hover:border-border2'
                )}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-sm font-medium">{t.label}</span>
                <span className={cn('text-xs', track === t.value ? 'text-white/70' : 'text-ink4')}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="bg-surface border border-border rounded-forge p-4 mb-4">
          <label className="block text-xs font-medium text-ink2 mb-2">
            Describe your {track} idea
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            placeholder={
              track === 'software'
                ? 'e.g. An AI-powered code review tool that integrates with GitHub and suggests security fixes automatically...'
                : track === 'invention'
                ? 'e.g. A smart water bottle that tracks hydration using IoT sensors and reminds you to drink...'
                : 'e.g. A subscription box service for home bakers delivering premium ingredients and recipes monthly...'
            }
            className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-ink4">{idea.length} chars</span>
            <div className="flex items-center gap-2">
              {generating && (
                <button
                  onClick={cancel}
                  className="px-3 py-1.5 border border-border text-sm font-medium text-ink3 rounded-forge hover:border-red hover:text-red transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={loading || pending || generating || !idea.trim()}
                className="px-4 py-1.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating && (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                )}
                {generating ? 'Analyzing...' : 'Analyze Idea'}
              </button>
            </div>
          </div>
        </div>

        {(generating || (generationProjectId && (loading || pending))) && (
          <div className="bg-surface border border-border rounded-forge p-4 mb-4">
            <AnalysisProgress
              ideaGenerating={generating}
              projectId={generationProjectId ?? activeProject?.id ?? null}
            />
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">
            {error}
          </div>
        )}


        {/* Results */}
        {result && (
          <div className="animate-fadeUp space-y-3">

            {/* Score header */}
            <div className="bg-surface border border-border rounded-forge p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{result.productName}</h2>
                  <p className="text-sm text-ink3 mt-0.5">{result.tagline}</p>
                </div>
                <div className={cn('flex items-center justify-center w-16 h-16 rounded-forge border text-2xl font-bold shrink-0', scoreBg(result.score))}>
                  {result.score}
                </div>
              </div>
              <p className="text-sm text-ink2 leading-relaxed mb-3">{result.verdict}</p>
              {result.redFlags?.length > 0 && (
                <div className="bg-red-bg border border-red-border rounded-forge p-3">
                  <p className="text-xs font-semibold text-red mb-2">Red flags to watch</p>
                  <ul className="space-y-1">
                    {result.redFlags.map((flag, i) => (
                      <li key={i} className="text-xs text-red/80 flex gap-2">
                        <span className="shrink-0">⚠</span>{flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Market Opportunity */}
            <ExpandableCard icon="📈" title="Market Opportunity" defaultOpen badge={
              <span className="tag tag-blue">{result.market?.size}</span>
            }>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-ink4 mb-0.5">Growth Rate</p>
                  <p className="text-sm font-medium text-ink">{result.market?.growth}</p>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-0.5">Barrier to Entry</p>
                  <LevelBadge level={result.market?.barrierToEntry} />
                </div>
              </div>
              <div className="mb-2">
                <p className="text-xs text-ink4 mb-1">Market Timing</p>
                <p className="text-sm text-ink2">{result.market?.timing}</p>
              </div>
              <div>
                <p className="text-xs text-ink4 mb-1">Barrier Explained</p>
                <p className="text-sm text-ink2">{result.market?.barrierExplanation}</p>
              </div>
            </ExpandableCard>

            {/* Target Audience */}
            <ExpandableCard icon="🎯" title="Target Audience" defaultOpen badge={
              <span className="tag tag-gray">{result.audience?.willingToPay}</span>
            }>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-ink4 mb-1">Primary User</p>
                  <p className="text-sm text-ink2">{result.audience?.primary}</p>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-1">Pain Points</p>
                  <ul className="space-y-1">
                    {result.audience?.painPoints?.map((p, i) => (
                      <li key={i} className="text-sm text-ink2 flex gap-2"><span className="text-red shrink-0">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-1">Where They Hang Out</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.audience?.whereTheyHangOut?.map((place, i) => (
                      <span key={i} className="tag tag-blue">{place}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-1">Early Adopters</p>
                  <p className="text-sm text-ink2">{result.audience?.earlyAdopters}</p>
                </div>
              </div>
            </ExpandableCard>

            {/* Competition */}
            <ExpandableCard icon="⚔️" title="Competition & Your Edge" badge={
              <LevelBadge level={result.competition?.level} />
            }>
              <div className="space-y-3">
                <div className="space-y-2">
                  {result.competition?.players?.map((p, i) => (
                    <div key={i} className="p-3 bg-surface2 rounded-forge border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink">{p.name}</span>
                        <span className="tag tag-gray">{p.marketShare}</span>
                      </div>
                      <p className="text-xs text-ink3">Weakness: {p.weakness}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-ink4 mb-1">Your Edge</p>
                  <p className="text-sm text-ink2">{result.competition?.yourEdge}</p>
                </div>
              </div>
            </ExpandableCard>

            {/* MVP Features */}
            <ExpandableCard icon="🔧" title="Recommended Features" defaultOpen>
              <div className="mb-4">
                <p className="text-xs font-semibold text-ink2 mb-2">MVP — build these first</p>
                <div className="space-y-2">
                  {result.features?.mvp?.map((f, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-surface2 rounded-forge border border-border">
                      <div className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{f.feature}</p>
                        <p className="text-xs text-ink3 mt-0.5">{f.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {result.features?.niceToHave?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink3 mb-2">Nice to have (v2)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.features.niceToHave.map((f, i) => (
                      <span key={i} className="tag tag-gray">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </ExpandableCard>

            {/* Stack */}
            <ExpandableCard icon="🛠️" title={
              track === 'invention' ? 'Materials & Components' :
              track === 'business' ? 'Tools & Software' :
              'Recommended Tech Stack'
            }>
              <div className="space-y-2">
                {result.techStack?.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface2 rounded-forge border border-border">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <ExternalLink href={t.link}>{t.name}</ExternalLink>
                        {t.beginnerFriendly && <span className="tag tag-green">beginner-friendly</span>}
                      </div>
                      <p className="text-xs text-ink3">{t.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ExpandableCard>

            {/* Monetization */}
            <ExpandableCard icon="💰" title="Monetization" badge={
              <span className="tag tag-amber">{result.monetization?.recommended}</span>
            }>
              <div className="space-y-2">
                {result.monetization?.models?.map((m, i) => (
                  <div key={i} className="p-3 bg-surface2 rounded-forge border border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-ink">{m.model}</span>
                      <span className="text-xs font-semibold text-ink2">{m.examplePrice}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-green mb-0.5 font-medium">PRO</p>
                        <p className="text-xs text-ink3">{m.pros}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-red mb-0.5 font-medium">CON</p>
                        <p className="text-xs text-ink3">{m.cons}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ExpandableCard>

            {/* Action Plan */}
            <ExpandableCard icon="🚀" title="Your Action Plan" defaultOpen>
              <div className="space-y-3">
                {result.actionPlan?.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-surface2 border border-border flex items-center justify-center text-xs font-bold text-ink3 shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold text-ink">{step.title}</p>
                        <span className="text-[10px] text-ink4 bg-surface2 border border-border px-1.5 py-0.5 rounded">{step.timeEstimate}</span>
                      </div>
                      <p className="text-xs text-ink3 mb-1">{step.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {step.link && (
                          <ExternalLink href={step.link}>Open →</ExternalLink>
                        )}
                        {step.platformPage && platformLinks[step.platformPage] && (
                          <Link
                            href={platformLinks[step.platformPage]}
                            className="text-xs text-amber underline underline-offset-2 hover:opacity-70"
                          >
                            Open in Forge →
                          </Link>
                        )}
                      </div>
                      {skillLevel === 'beginner' && step.beginnerNote && (
                        <div className="mt-1.5 px-3 py-2 bg-surface2 border border-border rounded-forge">
                          <p className="text-xs text-ink3">{step.beginnerNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
                <Link href="/dashboard/distribution" className="px-4 py-2 border border-border text-xs font-medium text-ink rounded-forge hover:bg-surface2 transition-colors">
                  Plan distribution →
                </Link>
                <Link href="/dashboard/gaps" className="px-4 py-2 border border-border text-xs font-medium text-ink rounded-forge hover:bg-surface2 transition-colors">
                  Find market gaps →
                </Link>
              </div>
            </ExpandableCard>

            <NextStepBar
              href="/dashboard/market"
              label="Market Analysis"
              description="Your market research is already running in the background"
            />
          </div>
        )}
      </div>
    </>
  )
}

export default function IdeaLabPageWrapper() {
  return (
    <Suspense>
      <IdeaLabPage />
    </Suspense>
  )
}
