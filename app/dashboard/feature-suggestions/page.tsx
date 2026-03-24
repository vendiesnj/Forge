'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { cn } from '@/lib/utils'

interface SuggestedFeature {
  name: string
  description: string
  why: string
  complexity: 'low' | 'medium' | 'high'
  prompt: string
}

interface CurrentFeature {
  name: string
  description: string
}

interface SuggestionsResult {
  suggestedFeatures: SuggestedFeature[]
  currentFeatures: CurrentFeature[]
  techStack: string[]
  summary: string
  maturity: string
  maturityMessage: string
}

const complexityTag: Record<string, string> = {
  low: 'tag-green',
  medium: 'tag-amber',
  high: 'tag-red',
}

function FeatureSuggestionsInner() {
  const { activeProject } = useProject()
  const { github } = useIntegrations()

  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<SuggestionsResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // Load cached data; auto-run only if no cache exists
  useEffect(() => {
    if (!activeProject?.id) {
      setResult(null)
      return
    }

    // 1. Check Supabase-persisted data on project record
    if (activeProject.feature_suggestions) {
      setResult(activeProject.feature_suggestions as unknown as SuggestionsResult)
      return
    }

    // 2. Check localStorage
    const cached = localStorage.getItem(`forge:suggestions:${activeProject.id}`)
    if (cached) {
      try {
        setResult(JSON.parse(cached))
        return
      } catch {
        // ignore parse errors
      }
    }

    // 3. No cache — auto-run if repo + GitHub connected
    setResult(null)
    if (activeProject.github_repo && github) {
      runAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, github])

  const runAnalysis = async () => {
    if (!activeProject?.github_repo || !activeProject?.id) return
    setError('')
    setLoading(true)
    try {
      const filesRes = await fetch(
        `/api/github/repo-files?repo=${encodeURIComponent(activeProject.github_repo)}`
      )
      if (!filesRes.ok) throw new Error('Failed to load files from GitHub')
      const data = await filesRes.json()

      setLoading(false)
      setAnalyzing(true)

      const analyzeRes = await fetch('/api/code/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: data.files,
          projectName: activeProject.name,
          projectIdea: activeProject.idea,
        }),
      })
      if (!analyzeRes.ok) throw new Error('Failed to analyze codebase')
      const analyzed: SuggestionsResult = await analyzeRes.json()

      setResult(analyzed)
      localStorage.setItem(
        `forge:suggestions:${activeProject.id}`,
        JSON.stringify(analyzed)
      )
      // Persist to Supabase so it survives across devices
      void fetch(`/api/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_suggestions: analyzed }),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  const handleRegenerate = () => {
    if (activeProject?.id) {
      localStorage.removeItem(`forge:suggestions:${activeProject.id}`)
      void fetch(`/api/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_suggestions: null }),
      })
    }
    setResult(null)
    runAnalysis()
  }

  const handleCopy = (feature: SuggestedFeature) => {
    navigator.clipboard.writeText(feature.prompt).catch(() => {})
    setCopied(feature.name)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
      <Topbar title="Feature Suggestions" subtitle="What to build next" />
      <div className="p-5 max-w-3xl mx-auto">

        {/* No project selected */}
        {!activeProject && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">
              💡
            </div>
            <p className="text-sm font-medium text-ink mb-1">No project selected</p>
            <p className="text-xs text-ink4 max-w-xs">
              Select a project from the sidebar to auto-generate feature suggestions.
            </p>
          </div>
        )}

        {/* Project selected but no GitHub repo */}
        {activeProject && !activeProject.github_repo && (
          <div className="bg-surface border border-border rounded-forge p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-surface2 border border-border flex items-center justify-center mb-3 mx-auto text-lg">
              🔗
            </div>
            <p className="text-sm font-medium text-ink mb-1">No GitHub repo linked</p>
            <p className="text-xs text-ink4 max-w-sm mx-auto mb-4">
              Link your GitHub repo in Build Guide to auto-generate feature suggestions from your actual code.
            </p>
            <Link
              href="/dashboard/build-guide"
              className="inline-flex items-center px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Go to Build Guide →
            </Link>
          </div>
        )}

        {/* Loading states */}
        {activeProject && activeProject.github_repo && (loading || analyzing) && (
          <div className="bg-surface border border-border rounded-forge p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-ink3">
                {loading ? 'Loading files from GitHub...' : 'Analyzing your codebase...'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="shimmer-bar rounded" style={{ height: 12, width: '60%' }} />
              <div className="shimmer-bar rounded" style={{ height: 12, width: '80%' }} />
              <div className="shimmer-bar rounded" style={{ height: 12, width: '45%' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && !analyzing && (
          <div className="animate-fadeUp space-y-4">
            {/* Summary header */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-ink3 leading-relaxed">{result.summary}</p>
                <p className="text-xs text-ink4 mt-1">{result.maturityMessage}</p>
              </div>
              <span className="tag tag-amber shrink-0">{result.maturity}</span>
            </div>

            {/* Features */}
            {result.suggestedFeatures.length === 0 ? (
              <div className="bg-surface border border-border rounded-forge p-6 text-center">
                <p className="text-sm text-ink3">
                  No gaps found — your codebase looks complete for its scope.
                </p>
              </div>
            ) : (
              result.suggestedFeatures.map((feature, i) => (
                <div key={i} className="bg-surface border border-border rounded-forge p-4 mb-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-ink flex-1">{feature.name}</span>
                    <span className={cn('tag', complexityTag[feature.complexity] || 'tag-gray')}>
                      {feature.complexity}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-ink3 mb-3">{feature.description}</p>

                  {/* Why */}
                  <div className="mb-3">
                    <p className="text-[10px] text-ink4 uppercase mb-1">Why this?</p>
                    <p className="text-xs text-ink2">{feature.why}</p>
                  </div>

                  {/* Prompt */}
                  <div className="bg-surface2 border border-border rounded-forge p-3 text-xs font-mono text-ink2 whitespace-pre-wrap mb-2">
                    {feature.prompt}
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(feature)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-forge text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors"
                  >
                    {copied === feature.name ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy prompt
                      </>
                    )}
                  </button>
                </div>
              ))
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleRegenerate}
                className="text-xs text-ink4 hover:text-ink transition-colors underline underline-offset-2"
              >
                Regenerate
              </button>
              {result.techStack.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-[10px] text-ink4 uppercase">Stack:</span>
                  {result.techStack.map((tech, i) => (
                    <span key={i} className="tag tag-gray">{tech}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function FeatureSuggestionsPage() {
  return (
    <Suspense>
      <FeatureSuggestionsInner />
    </Suspense>
  )
}
