'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { UXAuditResult } from '@/app/api/ux-audit/route'

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-border" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        dominantBaseline="middle" textAnchor="middle"
        style={{
          transform: `rotate(90deg) translate(0, -${size}px)`,
          transformOrigin: `${size / 2}px ${size / 2}px`,
          fill: 'var(--ink)',
          fontSize: size < 50 ? 10 : 13,
          fontWeight: 600,
        }}
      >
        {score}
      </text>
    </svg>
  )
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ title, score, findings }: {
  title: string
  score: number
  findings: Array<{ type: 'good' | 'issue'; description: string }>
}) {
  return (
    <div className="bg-surface border border-border rounded-forge p-4">
      <div className="flex items-center gap-3 mb-3">
        <ScoreRing score={score} size={44} />
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      <div className="space-y-1.5">
        {findings.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn('mt-0.5 shrink-0 text-[11px]', f.type === 'good' ? 'text-green-500' : 'text-amber')}>
              {f.type === 'good' ? '✓' : '!'}
            </span>
            <p className="text-[11px] text-ink3 leading-snug">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cn(
      'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide',
      priority === 'high' && 'bg-red-100 text-red-700',
      priority === 'medium' && 'bg-amber-100 text-amber-700',
      priority === 'low' && 'bg-green-100 text-green-700',
    )}>
      {priority}
    </span>
  )
}

// ─── Iframe preview ───────────────────────────────────────────────────────────

function SitePreview({ url }: { url: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    setBlocked(false)
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument
        if (doc === null) setBlocked(true)
      } catch {
        setBlocked(true)
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [url])

  return (
    <div className="border border-border rounded-forge overflow-hidden bg-surface2" style={{ height: 380 }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface shrink-0">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-ink4 truncate flex-1">{url}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-ink4 hover:text-ink3 shrink-0">↗</a>
      </div>
      <div style={{ height: 'calc(100% - 33px)' }}>
        {blocked ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6">
            <p className="text-xs font-medium text-ink">Site blocks embedding</p>
            <p className="text-[11px] text-ink4 max-w-xs">Security headers prevent iframe preview. The audit still ran against the page source.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink3 underline hover:text-ink">Open in new tab ↗</a>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full"
            style={{ border: 'none' }}
            title="Site preview"
          />
        )}
      </div>
    </div>
  )
}

// ─── Auth types ───────────────────────────────────────────────────────────────

type AuthType = 'none' | 'cookie' | 'form'

interface AuthState {
  type: AuthType
  cookie: string
  loginUrl: string
  usernameField: string
  username: string
  passwordField: string
  password: string
}

const defaultAuth: AuthState = {
  type: 'none',
  cookie: '',
  loginUrl: '',
  usernameField: 'email',
  username: '',
  passwordField: 'password',
  password: '',
}

// ─── Auth panel ───────────────────────────────────────────────────────────────

function AuthPanel({ auth, baseUrl, onChange }: {
  auth: AuthState
  baseUrl: string
  onChange: (a: AuthState) => void
}) {
  const [open, setOpen] = useState(false)

  const set = (patch: Partial<AuthState>) => onChange({ ...auth, ...patch })

  return (
    <div className="border border-border rounded-forge overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface text-left hover:bg-surface2 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink">Authentication</span>
          {auth.type !== 'none' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-bg border border-amber-border text-amber font-medium">
              {auth.type === 'cookie' ? 'Session cookie' : 'Form login'}
            </span>
          )}
        </div>
        <span className="text-ink4 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4 bg-surface2">
          {/* Auth type selector */}
          <div className="flex gap-2">
            {(['none', 'cookie', 'form'] as AuthType[]).map(t => (
              <button
                key={t}
                onClick={() => set({ type: t })}
                className={cn(
                  'flex-1 py-1.5 text-xs rounded-forge border transition-colors',
                  auth.type === t
                    ? 'bg-ink text-white border-ink'
                    : 'bg-surface border-border text-ink3 hover:text-ink hover:border-border2'
                )}
              >
                {t === 'none' ? 'None' : t === 'cookie' ? 'Session cookie' : 'Login form'}
              </button>
            ))}
          </div>

          {auth.type === 'cookie' && (
            <div className="space-y-2">
              <div className="px-3 py-2 bg-surface border border-border rounded-forge text-[11px] text-ink3 space-y-1">
                <p className="font-medium text-ink">How to get your session cookie:</p>
                <p>1. Log into your app in a browser tab</p>
                <p>2. Open DevTools → Network → click any request</p>
                <p>3. Find the <strong>Cookie</strong> request header and copy its value</p>
              </div>
              <textarea
                value={auth.cookie}
                onChange={e => set({ cookie: e.target.value })}
                placeholder="session=abc123; __Host-next-auth.csrf-token=xyz..."
                rows={3}
                className="w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none font-mono"
              />
            </div>
          )}

          {auth.type === 'form' && (
            <div className="space-y-3">
              <div className="px-3 py-2 bg-surface border border-border rounded-forge text-[11px] text-ink3">
                Works best with traditional form-based login pages. For apps using OAuth, magic links, or passkeys, use the session cookie method instead.
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Login page URL</label>
                <input
                  value={auth.loginUrl}
                  onChange={e => set({ loginUrl: e.target.value })}
                  placeholder={baseUrl ? `${baseUrl}/login` : 'https://yourapp.com/login'}
                  className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Username field name</label>
                  <input
                    value={auth.usernameField}
                    onChange={e => set({ usernameField: e.target.value })}
                    placeholder="email"
                    className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Password field name</label>
                  <input
                    value={auth.passwordField}
                    onChange={e => set({ passwordField: e.target.value })}
                    placeholder="password"
                    className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Username / Email</label>
                  <input
                    value={auth.username}
                    onChange={e => set({ username: e.target.value })}
                    placeholder="you@example.com"
                    className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={auth.password}
                    onChange={e => set({ password: e.target.value })}
                    placeholder="••••••••"
                    className="mt-1 w-full text-xs bg-surface border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
              </div>
            </div>
          )}
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
    const next = [entry, ...loadHistory().filter(h => h.url !== entry.url)].slice(0, 10)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
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
  const [history, setHistory] = useState<AuditHistoryEntry[]>([])

  useEffect(() => { setHistory(loadHistory()) }, [])
  useEffect(() => { if (defaultUrl && !result) setUrl(defaultUrl) }, [defaultUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAudit = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const authPayload = authState.type === 'none' ? undefined : {
        type: authState.type,
        ...(authState.type === 'cookie' ? { cookie: authState.cookie } : {
          loginUrl: authState.loginUrl,
          usernameField: authState.usernameField,
          username: authState.username,
          passwordField: authState.passwordField,
          password: authState.password,
        }),
      }

      const res = await fetch('/api/ux-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), auth: authPayload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Audit failed')

      const entry: AuditHistoryEntry = {
        url: url.trim(),
        overallScore: data.result.overallScore,
        timestamp: Date.now(),
        result: data.result,
      }
      saveToHistory(entry)
      setHistory(loadHistory())
      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const baseUrl = (() => {
    try { return new URL(url.includes('://') ? url : `https://${url}`).origin } catch { return '' }
  })()

  return (
    <>
      <Topbar title="UX Audit" />
      <div className="p-5 max-w-6xl mx-auto">

        {/* URL + auth + run button */}
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
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                  Auditing…
                </>
              ) : 'Run audit'}
            </button>
          </div>

          <AuthPanel auth={authState} baseUrl={baseUrl} onChange={setAuthState} />

          {url.includes('localhost') && (
            <p className="text-[11px] text-ink4 px-1">
              Localhost audits work when both Forge and your project are running locally.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-forge text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-surface2 border border-border rounded-forge" />
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-36 bg-surface2 border border-border rounded-forge" />)}
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="grid grid-cols-3 gap-5">

            {/* Left: preview + pages crawled + history */}
            <div className="col-span-1 space-y-4">
              <SitePreview url={result.url} />

              {/* Pages audited */}
              {result.pagesAudited?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">
                    Pages audited ({result.pagesAudited.length})
                  </p>
                  <div className="space-y-1">
                    {result.pagesAudited.map((p, i) => (
                      <a
                        key={i}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-ink3 hover:text-ink hover:bg-surface2 transition-colors group"
                      >
                        <span className="w-4 h-4 rounded-full bg-surface2 border border-border flex items-center justify-center text-[9px] text-ink4 shrink-0 group-hover:border-border2">
                          {i + 1}
                        </span>
                        <span className="truncate flex-1">{p.title || p.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
                        <span className="shrink-0 opacity-0 group-hover:opacity-100">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {history.length > 1 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">Recent audits</p>
                  <div className="space-y-1">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => { setUrl(h.url); setResult(h.result); setError('') }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-forge border text-left transition-colors text-xs',
                          h.url === result.url
                            ? 'border-ink bg-surface2'
                            : 'border-border hover:border-border2 text-ink3 hover:text-ink'
                        )}
                      >
                        <span className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white',
                          h.overallScore >= 75 ? 'bg-green-500' : h.overallScore >= 50 ? 'bg-amber' : 'bg-red-500'
                        )}>
                          {h.overallScore}
                        </span>
                        <span className="truncate">{h.url.replace(/^https?:\/\//, '')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: scores + recommendations */}
            <div className="col-span-2 space-y-5">
              {/* Overall */}
              <div className="bg-surface border border-border rounded-forge p-5 flex items-start gap-5">
                <ScoreRing score={result.overallScore} size={72} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-1">Overall UX Score</p>
                  <p className="text-sm text-ink leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* Category scores */}
              <div className="grid grid-cols-2 gap-3">
                <CategoryCard title="Navigation" score={result.navigation.score} findings={result.navigation.findings} />
                <CategoryCard title="Readability" score={result.readability.score} findings={result.readability.findings} />
                <CategoryCard title="Accessibility" score={result.accessibility.score} findings={result.accessibility.findings} />
                <CategoryCard title="Layout" score={result.layout.score} findings={result.layout.findings} />
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-3">Recommendations</p>
                <div className="space-y-2.5">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="bg-surface border border-border rounded-forge p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <PriorityBadge priority={rec.priority} />
                        <span className="text-[10px] text-ink4">{rec.category}</span>
                      </div>
                      <p className="text-sm font-medium text-ink mb-1">{rec.title}</p>
                      <p className="text-[11px] text-ink3 mb-2">{rec.description}</p>
                      <div className="bg-surface2 rounded px-3 py-2">
                        <p className="text-[10px] font-semibold text-ink4 uppercase mb-1">Fix</p>
                        <p className="text-[11px] text-ink3">{rec.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-medium text-ink mb-1">Audit any URL</p>
            <p className="text-xs text-ink4 max-w-xs">
              Enter a URL — including <code className="bg-surface2 px-1 rounded">localhost:3000</code> — and optionally add authentication to audit logged-in pages too.
            </p>
            {history.length > 0 && (
              <div className="mt-6 w-full max-w-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">Recent audits</p>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { setUrl(h.url); setResult(h.result); setError('') }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-forge border border-border hover:border-border2 text-left transition-colors text-xs text-ink3 hover:text-ink"
                    >
                      <span className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white',
                        h.overallScore >= 75 ? 'bg-green-500' : h.overallScore >= 50 ? 'bg-amber' : 'bg-red-500'
                      )}>
                        {h.overallScore}
                      </span>
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
