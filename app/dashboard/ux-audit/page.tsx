'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { UXAuditResult, PageAudit } from '@/app/api/ux-audit/route'

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = score >= 75 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  const sz = size === 'lg' ? 'text-2xl font-bold px-4 py-2' : size === 'sm' ? 'text-xs font-semibold px-2 py-0.5' : 'text-sm font-bold px-3 py-1'
  return <span className={cn('rounded-full', color, sz)}>{score}</span>
}

// ─── Severity dot ─────────────────────────────────────────────────────────────

function SeverityDot({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full shrink-0 mt-1.5',
      severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
    )} />
  )
}

// ─── Iframe preview ───────────────────────────────────────────────────────────

const isLocalhost = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)

function SitePreview({ url }: { url: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [blocked, setBlocked] = useState(false)
  const [showFix, setShowFix] = useState(false)
  const local = isLocalhost(url)

  useEffect(() => {
    setBlocked(false)
    setShowFix(false)
    const timer = setTimeout(() => {
      try {
        if (iframeRef.current?.contentDocument === null) setBlocked(true)
      } catch { setBlocked(true) }
    }, 4000)
    return () => clearTimeout(timer)
  }, [url])

  return (
    <div className="border border-border rounded-forge overflow-hidden bg-surface2" style={{ height: blocked && showFix ? 'auto' : 280 }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface shrink-0">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-ink4 truncate flex-1">{url}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ink4 hover:text-ink3 shrink-0">↗</a>
      </div>
      <div style={{ minHeight: blocked ? undefined : 'calc(280px - 33px)' }}>
        {blocked ? (
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-amber text-sm shrink-0">⚠</span>
              <div>
                <p className="text-xs font-medium text-ink">Preview is blocked</p>
                <p className="text-[11px] text-ink3 mt-0.5">
                  Your site has security settings that block it from being embedded here. The audit still ran correctly — this only affects the visual preview.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 border border-border rounded-forge text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors">
                Open in new tab ↗
              </a>
              <button onClick={() => setShowFix(v => !v)}
                className="px-3 py-1.5 border border-border rounded-forge text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors">
                {showFix ? 'Hide fix' : 'How to enable preview'}
              </button>
            </div>
            {showFix && (
              <div className="bg-ink rounded-forge p-3 space-y-2">
                <p className="text-[11px] text-white/70">
                  {local
                    ? <>Add this to your <code className="text-white">next.config.js</code>:</>
                    : <>Your site is blocking previews. If this is your app, add this to your <code className="text-white">next.config.js</code> and redeploy:</>
                  }
                </p>
                <pre className="text-[11px] text-white font-mono whitespace-pre leading-relaxed">{`async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'X-Frame-Options',
      value: 'ALLOWALL',
    }],
  }]
},`}</pre>
                <p className="text-[10px] text-white/50">
                  {local
                    ? 'Restart your dev server after saving.'
                    : 'Redeploy after saving. The audit results above are still accurate — this only affects the visual preview.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <iframe ref={iframeRef} src={url} className="w-full" style={{ border: 'none', height: 247 }} title="Page preview" />
        )}
      </div>
    </div>
  )
}

// ─── Page audit detail ────────────────────────────────────────────────────────

function PageAuditDetail({ page }: { page: PageAudit }) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{page.title}</p>
          <p className="text-[11px] text-ink4 truncate">{page.url}</p>
          <p className="text-xs text-ink3 mt-1">{page.purpose}</p>
        </div>
        <ScoreBadge score={page.score} size="md" />
      </div>

      {/* Quick signals */}
      <div className="flex gap-3">
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-forge border text-xs',
          page.canGoBack ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
        )}>
          <span>{page.canGoBack ? '✓' : '✗'}</span>
          <span>Can go back</span>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-forge border text-xs',
          page.nextStepClear ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
        )}>
          <span>{page.nextStepClear ? '✓' : '✗'}</span>
          <span>Next step is clear</span>
        </div>
      </div>

      {/* Issues */}
      {page.issues.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">Problems found</p>
          <div className="space-y-3">
            {page.issues.map((issue, i) => (
              <div key={i} className="flex gap-3 p-3 bg-surface border border-border rounded-forge">
                <SeverityDot severity={issue.severity} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink mb-0.5">{issue.title}</p>
                  <p className="text-[11px] text-ink3 leading-relaxed">{issue.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wins */}
      {page.wins.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">What's working</p>
          <div className="space-y-1.5">
            {page.wins.map((win, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 shrink-0 mt-0.5 text-xs">✓</span>
                <p className="text-[11px] text-ink3 leading-relaxed">{win}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Auth panel ───────────────────────────────────────────────────────────────

type AuthType = 'none' | 'credentials' | 'cookie'

interface AuthState {
  type: AuthType
  username: string
  password: string
  cookie: string
}

const defaultAuth: AuthState = { type: 'none', username: '', password: '', cookie: '' }

function AuthPanel({ auth, onChange }: { auth: AuthState; onChange: (a: AuthState) => void }) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<AuthState>) => onChange({ ...auth, ...patch })

  const label = auth.type === 'credentials' ? 'Email & password'
    : auth.type === 'cookie' ? 'Session cookie' : null

  return (
    <div className="border border-border rounded-forge overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface text-left hover:bg-surface2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink">
            {label ? (auth.type === 'credentials' ? `Logging in as: ${auth.username || 'test user'}` : 'Using session cookie') : 'Audit behind a login?'}
          </span>
          {label && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-bg border border-amber-border text-amber font-medium">
              {label}
            </span>
          )}
        </div>
        <span className="text-ink4 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border bg-surface2">
          <div className="flex border-b border-border">
            {([
              ['none', 'No login needed'],
              ['credentials', 'Email & password'],
              ['cookie', 'Already logged in'],
            ] as [AuthType, string][]).map(([t, lbl]) => (
              <button
                key={t}
                onClick={() => set({ type: t })}
                className={cn(
                  'flex-1 py-2 text-xs transition-colors border-b-2 -mb-px',
                  auth.type === t ? 'border-ink text-ink font-medium' : 'border-transparent text-ink4 hover:text-ink3'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="p-4">
            {auth.type === 'none' && (
              <p className="text-[11px] text-ink4">Only publicly visible pages will be audited.</p>
            )}

            {auth.type === 'credentials' && (
              <div className="space-y-3">
                <p className="text-[11px] text-ink3">
                  We'll find your login page and sign in automatically. Use a test account — not your main admin login.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Email or username</label>
                    <input value={auth.username} onChange={e => set({ username: e.target.value })} placeholder="you@example.com" autoComplete="off"
                      className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Password</label>
                    <input type="password" value={auth.password} onChange={e => set({ password: e.target.value })} placeholder="••••••••" autoComplete="new-password"
                      className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
                  </div>
                </div>
                <p className="text-[10px] text-ink4">
                  Won't work with Google/GitHub login or magic links — use "Already logged in" for those.
                </p>
              </div>
            )}

            {auth.type === 'cookie' && (
              <div className="space-y-3">
                <div className="space-y-2 text-[11px] text-ink3">
                  <p className="font-medium text-ink">How to copy your session:</p>
                  {[
                    'Log into your app in another browser tab',
                    'Press F12 (or Cmd+Option+I on Mac) to open DevTools',
                    'Click the Network tab, then reload the page',
                    'Click any request in the list',
                    'Under "Request Headers", find Cookie and copy the full value',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-ink text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <textarea value={auth.cookie} onChange={e => set({ cookie: e.target.value })} placeholder="Paste cookie value here…" rows={3}
                  className="w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none font-mono" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────

interface AuditHistoryEntry {
  url: string
  overallScore: number
  timestamp: number
  result: UXAuditResult
}

const HISTORY_KEY = 'forge:ux-audit-history'
function loadHistory(): AuditHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveToHistory(entry: AuditHistoryEntry) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(
      [entry, ...loadHistory().filter(h => h.url !== entry.url)].slice(0, 10)
    ))
  } catch {}
}

// ─── Main page ────────────────────────────────────────────────────────────────

function UXAuditInner() {
  const { activeProject } = useProject()
  const rawUrl = activeProject?.app_url
  const defaultUrl = rawUrl
    ? rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`
    : ''

  const [url, setUrl] = useState(defaultUrl)
  const [authState, setAuthState] = useState<AuthState>(defaultAuth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UXAuditResult | null>(null)
  const [selectedPageIdx, setSelectedPageIdx] = useState(0)
  const [history, setHistory] = useState<AuditHistoryEntry[]>([])
  const [activeTab, setActiveTab] = useState<'pages' | 'navigation' | 'fixes'>('pages')

  useEffect(() => { setHistory(loadHistory()) }, [])
  useEffect(() => { if (defaultUrl && !result) setUrl(defaultUrl) }, [defaultUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAudit = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setSelectedPageIdx(0)
    setActiveTab('pages')

    try {
      const authPayload = authState.type === 'none' ? undefined : {
        type: authState.type,
        ...(authState.type === 'cookie'
          ? { cookie: authState.cookie }
          : { username: authState.username, password: authState.password }),
      }
      const res = await fetch('/api/ux-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), auth: authPayload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Audit failed')
      const entry: AuditHistoryEntry = { url: url.trim(), overallScore: data.result.overallScore, timestamp: Date.now(), result: data.result }
      saveToHistory(entry)
      setHistory(loadHistory())
      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const loadFromHistory = (entry: AuditHistoryEntry) => {
    setUrl(entry.url)
    setResult(entry.result)
    setSelectedPageIdx(0)
    setActiveTab('pages')
    setError('')
  }

  return (
    <>
      <Topbar title="UX Audit" />
      <div className="p-5 max-w-6xl mx-auto">

        {/* URL + auth + run */}
        <div className="space-y-2 mb-5">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAudit()}
              placeholder="https://yourapp.com  or  http://localhost:3000"
              className="flex-1 text-sm bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
            <button
              onClick={handleAudit}
              disabled={loading || !url.trim()}
              className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {loading ? (
                <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" /></svg> Auditing…</>
              ) : 'Run audit'}
            </button>
          </div>
          <AuthPanel auth={authState} onChange={setAuthState} />
          {url.includes('localhost') && (
            <p className="text-[11px] text-ink4 px-1">Localhost works when both Forge and your project are running locally.</p>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-forge text-xs text-red-700">{error}</div>
        )}

        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-surface2 border border-border rounded-forge" />
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-surface2 border border-border rounded-forge" />)}
            </div>
            <div className="h-64 bg-surface2 border border-border rounded-forge" />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">

            {/* Site overview */}
            <div className="bg-surface border border-border rounded-forge p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-1">What this app does</p>
                  <p className="text-sm text-ink">{result.sitePurpose}</p>
                </div>
                <ScoreBadge score={result.overallScore} size="lg" />
              </div>
              <p className="text-xs text-ink3 leading-relaxed mb-3">{result.summary}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface2 border border-border rounded-forge">
                  <span className="text-[10px] text-ink4">Overall</span>
                  <ScoreBadge score={result.overallScore} size="sm" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface2 border border-border rounded-forge">
                  <span className="text-[10px] text-ink4">How intuitive</span>
                  <ScoreBadge score={result.intuitivenessScore} size="sm" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface2 border border-border rounded-forge">
                  <span className="text-[10px] text-ink4">Navigation</span>
                  <ScoreBadge score={result.navigationFlow.score} size="sm" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {([
                ['pages', `Pages (${result.pages.length})`],
                ['navigation', `Navigation flow`],
                ['fixes', `Top fixes (${result.topFixes.length})`],
              ] as [typeof activeTab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
                    activeTab === id ? 'border-ink text-ink' : 'border-transparent text-ink4 hover:text-ink3'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Pages tab */}
            {activeTab === 'pages' && (
              <div className="grid grid-cols-3 gap-5">
                {/* Page list */}
                <div className="col-span-1 space-y-1.5">
                  {result.pages.map((page, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPageIdx(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-forge border text-left transition-colors',
                        selectedPageIdx === i ? 'border-ink bg-surface2' : 'border-border hover:border-border2'
                      )}
                    >
                      <ScoreBadge score={page.score} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{page.title}</p>
                        <p className="text-[10px] text-ink4 truncate">{page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</p>
                      </div>
                      {page.issues.some(i => i.severity === 'high') && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0" title="High severity issues" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected page detail */}
                <div className="col-span-2 space-y-4">
                  <SitePreview url={result.pages[selectedPageIdx]?.url ?? result.url} />
                  {result.pages[selectedPageIdx] && (
                    <PageAuditDetail page={result.pages[selectedPageIdx]} />
                  )}
                </div>
              </div>
            )}

            {/* Navigation flow tab */}
            {activeTab === 'navigation' && (
              <div className="space-y-3">
                {result.navigationFlow.issues.length === 0 ? (
                  <div className="text-center py-10 text-ink4 text-sm">No major navigation issues found.</div>
                ) : (
                  result.navigationFlow.issues.map((issue, i) => (
                    <div key={i} className="flex gap-3 p-4 bg-surface border border-border rounded-forge">
                      <SeverityDot severity={issue.severity} />
                      <p className="text-sm text-ink3 leading-relaxed">{issue.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Top fixes tab */}
            {activeTab === 'fixes' && (
              <div className="space-y-3">
                {result.topFixes.map((fix, i) => (
                  <div key={i} className="bg-surface border border-border rounded-forge p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide',
                        fix.priority === 'high' && 'bg-red-100 text-red-700',
                        fix.priority === 'medium' && 'bg-amber-100 text-amber-700',
                        fix.priority === 'low' && 'bg-green-100 text-green-700',
                      )}>
                        {fix.priority}
                      </span>
                      <p className="text-sm font-semibold text-ink">{fix.title}</p>
                    </div>
                    <p className="text-xs text-ink3 mb-3 leading-relaxed">{fix.whatUserExperiences}</p>
                    <div className="bg-surface2 rounded-forge px-3 py-2">
                      <p className="text-[10px] font-semibold text-ink4 uppercase mb-1">How to fix it</p>
                      <p className="text-xs text-ink3 leading-relaxed">{fix.howToFix}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-medium text-ink mb-1">Simulate a real user on your site</p>
            <p className="text-xs text-ink4 max-w-sm">
              Enter any URL and we'll crawl your pages, figure out what your app does, and report back on what's confusing — in plain English.
            </p>
            {history.length > 0 && (
              <div className="mt-6 w-full max-w-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">Recent audits</p>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button key={i} onClick={() => loadFromHistory(h)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-forge border border-border hover:border-border2 text-left transition-colors text-xs text-ink3 hover:text-ink">
                      <ScoreBadge score={h.overallScore} size="sm" />
                      <span className="truncate flex-1">{h.url.replace(/^https?:\/\//, '')}</span>
                      <span className="text-ink4 shrink-0">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}

export default function UXAuditPage() {
  return <Suspense><UXAuditInner /></Suspense>
}
