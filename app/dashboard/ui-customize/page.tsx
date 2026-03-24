'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnotationMode = 'click' | 'drag'

interface Annotation {
  id: string
  mode: AnnotationMode
  // click: single point
  x?: number
  y?: number
  // drag: from → to
  x1?: number; y1?: number
  x2?: number; y2?: number
  note: string
  editing: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function regionLabel(x: number, y: number): string {
  const col = x < 33 ? 'left' : x < 66 ? 'center' : 'right'
  const row = y < 25 ? 'top' : y < 60 ? 'middle' : 'bottom'
  if (row === 'top' && col === 'center') return 'header/navbar'
  if (row === 'bottom' && col === 'center') return 'footer'
  if (col === 'left' && row === 'middle') return 'sidebar/left panel'
  return `${row}-${col}`
}

function buildPrompt(annotations: Annotation[], file: string | null): string {
  const lines: string[] = []
  if (file) lines.push(`File to modify: \`${file}\`\n`)
  lines.push('Please make the following UI changes:\n')

  annotations.filter(a => a.note.trim()).forEach((a, i) => {
    if (a.mode === 'click' && a.x !== undefined && a.y !== undefined) {
      const region = regionLabel(a.x, a.y)
      lines.push(`${i + 1}. In the **${region}** area: ${a.note}`)
    } else if (a.mode === 'drag' && a.x1 !== undefined) {
      const from = regionLabel(a.x1, a.y1!)
      const to = regionLabel(a.x2!, a.y2!)
      lines.push(`${i + 1}. Move the element in the **${from}** area to the **${to}** area${a.note ? `: ${a.note}` : ''}`)
    }
  })

  lines.push('\nRules:')
  lines.push('- Keep all existing logic and functionality intact')
  lines.push('- Use existing CSS variables, class names, and styling patterns')
  lines.push('- Only make the visual/layout changes described above')
  lines.push('- Return the complete modified file')
  return lines.join('\n')
}

// ─── Annotation pin ──────────────────────────────────────────────────────────

function AnnotationPin({ ann, index, onUpdate, onRemove }: {
  ann: Annotation
  index: number
  onUpdate: (id: string, note: string) => void
  onRemove: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ann.editing) inputRef.current?.focus()
  }, [ann.editing])

  if (ann.mode === 'drag' && ann.x1 !== undefined) {
    // Render an arrow between two points
    const mx = (ann.x1 + ann.x2!) / 2
    const my = (ann.y1! + ann.y2!) / 2
    return (
      <>
        {/* Arrow line via SVG absolute overlay handled in parent */}
        <div
          className="absolute z-20 flex items-center gap-1"
          style={{ left: `${mx}%`, top: `${my}%`, transform: 'translate(-50%, -50%)' }}
        >
          {ann.editing ? (
            <input
              ref={inputRef}
              value={ann.note}
              onChange={e => onUpdate(ann.id, e.target.value)}
              onBlur={() => onUpdate(ann.id, ann.note)}
              onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
              placeholder="Why move it? (optional)"
              className="text-[10px] bg-white border border-border rounded px-2 py-1 shadow-md w-40 focus:outline-none"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onRemove(ann.id) }}
              className="flex items-center gap-1 bg-ink text-white text-[10px] px-2 py-0.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
            >
              <span>↕ Move {index + 1}</span>
              <span className="opacity-60">×</span>
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div
      className="absolute z-20"
      style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -100%)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col items-center">
        {ann.editing ? (
          <input
            ref={inputRef}
            value={ann.note}
            onChange={e => onUpdate(ann.id, e.target.value)}
            onBlur={() => onUpdate(ann.id, ann.note)}
            onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
            placeholder="What to change here?"
            className="text-[10px] bg-white border border-border rounded px-2 py-1 shadow-md w-44 focus:outline-none mb-1"
          />
        ) : (
          ann.note && (
            <div className="bg-white border border-border rounded px-2 py-0.5 shadow text-[10px] text-ink mb-1 max-w-[140px] truncate">
              {ann.note}
            </div>
          )
        )}
        <button
          onClick={() => onRemove(ann.id)}
          className="w-5 h-5 rounded-full bg-ink text-white text-[10px] font-bold shadow-md flex items-center justify-center hover:bg-red-600 transition-colors leading-none"
        >
          {index + 1}
        </button>
        <div className="w-px h-2 bg-ink" />
      </div>
    </div>
  )
}

// ─── Interactive overlay ──────────────────────────────────────────────────────

function InteractivePreview({ appUrl, annotations, onAdd, onUpdate, onRemove }: {
  appUrl: string
  annotations: Annotation[]
  onAdd: (ann: Annotation) => void
  onUpdate: (id: string, note: string) => void
  onRemove: (id: string) => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)

  const pct = useCallback((clientX: number, clientY: number) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 100),
      y: Math.round(((clientY - rect.top) / rect.height) * 100),
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return
    dragStart.current = pct(e.clientX, e.clientY)
    isDragging.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return
    const cur = pct(e.clientX, e.clientY)
    const dist = Math.hypot(cur.x - dragStart.current.x, cur.y - dragStart.current.y)
    if (dist > 3) isDragging.current = true
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStart.current) return
    const end = pct(e.clientX, e.clientY)
    const start = dragStart.current
    dragStart.current = null

    if (isDragging.current) {
      // Drag = move gesture
      onAdd({
        id: crypto.randomUUID(),
        mode: 'drag',
        x1: start.x, y1: start.y,
        x2: end.x, y2: end.y,
        note: '',
        editing: true,
      })
    } else {
      // Click = annotation
      onAdd({
        id: crypto.randomUUID(),
        mode: 'click',
        x: start.x,
        y: start.y,
        note: '',
        editing: true,
      })
    }
    isDragging.current = false
  }

  // SVG arrows for drag annotations
  const drags = annotations.filter(a => a.mode === 'drag' && a.x1 !== undefined)

  return (
    <div className="border border-border rounded-forge overflow-hidden bg-surface2 select-none" style={{ height: 500 }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface shrink-0">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-ink4 truncate flex-1">{appUrl}</span>
        <a href={appUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ink4 hover:text-ink3 shrink-0">↗</a>
      </div>

      {/* Iframe + overlay */}
      <div className="relative" style={{ height: 'calc(100% - 33px)' }}>
        <iframe
          src={appUrl}
          className="w-full h-full"
          style={{ border: 'none', pointerEvents: 'none' }}
          title="App preview"
        />

        {/* SVG layer for drag arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
          {drags.map(a => (
            <g key={a.id}>
              <defs>
                <marker id={`arrow-${a.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#1a1915" />
                </marker>
              </defs>
              <line
                x1={`${a.x1}%`} y1={`${a.y1}%`}
                x2={`${a.x2}%`} y2={`${a.y2}%`}
                stroke="#1a1915" strokeWidth="2" strokeDasharray="5,3"
                markerEnd={`url(#arrow-${a.id})`}
              />
              <circle cx={`${a.x1}%`} cy={`${a.y1}%`} r="4" fill="#1a1915" />
            </g>
          ))}
        </svg>

        {/* Click/drag overlay */}
        <div
          ref={overlayRef}
          className="absolute inset-0 z-10"
          style={{ cursor: 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* Annotation pins */}
        {annotations.map((ann, i) => (
          <AnnotationPin
            key={ann.id}
            ann={ann}
            index={i}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}

        {/* Hint */}
        {annotations.length === 0 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-20">
            <div className="bg-ink/80 text-white text-[10px] px-3 py-1.5 rounded-full">
              Click to annotate · Drag to mark a move
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Project UI tab ───────────────────────────────────────────────────────────

function ProjectUIEditor() {
  const { activeProject } = useProject()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [files, setFiles] = useState<string[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileSearch, setFileSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [prLoading, setPrLoading] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [prError, setPrError] = useState('')

  const repo = activeProject?.github_repo
  const appUrl = activeProject?.app_url

  useEffect(() => {
    if (!repo) return
    setFilesLoading(true)
    fetch(`/api/github/tree?repo=${encodeURIComponent(repo)}`)
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []))
      .finally(() => setFilesLoading(false))
  }, [repo])

  useEffect(() => {
    if (!selectedFile || !repo) return
    setFileContent(null)
    fetch(`/api/github/file?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(selectedFile)}`)
      .then(r => r.json())
      .then(d => setFileContent(d.content ?? null))
  }, [selectedFile, repo])

  const addAnnotation = useCallback((ann: Annotation) => {
    setAnnotations(prev => [...prev, ann])
    setPrompt(null)
  }, [])

  const updateAnnotation = useCallback((id: string, note: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note, editing: false } : a))
    setPrompt(null)
  }, [])

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setPrompt(null)
  }, [])

  const handleGeneratePrompt = () => {
    const filled = annotations.filter(a => a.note.trim() || a.mode === 'drag')
    if (!filled.length) return
    setPrompt(buildPrompt(filled, selectedFile))
  }

  const handleCreatePR = async () => {
    if (!repo || !selectedFile || !fileContent || !prompt) return
    setPrLoading(true)
    setPrError('')
    setPrUrl(null)
    const description = annotations.filter(a => a.note.trim() || a.mode === 'drag')
      .map((a, i) => `${i + 1}. ${a.note || 'Move element'}`)
      .join('\n')
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, path: selectedFile, fileContent, description, projectName: activeProject?.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPrUrl(data.prUrl)
    } catch (err) {
      setPrError(err instanceof Error ? err.message : 'Failed to create PR')
    } finally {
      setPrLoading(false)
    }
  }

  if (!appUrl && !repo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">🎨</div>
        <p className="text-sm font-medium text-ink mb-1">Connect your project first</p>
        <p className="text-xs text-ink4 mb-4 max-w-xs">Add your live app URL to annotate it, or link a GitHub repo to create PRs.</p>
        <div className="flex gap-2">
          <a href="/dashboard/overview" className="px-3 py-1.5 bg-ink text-white text-xs rounded-forge hover:bg-ink2 transition-colors">Add app URL →</a>
          <a href="/dashboard/checks" className="px-3 py-1.5 border border-border text-xs text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors">Connect GitHub →</a>
        </div>
      </div>
    )
  }

  const hasAnnotations = annotations.some(a => a.note.trim() || a.mode === 'drag')
  const filteredFiles = files.filter(f => f.toLowerCase().includes(fileSearch.toLowerCase()))

  return (
    <div className="grid grid-cols-5 gap-5">
      {/* Left: interactive preview */}
      <div className="col-span-3">
        {appUrl ? (
          <InteractivePreview
            appUrl={appUrl}
            annotations={annotations}
            onAdd={addAnnotation}
            onUpdate={updateAnnotation}
            onRemove={removeAnnotation}
          />
        ) : (
          <div className="border border-border rounded-forge bg-surface2 flex flex-col items-center justify-center text-center p-8" style={{ height: 500 }}>
            <p className="text-xs text-ink4 mb-2">No live URL — add your app URL in Overview to enable visual editing.</p>
            <a href="/dashboard/overview" className="text-xs text-ink3 underline hover:text-ink">Add app URL →</a>
          </div>
        )}

        {/* Annotation list */}
        {annotations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {annotations.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-forge text-xs">
                <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <span className="text-ink4 shrink-0">{a.mode === 'drag' ? '↕ move' : '📌 change'}</span>
                <span className="flex-1 text-ink truncate">{a.note || <span className="text-ink4 italic">no description yet</span>}</span>
                <button onClick={() => removeAnnotation(a.id)} className="text-ink4 hover:text-red-500 transition-colors shrink-0">×</button>
              </div>
            ))}
            <button onClick={() => { setAnnotations([]); setPrompt(null) }} className="text-[10px] text-ink4 hover:text-ink3 transition-colors">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div className="col-span-2 space-y-4">
        <div className="bg-surface border border-border rounded-forge p-4 space-y-1.5">
          <p className="text-xs font-semibold text-ink">How to use</p>
          <p className="text-[11px] text-ink3">🖱 <b>Click</b> anywhere on your app to pin a change</p>
          <p className="text-[11px] text-ink3">✋ <b>Drag</b> to mark "move this element here"</p>
          <p className="text-[11px] text-ink3">📋 Generate a Claude Code prompt or create a GitHub PR</p>
        </div>

        {/* File picker for PR */}
        {repo && (
          <div>
            <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wider mb-1.5">Target file (for PR)</p>
            <input
              value={fileSearch}
              onChange={e => setFileSearch(e.target.value)}
              placeholder="Search components…"
              className="w-full text-xs bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 mb-1.5"
            />
            {filesLoading ? (
              <p className="text-xs text-ink4">Loading…</p>
            ) : (
              <div className="max-h-32 overflow-y-auto scrollbar-thin border border-border rounded-forge bg-surface2">
                {filteredFiles.map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFile(f)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-[11px] truncate transition-colors',
                      selectedFile === f ? 'bg-ink text-white' : 'text-ink3 hover:bg-surface hover:text-ink'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
            {selectedFile && <p className="text-[10px] text-ink4 mt-1 truncate">Selected: {selectedFile}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleGeneratePrompt}
            disabled={!hasAnnotations}
            className="w-full py-2 border border-border bg-surface2 text-xs font-medium text-ink rounded-forge hover:border-border2 transition-colors disabled:opacity-40"
          >
            Generate Claude Code prompt
          </button>

          {repo && selectedFile && fileContent && (
            <button
              onClick={handleCreatePR}
              disabled={!hasAnnotations || prLoading}
              className="w-full py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {prLoading ? (
                <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" /></svg> Creating PR…</>
              ) : 'Create GitHub PR →'}
            </button>
          )}
        </div>

        {prError && <p className="text-xs text-red">{prError}</p>}
        {prUrl && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-forge">
            <p className="text-xs font-medium text-green-800 mb-1">PR created!</p>
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline break-all">{prUrl}</a>
          </div>
        )}

        {/* Generated prompt */}
        {prompt && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Claude Code prompt</p>
              <button
                onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                className="text-[10px] px-2 py-0.5 border border-border rounded text-ink4 hover:text-ink hover:border-border2 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-ink rounded-forge p-3 max-h-64 overflow-y-auto scrollbar-thin">
              <pre className="text-[10px] text-white/80 font-mono whitespace-pre-wrap leading-relaxed">{prompt}</pre>
            </div>
            <p className="text-[10px] text-ink4 mt-1.5">Paste into Claude Code in your project directory.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Forge theme picker ───────────────────────────────────────────────────────

const THEMES = [
  { id: 'default', name: 'Parchment', vars: { '--bg': '#eeebe0', '--surface': '#fff', '--surface2': '#f9f7f2', '--border': '#d0cdc4', '--border2': '#b8b4aa', '--ink': '#1a1915', '--ink2': '#3d3b35', '--ink3': '#6b6860', '--ink4': '#9c9a94', '--amber': '#e5820a', '--amber-bg': '#fff8ee', '--amber-border': '#f0b04a' } },
  { id: 'slate',   name: 'Slate',    vars: { '--bg': '#f1f5f9', '--surface': '#ffffff', '--surface2': '#f8fafc', '--border': '#e2e8f0', '--border2': '#cbd5e1', '--ink': '#0f172a', '--ink2': '#1e293b', '--ink3': '#475569', '--ink4': '#94a3b8', '--amber': '#3b82f6', '--amber-bg': '#eff6ff', '--amber-border': '#93c5fd' } },
  { id: 'dark',    name: 'Dark',     vars: { '--bg': '#111111', '--surface': '#1c1c1c', '--surface2': '#262626', '--border': '#333333', '--border2': '#444444', '--ink': '#f5f5f5', '--ink2': '#d4d4d4', '--ink3': '#a3a3a3', '--ink4': '#737373', '--amber': '#f59e0b', '--amber-bg': '#292300', '--amber-border': '#78520a' } },
  { id: 'ivory',   name: 'Ivory',    vars: { '--bg': '#faf8f4', '--surface': '#ffffff', '--surface2': '#f5f2ec', '--border': '#e5e0d5', '--border2': '#d0c8b8', '--ink': '#2c2c2c', '--ink2': '#4a4a4a', '--ink3': '#7a7a7a', '--ink4': '#b0b0b0', '--amber': '#7c5c3e', '--amber-bg': '#fdf5ec', '--amber-border': '#d4a574' } },
  { id: 'forest',  name: 'Forest',   vars: { '--bg': '#eef2ee', '--surface': '#ffffff', '--surface2': '#f2f6f2', '--border': '#c8d8c0', '--border2': '#a8c8a0', '--ink': '#1a2e1a', '--ink2': '#2d4a2d', '--ink3': '#5a7a5a', '--ink4': '#8aaa8a', '--amber': '#2d7a45', '--amber-bg': '#f0faf4', '--amber-border': '#86c99a' } },
  { id: 'violet',  name: 'Violet',   vars: { '--bg': '#f4f0ff', '--surface': '#ffffff', '--surface2': '#f9f7ff', '--border': '#ddd6fe', '--border2': '#c4b5fd', '--ink': '#1e1b4b', '--ink2': '#312e81', '--ink3': '#6d5cf5', '--ink4': '#a5b4fc', '--amber': '#7c3aed', '--amber-bg': '#faf5ff', '--amber-border': '#c4b5fd' } },
]

function ThemePicker() {
  const [activeTheme, setActiveTheme] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('forge:theme') ?? 'default' : 'default'
  )
  useEffect(() => {
    const theme = THEMES.find(t => t.id === activeTheme) ?? THEMES[0]
    Object.entries(theme.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
    localStorage.setItem('forge:theme', activeTheme)
  }, [activeTheme])

  return (
    <div className="max-w-sm">
      <p className="text-xs font-medium text-ink2 mb-3">Forge dashboard color theme</p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(t => (
          <button key={t.id} onClick={() => setActiveTheme(t.id)}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-forge border text-left transition-all',
              activeTheme === t.id ? 'border-ink bg-surface2' : 'border-border hover:border-border2')}
          >
            <div className="flex gap-0.5 shrink-0">
              {(['--bg', '--ink', '--amber'] as const).map(k => (
                <div key={k} className="w-3 h-3 rounded-full border border-border" style={{ background: t.vars[k] }} />
              ))}
            </div>
            <span className="text-xs font-medium text-ink truncate">{t.name}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-ink4 mt-2">Applies to your Forge dashboard only.</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function UICustomizeInner() {
  const [tab, setTab] = useState<'project' | 'theme'>('project')
  return (
    <>
      <Topbar title="UI Customize" />
      <div className="p-5 max-w-6xl mx-auto">
        <div className="flex gap-1 mb-6 border-b border-border">
          {([['project', 'Project UI'], ['theme', 'Forge Theme']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
                tab === id ? 'border-ink text-ink' : 'border-transparent text-ink4 hover:text-ink3')}
            >{label}</button>
          ))}
        </div>
        {tab === 'project' ? <ProjectUIEditor /> : <ThemePicker />}
      </div>
    </>
  )
}

export default function UICustomizePage() {
  return <Suspense><UICustomizeInner /></Suspense>
}
