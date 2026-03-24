import { useState, useEffect, useCallback, useRef } from 'react'
import { useProject } from '@/components/project-context'
import type { AnalysisType } from '@/types'

interface UseProjectAnalysisResult<T> {
  result: T | null
  loading: boolean     // loading from DB on mount
  pending: boolean     // background generation in progress
  generating: boolean  // user-triggered regenerate in progress
  error: string
  regenerate: (input: Record<string, string>, projectIdOverride?: string) => Promise<void>
  cancel: () => void
}

export function useProjectAnalysis<T>(type: AnalysisType): UseProjectAnalysisResult<T> {
  const { activeProject, markStepComplete, analysisCache, pendingAnalyses, setCachedAnalysis, addPendingAnalysis, removePendingAnalysis } = useProject()
  const [dbResult, setDbResult] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const lastProjectId = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cacheKey = activeProject ? (`${activeProject.id}:${type}` as const) : null
  const cachedResult = cacheKey ? (analysisCache[cacheKey] as T | undefined) ?? null : null
  const pending = cacheKey ? pendingAnalyses.has(cacheKey) : false

  const result = cachedResult ?? dbResult

  // Load from DB when project changes (and not already in cache)
  useEffect(() => {
    if (!activeProject) {
      setDbResult(null)
      lastProjectId.current = null
      return
    }
    if (activeProject.id === lastProjectId.current) return
    lastProjectId.current = activeProject.id

    // Already in memory cache — no need to hit DB
    if (cachedResult) return

    setDbResult(null)
    setLoading(true)
    setError('')

    fetch(`/api/analyses/latest?projectId=${activeProject.id}&type=${type}`)
      .then(r => r.json())
      .then(d => {
        if (d.result) {
          setDbResult(d.result as T)
          setCachedAnalysis(activeProject.id, type, d.result)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, type])

  const stepMap: Partial<Record<AnalysisType, string>> = {
    idea: 'idea_analyzed',
    market: 'market_researched',
    distribution: 'distribution_planned',
    gaps: 'gaps_analyzed',
    buildguide: 'build_guide_generated',
  }

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setGenerating(false)
  }, [])

  const regenerate = useCallback(async (input: Record<string, string>, projectIdOverride?: string) => {
    setError('')
    setGenerating(true)

    const controller = new AbortController()
    abortRef.current = controller
    const pid = projectIdOverride ?? activeProject?.id

    if (pid) addPendingAnalysis(pid, type)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input, ...(pid ? { projectId: pid } : {}) }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      if (pid) {
        setCachedAnalysis(pid, type, data.result)  // also removes from pendingAnalyses
        const step = stepMap[type]
        if (step) markStepComplete(step)
      } else {
        // No project — store result locally so it still shows on the page
        setDbResult(data.result as T)
      }
    } catch (err) {
      if (pid) removePendingAnalysis(pid, type)
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      abortRef.current = null
      setGenerating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, type])

  return { result, loading, pending, generating, error, regenerate, cancel }
}
