'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { detectServicesFromCode, storeDetectedServices, loadDetectedServices } from '@/lib/detectServices'

interface UploadedFile {
  path: string
  content: string
}

interface CurrentFeature {
  name: string
  description: string
  files: string[]
}

interface SuggestedFeature {
  name: string
  description: string
  why: string
  complexity: 'low' | 'medium' | 'high'
  prompt: string
}

interface AnalysisResult {
  currentFeatures: CurrentFeature[]
  suggestedFeatures: SuggestedFeature[]
  techStack: string[]
  summary: string
  maturity: 'early' | 'solid' | 'mature'
  maturityMessage: string
}

type BuildState = 'idle' | 'building' | 'done' | 'error'

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', '.cache',
  '__pycache__', '.DS_Store', 'coverage', '.turbo', '.vercel',
])

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.css', '.scss', '.json', '.md', '.toml', '.yaml', '.yml',
  '.sql', '.prisma', '.graphql',
])

// Filenames allowed regardless of extension (checked against the basename)
const ALLOWED_FILENAMES = new Set([
  'Dockerfile', '.gitignore', '.env.example', '.env.sample',
])

function shouldInclude(path: string): boolean {
  const parts = path.split('/')
  if (parts.some(p => IGNORED_DIRS.has(p))) return false
  const basename = parts[parts.length - 1]
  // Block real env files (contain secrets) — use the Keys & Services upload for those
  if (/^\.env(\.|$)/.test(basename) && basename !== '.env.example' && basename !== '.env.sample') return false
  if (ALLOWED_FILENAMES.has(basename)) return true
  const dot = basename.lastIndexOf('.')
  if (dot === -1) return false
  return ALLOWED_EXTENSIONS.has(basename.slice(dot))
}

const complexityColor = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
}

export default function FeaturesPage() {
  const { activeProject } = useProject()
  const { github } = useIntegrations()

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [persistedFileCount, setPersistedFileCount] = useState<number | null>(null)
  const [detectedServicesCount, setDetectedServicesCount] = useState<number | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [buildStates, setBuildStates] = useState<Record<string, BuildState>>({})
  const [buildErrors, setBuildErrors] = useState<Record<string, string>>({})
  const [buildResults, setBuildResults] = useState<Record<string, string[]>>({})
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Hydrate persisted state on mount
  useEffect(() => {
    if (!activeProject?.id) return
    try {
      const raw = localStorage.getItem(`forge:uploaded-files:${activeProject.id}`)
      if (raw) {
        const meta = JSON.parse(raw) as { count: number }
        setPersistedFileCount(meta.count)
      }
    } catch {}
    try {
      const raw = localStorage.getItem(`forge:features-analysis:${activeProject.id}`)
      if (raw) setAnalysis(JSON.parse(raw) as AnalysisResult)
    } catch {}
    const detectedCount = loadDetectedServices(activeProject.id).length
    if (detectedCount > 0) setDetectedServicesCount(detectedCount)
  }, [activeProject?.id])

  const processFiles = useCallback((fileList: FileList) => {
    const promises: Promise<UploadedFile>[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      // webkitRelativePath gives us "folder/src/file.ts"
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      if (!shouldInclude(relativePath)) continue
      if (file.size > 100_000) continue // skip files > 100kb

      promises.push(
        file.text().then(content => ({ path: relativePath, content }))
      )
    }
    Promise.all(promises).then(results => {
      const loaded = results.slice(0, 60) // cap at 60 files
      setFiles(loaded)
      setAnalysis(null)
      setAnalyzeError(null)
      // Detect services from code and persist to localStorage
      if (activeProject?.id) {
        const detected = detectServicesFromCode(loaded)
        storeDetectedServices(activeProject.id, detected)
        setDetectedServicesCount(detected.size)
        // Persist file count so user sees "X files uploaded" on return
        try {
          localStorage.setItem(`forge:uploaded-files:${activeProject.id}`, JSON.stringify({ count: loaded.length }))
        } catch {}
        setPersistedFileCount(loaded.length)
      }
    })
  }, [activeProject?.id])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    // Prefer DataTransferItem API for proper folder recursion
    const items = Array.from(e.dataTransfer.items)
    const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[]

    if (entries.length === 0) {
      if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files)
      return
    }

    async function readDir(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
      const reader = dir.createReader()
      const all: FileSystemEntry[] = []
      await new Promise<void>(resolve => {
        const read = () => reader.readEntries(batch => {
          if (batch.length === 0) { resolve(); return }
          all.push(...batch)
          read()
        })
        read()
      })
      return all
    }

    async function collectFiles(entry: FileSystemEntry, prefix = ''): Promise<UploadedFile[]> {
      if (entry.isFile) {
        const fe = entry as FileSystemFileEntry
        return new Promise(resolve => {
          fe.file(file => {
            const path = prefix + file.name
            if (!shouldInclude(path) || file.size > 100_000) { resolve([]); return }
            file.text().then(content => resolve([{ path, content }]))
          })
        })
      }
      if (entry.isDirectory) {
        const de = entry as FileSystemDirectoryEntry
        const children = await readDir(de)
        const nested = await Promise.all(children.map(c => collectFiles(c, prefix + entry.name + '/')))
        return nested.flat()
      }
      return []
    }

    Promise.all(entries.map(e => collectFiles(e))).then(results => {
      const loaded = results.flat().slice(0, 60)
      if (loaded.length === 0) return
      setFiles(loaded)
      setAnalysis(null)
      setAnalyzeError(null)
      if (activeProject?.id) {
        const detected = detectServicesFromCode(loaded)
        storeDetectedServices(activeProject.id, detected)
        setDetectedServicesCount(detected.size)
        try {
          localStorage.setItem(`forge:uploaded-files:${activeProject.id}`, JSON.stringify({ count: loaded.length }))
        } catch {}
        setPersistedFileCount(loaded.length)
      }
    })
  }, [processFiles, activeProject?.id])

  const handleAnalyze = async () => {
    if (files.length === 0) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/code/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({ path: f.path, content: f.content })),
          projectName: activeProject?.name,
          projectIdea: activeProject?.idea,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analyze failed')
      setAnalysis(data)
      if (activeProject?.id) {
        try { localStorage.setItem(`forge:features-analysis:${activeProject.id}`, JSON.stringify(data)) } catch {}
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleBuild = async (feature: SuggestedFeature) => {
    const key = feature.name
    if (!activeProject?.github_repo) return

    setBuildStates(s => ({ ...s, [key]: 'building' }))
    setBuildErrors(s => { const n = { ...s }; delete n[key]; return n })

    try {
      const res = await fetch('/api/code/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureName: feature.name,
          featureDescription: feature.description,
          featureWhy: feature.why,
          featurePrompt: feature.prompt,
          repoFullName: activeProject.github_repo,
          projectFiles: files.map(f => ({ path: f.path, content: f.content })),
          techStack: analysis?.techStack ?? [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Build failed')
      setBuildStates(s => ({ ...s, [key]: 'done' }))
      setBuildResults(s => ({ ...s, [key]: data.pushed ?? [] }))
    } catch (err) {
      setBuildStates(s => ({ ...s, [key]: 'error' }))
      setBuildErrors(s => ({ ...s, [key]: err instanceof Error ? err.message : 'Build failed' }))
    }
  }

  const repoLinked = !!activeProject?.github_repo
  const githubConnected = !!github

  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)

  const handleLoadFromGithub = async () => {
    if (!activeProject?.github_repo) return
    setGithubLoading(true)
    setGithubError(null)
    try {
      const res = await fetch(`/api/github/repo-files?repo=${encodeURIComponent(activeProject.github_repo)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load from GitHub')
      const loaded: UploadedFile[] = (data.files ?? []).slice(0, 60)
      if (loaded.length === 0) {
        setGithubError('No supported source files found in the repo.')
        return
      }
      setFiles(loaded)
      setAnalysis(null)
      setAnalyzeError(null)
      if (activeProject?.id) {
        const detected = detectServicesFromCode(loaded)
        storeDetectedServices(activeProject.id, detected)
        setDetectedServicesCount(detected.size)
        try {
          localStorage.setItem(`forge:uploaded-files:${activeProject.id}`, JSON.stringify({ count: loaded.length }))
        } catch {}
        setPersistedFileCount(loaded.length)
      }
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : 'Failed to load from GitHub')
    } finally {
      setGithubLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Features</h1>
        <p className="text-sm text-ink3">
          Upload your project folder — Claude reads your code, maps existing features, and suggests what to build next.
        </p>
      </div>

      {/* Repo status / GitHub load */}
      {activeProject && repoLinked && githubConnected && files.length === 0 && persistedFileCount === null && (
        <div className="mb-6 p-3 bg-surface border border-border rounded-forge flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Repo linked: <span className="font-mono text-xs text-ink3">{activeProject.github_repo}</span></p>
            <p className="text-xs text-ink4 mt-0.5">Load files directly from your GitHub repo to analyze</p>
          </div>
          <button
            onClick={handleLoadFromGithub}
            disabled={githubLoading}
            className="shrink-0 px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
          >
            {githubLoading ? 'Loading…' : 'Load from GitHub →'}
          </button>
        </div>
      )}
      {githubError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-forge text-xs text-red-700">{githubError}</div>
      )}
      {activeProject && !repoLinked && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-forge text-sm text-amber-700">
          <strong>No repo linked.</strong> Link a GitHub repo in the Build Guide to use Build & Push or load files automatically.
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-forge p-10 text-center cursor-pointer transition-colors mb-6
          ${isDragging ? 'border-ink bg-surface2' : 'border-border hover:border-border2 hover:bg-surface2'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          // @ts-expect-error webkitdirectory is not in standard types
          webkitdirectory="true"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="text-3xl mb-3">📁</div>
        {files.length > 0 ? (
          <>
            <p className="text-sm font-medium text-ink">{files.length} files loaded</p>
            <p className="text-xs text-ink4 mt-1">Drop a folder to replace · Click to re-upload</p>
          </>
        ) : persistedFileCount !== null ? (
          <>
            <p className="text-sm font-medium text-ink">{persistedFileCount} files previously uploaded</p>
            <p className="text-xs text-ink4 mt-1">Analysis complete · Drop a folder to re-upload</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">Drop your project folder here</p>
            <p className="text-xs text-ink4 mt-1">or click to browse · reads source files only</p>
          </>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-surface2 border border-border rounded-forge mb-6 -mt-2">
        <svg className="w-3.5 h-3.5 text-ink4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2M12 7H10m9.293 9.293A10 10 0 1 1 4.707 4.707a10 10 0 0 1 14.586 14.586z" />
        </svg>
        <p className="text-[11px] text-ink4 leading-relaxed">
          <span className="font-medium text-ink3">Your code never leaves your session.</span>{' '}
          Files are read locally in your browser, sent directly to Claude for analysis, and never stored on Forge servers. Only source files are included — secrets, binaries, and dependencies are automatically excluded.
        </p>
      </div>

      {/* File list preview */}
      {files.length > 0 && (
        <details className="mb-6">
          <summary className="text-xs text-ink4 cursor-pointer hover:text-ink3 transition-colors select-none">
            {files.length} files loaded — click to preview
          </summary>
          <div className="mt-2 p-3 bg-surface2 rounded-forge max-h-40 overflow-y-auto">
            {files.map(f => (
              <div key={f.path} className="text-xs text-ink3 font-mono py-0.5">{f.path}</div>
            ))}
          </div>
        </details>
      )}

      {/* Detected services notice */}
      {detectedServicesCount !== null && detectedServicesCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-forge mb-4 -mt-2">
          <p className="text-xs text-blue-700">
            <span className="font-medium">{detectedServicesCount} {detectedServicesCount === 1 ? 'service' : 'services'} detected</span> in your code
          </p>
          <Link href="/dashboard/checks" className="text-xs text-blue-700 underline underline-offset-2 hover:opacity-70 shrink-0">
            Check your keys →
          </Link>
        </div>
      )}

      {/* Analyze button */}
      {files.length > 0 && !analysis && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 mb-6"
        >
          {analyzing ? 'Analyzing your code...' : 'Analyze project'}
        </button>
      )}

      {analyzeError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-forge text-sm text-red-700">
          {analyzeError}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-8">
          {/* Summary + maturity */}
          <div className="p-4 bg-surface2 rounded-forge">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm text-ink">{analysis.summary}</p>
              {analysis.maturity && (
                <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  analysis.maturity === 'mature' ? 'bg-green-50 text-green-700 border-green-200' :
                  analysis.maturity === 'solid'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {analysis.maturity === 'mature' ? '✓ Mature' :
                   analysis.maturity === 'solid'  ? '◎ Solid' : '○ Early'}
                </span>
              )}
            </div>
            {analysis.maturityMessage && (
              <p className="text-xs text-ink3 mt-1 mb-3">{analysis.maturityMessage}</p>
            )}
            {analysis.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {analysis.techStack.map(t => (
                  <span key={t} className="text-[11px] bg-surface border border-border px-2 py-0.5 rounded-full text-ink3">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Re-analyze */}
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="text-xs text-ink4 hover:text-ink3 transition-colors disabled:opacity-50"
            >
              {analyzing ? 'Re-analyzing...' : '↺ Re-analyze'}
            </button>
          </div>

          {/* Current features */}
          <section>
            <h2 className="text-base font-semibold text-ink mb-3">
              What&apos;s built <span className="text-ink4 font-normal">({analysis.currentFeatures.length})</span>
            </h2>
            <div className="space-y-2">
              {analysis.currentFeatures.map((f) => (
                <div key={f.name} className="p-3 border border-border rounded-forge">
                  <p className="text-sm font-medium text-ink">{f.name}</p>
                  <p className="text-xs text-ink3 mt-0.5">{f.description}</p>
                  {f.files.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {f.files.slice(0, 4).map(fp => (
                        <span key={fp} className="text-[10px] font-mono text-ink4 bg-surface2 px-1.5 py-0.5 rounded">
                          {fp.split('/').pop()}
                        </span>
                      ))}
                      {f.files.length > 4 && (
                        <span className="text-[10px] text-ink4">+{f.files.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Suggested features */}
          <section>
            <h2 className="text-base font-semibold text-ink mb-1">
              Suggestions <span className="text-ink4 font-normal">({analysis.suggestedFeatures.length})</span>
            </h2>
            {analysis.suggestedFeatures.length === 0 && (
              <div className="p-4 bg-surface2 border border-border rounded-forge text-sm text-ink3">
                No strong suggestions — this project looks well-built for its scope. Re-analyze after shipping more of the core, or describe a specific area you want to extend.
              </div>
            )}
            {analysis.suggestedFeatures.length > 0 && !repoLinked && (
              <p className="text-xs text-ink4 mb-3">Link a GitHub repo to enable Build & Push.</p>
            )}
            {analysis.suggestedFeatures.length > 0 && repoLinked && !githubConnected && (
              <p className="text-xs text-ink4 mb-3">Connect GitHub in the sidebar to enable Build & Push.</p>
            )}
            <div className="space-y-3">
              {analysis.suggestedFeatures.map((f) => {
                const state = buildStates[f.name] ?? 'idle'
                const pushed = buildResults[f.name] ?? []
                const err = buildErrors[f.name]
                return (
                  <div key={f.name} className="p-4 border border-border rounded-forge">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-ink">{f.name}</p>
                          <span className={`text-[10px] font-medium border px-1.5 py-px rounded-full ${complexityColor[f.complexity]}`}>
                            {f.complexity}
                          </span>
                        </div>
                        <p className="text-xs text-ink3">{f.description}</p>
                        <p className="text-xs text-ink4 mt-1">{f.why}</p>
                      </div>

                      {/* Build & Push button */}
                      {repoLinked && githubConnected && (
                        <div className="shrink-0">
                          {state === 'idle' && (
                            <button
                              onClick={() => handleBuild(f)}
                              className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors whitespace-nowrap"
                            >
                              Build & Push
                            </button>
                          )}
                          {state === 'building' && (
                            <span className="text-xs text-ink4 animate-pulse">Building...</span>
                          )}
                          {state === 'done' && (
                            <a
                              href={`https://github.com/${activeProject!.github_repo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-600 hover:underline"
                            >
                              ✓ Pushed
                            </a>
                          )}
                          {state === 'error' && (
                            <button
                              onClick={() => handleBuild(f)}
                              className="text-xs text-red-600 hover:underline"
                              title={err}
                            >
                              Failed · Retry
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pushed files */}
                    {state === 'done' && pushed.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pushed.map(fp => (
                          <a
                            key={fp}
                            href={`https://github.com/${activeProject!.github_repo}/blob/main/${fp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-ink4 bg-surface2 px-1.5 py-0.5 rounded hover:text-ink3 transition-colors"
                          >
                            {fp}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Error detail */}
                    {state === 'error' && err && (
                      <p className="mt-2 text-xs text-red-600">{err}</p>
                    )}

                    {/* Claude Code prompt */}
                    <details className="mt-2">
                      <summary className="text-[11px] text-ink4 cursor-pointer hover:text-ink3 transition-colors select-none">
                        Claude Code prompt
                      </summary>
                      <pre className="mt-2 p-2 bg-surface2 rounded text-[11px] text-ink3 whitespace-pre-wrap font-mono overflow-x-auto">
                        {f.prompt}
                      </pre>
                    </details>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
