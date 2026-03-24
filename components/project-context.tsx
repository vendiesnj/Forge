'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { Project, AnalysisType } from '@/types'

type AnalysisCacheKey = `${string}:${AnalysisType}`

interface ProjectContextValue {
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (p: Project | null) => void
  refreshProjects: () => void
  markStepComplete: (step: string) => void
  // Analysis cache shared across pages
  analysisCache: Record<AnalysisCacheKey, unknown>
  pendingAnalyses: Set<AnalysisCacheKey>
  triggeredTypes: Record<string, AnalysisType[]>
  setCachedAnalysis: (projectId: string, type: AnalysisType, result: unknown) => void
  addPendingAnalysis: (projectId: string, type: AnalysisType) => void
  removePendingAnalysis: (projectId: string, type: AnalysisType) => void
  triggerBackgroundAnalyses: (project: Project, skillLevel: string, only?: AnalysisType[]) => void
  clearProjectCache: (projectId: string) => void
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  activeProject: null,
  setActiveProject: () => {},
  refreshProjects: () => {},
  markStepComplete: () => {},
  analysisCache: {} as Record<AnalysisCacheKey, unknown>,
  pendingAnalyses: new Set(),
  triggeredTypes: {},
  setCachedAnalysis: () => {},
  addPendingAnalysis: () => {},
  removePendingAnalysis: () => {},
  triggerBackgroundAnalyses: () => {},
  clearProjectCache: () => {},
})

const ACTIVE_PROJECT_KEY = 'forge:activeProjectId'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, _setActiveProject] = useState<Project | null>(null)

  const setActiveProject = useCallback((p: Project | null) => {
    _setActiveProject(p)
    if (p) localStorage.setItem(ACTIVE_PROJECT_KEY, p.id)
    else localStorage.removeItem(ACTIVE_PROJECT_KEY)
  }, [])
  const [analysisCache, setAnalysisCacheState] = useState<Record<AnalysisCacheKey, unknown>>({} as Record<AnalysisCacheKey, unknown>)
  const [pendingAnalyses, setPendingAnalyses] = useState<Set<AnalysisCacheKey>>(new Set())
  const [triggeredTypes, setTriggeredTypes] = useState<Record<string, AnalysisType[]>>({})
  // Track in-flight requests to avoid duplicate background calls
  const inFlight = useRef<Set<AnalysisCacheKey>>(new Set())

  const refreshProjects = useCallback(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        const list: Project[] = d.projects ?? []
        setProjects(list)
        _setActiveProject((prev) => {
          if (prev) {
            // Keep active project in sync with latest data from server
            return list.find(p => p.id === prev.id) ?? prev
          }
          // Restore from localStorage on first load
          const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_KEY) : null
          if (savedId) return list.find(p => p.id === savedId) ?? list[0] ?? null
          return list[0] ?? null
        })
        // Hydrate cache from localStorage for all known projects
        const types: AnalysisType[] = ['idea', 'market', 'distribution', 'gaps', 'patent', 'acquire', 'buildguide']
        const hydrated: Record<string, unknown> = {}
        for (const p of list) {
          for (const t of types) {
            const raw = localStorage.getItem(`forge:analysis:${p.id}:${t}`)
            if (raw) {
              try { hydrated[`${p.id}:${t}`] = JSON.parse(raw) } catch {}
            }
          }
        }
        setAnalysisCacheState(prev => ({ ...hydrated, ...prev })) // prev wins (in-memory is fresher)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const markStepComplete = useCallback((step: string) => {
    if (!activeProject) return
    fetch(`/api/projects/${activeProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.project) {
          setActiveProject(d.project)
          refreshProjects()
        }
      })
      .catch(() => {})
  }, [activeProject, refreshProjects])

  const setCachedAnalysis = useCallback((projectId: string, type: AnalysisType, result: unknown) => {
    const key: AnalysisCacheKey = `${projectId}:${type}`
    setAnalysisCacheState((prev) => ({ ...prev, [key]: result }))
    setPendingAnalyses((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    inFlight.current.delete(key)
    // Persist to localStorage
    try {
      localStorage.setItem(`forge:analysis:${key}`, JSON.stringify(result))
    } catch {}
  }, [])

  const addPendingAnalysis = useCallback((projectId: string, type: AnalysisType) => {
    const key: AnalysisCacheKey = `${projectId}:${type}`
    setPendingAnalyses(prev => new Set([...prev, key]))
    inFlight.current.add(key)
  }, [])

  const removePendingAnalysis = useCallback((projectId: string, type: AnalysisType) => {
    const key: AnalysisCacheKey = `${projectId}:${type}`
    setPendingAnalyses(prev => { const n = new Set(prev); n.delete(key); return n })
    inFlight.current.delete(key)
  }, [])

  const clearProjectCache = useCallback((projectId: string) => {
    const types: AnalysisType[] = ['idea', 'market', 'distribution', 'gaps', 'patent', 'acquire', 'buildguide']
    for (const t of types) {
      try { localStorage.removeItem(`forge:analysis:${projectId}:${t}`) } catch {}
    }
  }, [])

  const triggerBackgroundAnalyses = useCallback((project: Project, skillLevel: string, only?: AnalysisType[]) => {
    const allTypes: Array<{ type: AnalysisType; input: Record<string, string> }> = [
      { type: 'market',       input: { query: project.idea } },
      { type: 'distribution', input: { desc: project.idea } },
      { type: 'gaps',         input: { sector: project.idea } },
      { type: 'buildguide',   input: { idea: project.idea, track: project.track, skillLevel } },
    ]
    const types = only ? allTypes.filter(t => only.includes(t.type)) : allTypes
    setTriggeredTypes(prev => ({ ...prev, [project.id]: types.map(t => t.type) }))

    const stepMap: Partial<Record<AnalysisType, string>> = {
      market: 'market_researched',
      distribution: 'distribution_planned',
      buildguide: 'build_guide_generated',
    }

    types.forEach(({ type, input }) => {
      const key: AnalysisCacheKey = `${project.id}:${type}`
      if (inFlight.current.has(key)) return
      inFlight.current.add(key)

      setPendingAnalyses((prev) => new Set([...prev, key]))

      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input, projectId: project.id }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.result) {
            setCachedAnalysis(project.id, type, d.result)
            const step = stepMap[type]
            if (step) {
              fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step }),
              })
                .then((r) => r.json())
                .then((upd) => {
                  if (upd.project) {
                    _setActiveProject((cur) => cur?.id === project.id ? upd.project : cur)
                    refreshProjects()
                  }
                })
                .catch(() => {})
            }
          } else {
            // Failed — remove from pending so page can show regenerate option
            setPendingAnalyses((prev) => { const n = new Set(prev); n.delete(key); return n })
            inFlight.current.delete(key)
          }
        })
        .catch(() => {
          setPendingAnalyses((prev) => { const n = new Set(prev); n.delete(key); return n })
          inFlight.current.delete(key)
        })
    })
  }, [setCachedAnalysis, refreshProjects])

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      setActiveProject,
      refreshProjects,
      markStepComplete,
      analysisCache,
      pendingAnalyses,
      triggeredTypes,
      setCachedAnalysis,
      addPendingAnalysis,
      removePendingAnalysis,
      triggerBackgroundAnalyses,
      clearProjectCache,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
