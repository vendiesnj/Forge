'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'

// ─── Forge theme picker (unchanged) ──────────────────────────────────────────

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
    <div>
      <p className="text-xs font-medium text-ink2 mb-3">Forge dashboard theme</p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTheme(t.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-forge border text-left transition-all',
              activeTheme === t.id ? 'border-ink bg-surface2' : 'border-border hover:border-border2'
            )}
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

// ─── Project UI editor ────────────────────────────────────────────────────────

function ProjectUIEditor() {
  const { activeProject } = useProject()
  const [files, setFiles] = useState<string[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [prLoading, setPrLoading] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [prError, setPrError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const repo = activeProject?.github_repo
  const appUrl = activeProject?.app_url

  // Load file tree when repo is linked
  useEffect(() => {
    if (!repo) return
    setFilesLoading(true)
    fetch(`/api/github/tree?repo=${encodeURIComponent(repo)}`)
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []))
      .finally(() => setFilesLoading(false))
  }, [repo])

  // Load file content when file is selected
  useEffect(() => {
    if (!selectedFile || !repo) return
    setFileContent(null)
    setFileLoading(true)
    setPrompt(null)
    setPrUrl(null)
    fetch(`/api/github/file?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(selectedFile)}`)
      .then(r => r.json())
      .then(d => setFileContent(d.content ?? null))
      .finally(() => setFileLoading(false))
  }, [selectedFile, repo])

  const generatePrompt = () => {
    if (!description.trim()) return
    const filePart = selectedFile && fileContent
      ? `\n\nFile to modify: \`${selectedFile}\`\n\nCurrent file content:\n\`\`\`\n${fileContent.slice(0, 3000)}${fileContent.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\``
      : ''
    const p = `I want to make a UI change to my project.${filePart}

Requested change: ${description}

Please:
1. Make only the UI/visual changes described above
2. Keep all existing logic and functionality intact
3. Use the existing styling patterns, CSS variables, and design conventions already in the codebase
4. Return the complete modified file

${selectedFile ? `Apply the change to: ${selectedFile}` : 'Identify the relevant file(s) and apply the change.'}`
    setPrompt(p)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCreatePR = async () => {
    if (!repo || !selectedFile || !fileContent || !description.trim()) return
    setPrLoading(true)
    setPrError('')
    setPrUrl(null)
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          path: selectedFile,
          fileContent,
          description,
          projectName: activeProject?.name,
        }),
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

  const filteredFiles = files.filter(f => f.toLowerCase().includes(search.toLowerCase()))

  if (!repo && !appUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">🎨</div>
        <p className="text-sm font-medium text-ink mb-1">No project connected</p>
        <p className="text-xs text-ink4 mb-4 max-w-xs">
          Link a GitHub repo or add your app URL to use the project UI editor.
        </p>
        <div className="flex gap-2">
          <a href="/dashboard/checks" className="px-3 py-1.5 bg-ink text-white text-xs rounded-forge hover:bg-ink2 transition-colors">
            Connect GitHub →
          </a>
          <a href="/dashboard/overview" className="px-3 py-1.5 border border-border text-xs text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors">
            Add app URL →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-5 min-h-0">
      {/* Left: preview */}
      <div className="col-span-3 space-y-3">
        <p className="text-xs font-medium text-ink2">Live preview</p>
        {appUrl ? (
          <div className="border border-border rounded-forge overflow-hidden bg-surface2" style={{ height: 480 }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] text-ink4 truncate flex-1">{appUrl}</span>
              <a href={appUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ink4 hover:text-ink3">↗</a>
            </div>
            <iframe
              ref={iframeRef}
              src={appUrl}
              className="w-full"
              style={{ height: 'calc(100% - 33px)', border: 'none' }}
              title="App preview"
            />
          </div>
        ) : (
          <div className="border border-border rounded-forge bg-surface2 flex flex-col items-center justify-center text-center p-8" style={{ height: 480 }}>
            <p className="text-xs text-ink4 mb-3">No live URL — add your app URL in Overview to see a preview here.</p>
            <a href="/dashboard/overview" className="text-xs text-ink3 underline hover:text-ink">Add app URL →</a>
          </div>
        )}
      </div>

      {/* Right: editor */}
      <div className="col-span-2 space-y-4">
        <p className="text-xs font-medium text-ink2">Make a UI change</p>

        {/* File picker */}
        {repo && (
          <div>
            <p className="text-[10px] text-ink4 mb-1.5 font-medium uppercase tracking-wide">Component file</p>
            {filesLoading ? (
              <p className="text-xs text-ink4">Loading files…</p>
            ) : (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search components…"
                  className="w-full text-xs bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 mb-1.5"
                />
                <div className="max-h-36 overflow-y-auto scrollbar-thin border border-border rounded-forge bg-surface2">
                  {filteredFiles.length === 0 ? (
                    <p className="text-xs text-ink4 p-3 text-center">No files found</p>
                  ) : filteredFiles.map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedFile(f)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs truncate transition-colors',
                        selectedFile === f ? 'bg-ink text-white' : 'text-ink3 hover:bg-surface hover:text-ink'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {selectedFile && (
                  <p className="text-[10px] text-ink4 mt-1 truncate">
                    {fileLoading ? 'Loading…' : `✓ ${selectedFile}`}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-[10px] text-ink4 mb-1.5 font-medium uppercase tracking-wide">Describe the change</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder={selectedFile
              ? `e.g. Make the header sticky, change the button color to blue, add a loading skeleton…`
              : `e.g. Add a dark mode toggle to the navbar, make the card grid 3 columns on desktop…`}
            className="w-full text-xs bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={generatePrompt}
            disabled={!description.trim()}
            className="flex-1 py-2 bg-surface2 border border-border text-xs font-medium text-ink rounded-forge hover:border-border2 transition-colors disabled:opacity-40"
          >
            Generate prompt
          </button>
          {repo && selectedFile && fileContent && (
            <button
              onClick={handleCreatePR}
              disabled={!description.trim() || prLoading}
              className="flex-1 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {prLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                  Creating PR…
                </>
              ) : 'Create GitHub PR'}
            </button>
          )}
        </div>

        {prError && <p className="text-xs text-red">{prError}</p>}

        {prUrl && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-forge">
            <p className="text-xs font-medium text-green-800 mb-1">PR created!</p>
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline break-all">
              {prUrl}
            </a>
          </div>
        )}

        {/* Generated prompt */}
        {prompt && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-ink4 font-medium uppercase tracking-wide">Claude Code prompt</p>
              <button
                onClick={() => handleCopy(prompt)}
                className="text-[10px] px-2 py-0.5 border border-border rounded text-ink4 hover:text-ink hover:border-border2 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-ink rounded-forge p-3 max-h-56 overflow-y-auto scrollbar-thin">
              <pre className="text-[10px] text-white/80 font-mono whitespace-pre-wrap leading-relaxed">{prompt}</pre>
            </div>
            <p className="text-[10px] text-ink4 mt-1.5">Paste this into Claude Code in your project directory.</p>
          </div>
        )}
      </div>
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
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {([['project', 'Project UI'], ['theme', 'Forge Theme']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
                tab === id ? 'border-ink text-ink' : 'border-transparent text-ink4 hover:text-ink3'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'project' ? <ProjectUIEditor /> : <ThemePicker />}
      </div>
    </>
  )
}

export default function UICustomizePage() {
  return (
    <Suspense>
      <UICustomizeInner />
    </Suspense>
  )
}
