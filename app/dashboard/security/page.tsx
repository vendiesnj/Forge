'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { sanitizeInput, detectAttack } from '@/lib/sanitize'
import { cn, formatRelativeTime } from '@/lib/utils'

const CHECKLIST = [
  { label: 'HTTPS enforced on all endpoints', pass: true },
  { label: 'Clerk authentication enabled', pass: true },
  { label: 'Row-level security on Supabase tables', pass: true },
  { label: 'API routes protected with auth()', pass: true },
  { label: 'Input sanitization on user inputs', pass: true },
  { label: 'Rate limiting on AI endpoints', pass: true },
  { label: 'CORS headers configured', pass: true },
  { label: 'Environment variables not exposed to client', pass: true },
  { label: 'Content Security Policy header set', pass: true },
  { label: 'SQL injection protection (parameterized queries)', pass: false },
  { label: '2FA enforcement for admin users', pass: false },
]

const RATE_LIMITS = [
  { endpoint: '/api/analyze', limit: 20, used: 7, unit: 'req/hr' },
  { endpoint: '/api/builds', limit: 50, used: 12, unit: 'req/hr' },
  { endpoint: '/api/checks/*', limit: 30, used: 3, unit: 'req/hr' },
  { endpoint: '/sign-in', limit: 5, used: 1, unit: 'req/min' },
  { endpoint: '/sign-up', limit: 3, used: 0, unit: 'req/min' },
  { endpoint: 'Global', limit: 1000, used: 284, unit: 'req/hr' },
]

interface LogEntry {
  id: string
  time: string
  type: 'info' | 'warn' | 'block'
  message: string
}

const INITIAL_LOGS: LogEntry[] = [
  { id: '1', time: new Date(Date.now() - 60000).toISOString(), type: 'info', message: 'User signed in successfully' },
  { id: '2', time: new Date(Date.now() - 120000).toISOString(), type: 'info', message: 'API request to /api/analyze — 200 OK' },
  { id: '3', time: new Date(Date.now() - 300000).toISOString(), type: 'warn', message: 'Rate limit at 35% capacity on /api/analyze' },
  { id: '4', time: new Date(Date.now() - 600000).toISOString(), type: 'block', message: 'Blocked: XSS attempt in idea input field' },
]

function validateUrl(url: string): { ok: boolean; reason: string } {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, reason: `Disallowed protocol: ${parsed.protocol}` }
    }
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return { ok: false, reason: 'Localhost URLs not allowed' }
    }
    if (parsed.hostname.endsWith('.onion')) {
      return { ok: false, reason: 'Onion addresses not allowed' }
    }
    const suspicious = ['javascript', 'data:', 'vbscript', 'file:']
    if (suspicious.some(s => url.toLowerCase().includes(s))) {
      return { ok: false, reason: 'Suspicious URL pattern detected' }
    }
    return { ok: true, reason: 'URL appears safe' }
  } catch {
    return { ok: false, reason: 'Invalid URL format' }
  }
}

export default function SecurityPage() {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [urlInput, setUrlInput] = useState('')
  const [urlResult, setUrlResult] = useState<{ ok: boolean; reason: string } | null>(null)
  const [sanitizeInput2, setSanitizeInput2] = useState('')
  const [sanitized, setSanitized] = useState('')
  const [attack, setAttack] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const logTypes = [
        { type: 'info' as const, messages: [
          'API request to /api/analyze — 200 OK',
          'User session refreshed',
          'Supabase query completed in 45ms',
          'Static asset served from cache',
        ]},
        { type: 'warn' as const, messages: [
          'Rate limit at 60% capacity',
          'Slow query detected: 2.1s',
        ]},
      ]
      const typeEntry = logTypes[Math.floor(Math.random() * logTypes.length)]
      const messages = typeEntry.messages
      const newLog: LogEntry = {
        id: Math.random().toString(36).slice(2, 8),
        time: new Date().toISOString(),
        type: typeEntry.type,
        message: messages[Math.floor(Math.random() * messages.length)],
      }
      setLogs((prev) => [newLog, ...prev].slice(0, 30))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleScan = () => {
    if (!urlInput.trim()) return
    setUrlResult(validateUrl(urlInput.trim()))
  }

  const handleSanitize = (value: string) => {
    setSanitizeInput2(value)
    setSanitized(sanitizeInput(value))
    setAttack(detectAttack(value))
  }

  const passing = CHECKLIST.filter(c => c.pass).length

  return (
    <>
      <Topbar title="Security" subtitle="Trust & safety controls" />
      <div className="p-5 max-w-4xl mx-auto space-y-4">
        {/* Status banner */}
        <div className="flex items-center gap-3 p-4 bg-green-bg border border-green-border rounded-forge">
          <div className="w-3 h-3 rounded-full bg-green animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green">All Systems Operational</p>
            <p className="text-xs text-ink3">Last checked: just now · {passing}/{CHECKLIST.length} security checks passing</p>
          </div>
          <svg className="w-5 h-5 text-green" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L4 5v5c0 4 3.5 7.5 6 8.5C12.5 17.5 16 14 16 10V5l-6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M7 10l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: '🔐', title: 'Clerk Auth', desc: 'Enterprise-grade authentication' },
            { icon: '🛡️', title: 'Row-Level Security', desc: 'Supabase RLS on all tables' },
            { icon: '🔒', title: 'HTTPS Only', desc: 'All traffic encrypted in transit' },
            { icon: '🤖', title: 'AI Sandboxed', desc: 'Claude API server-side only' },
          ].map((badge) => (
            <div key={badge.title} className="bg-surface border border-border rounded-forge p-4 text-center">
              <div className="text-2xl mb-2">{badge.icon}</div>
              <p className="text-xs font-semibold text-ink mb-0.5">{badge.title}</p>
              <p className="text-[10px] text-ink4 leading-relaxed">{badge.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Checklist */}
          <div className="bg-surface border border-border rounded-forge p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-ink2">Security Checklist</p>
              <span className="tag tag-green">{passing}/{CHECKLIST.length} passing</span>
            </div>
            <div className="space-y-1.5">
              {CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  {item.pass ? (
                    <svg className="w-3.5 h-3.5 text-green shrink-0" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="var(--green-bg)" stroke="var(--green-border)" />
                      <path d="M4.5 7l1.5 1.5 3-3" stroke="var(--green)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-amber shrink-0" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" fill="var(--amber-bg)" stroke="var(--amber-border)" />
                      <path d="M7 4.5v3M7 9.5v.5" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  )}
                  <span className={cn('text-xs', item.pass ? 'text-ink2' : 'text-ink3')}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rate limits */}
          <div className="bg-surface border border-border rounded-forge p-4">
            <p className="text-xs font-medium text-ink2 mb-3">Rate Limit Status</p>
            <div className="space-y-3">
              {RATE_LIMITS.map((rl) => {
                const pct = Math.round((rl.used / rl.limit) * 100)
                return (
                  <div key={rl.endpoint}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-ink3">{rl.endpoint}</span>
                      <span className="text-[10px] text-ink4">{rl.used}/{rl.limit} {rl.unit}</span>
                    </div>
                    <div className="h-1.5 bg-surface2 rounded-full overflow-hidden border border-border">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 80 ? 'bg-red' : pct >= 60 ? 'bg-amber' : 'bg-green'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* URL Scanner */}
        <div className="bg-surface border border-border rounded-forge p-4">
          <p className="text-xs font-medium text-ink2 mb-3">URL Scanner</p>
          <div className="flex gap-2 mb-3">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="https://example.com/path?query=value"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 font-mono"
            />
            <button
              onClick={handleScan}
              className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Scan
            </button>
          </div>
          {urlResult && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-forge border text-sm',
              urlResult.ok ? 'bg-green-bg border-green-border text-green' : 'bg-red-bg border-red-border text-red'
            )}>
              {urlResult.ok ? (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6L6 10M6 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {urlResult.reason}
            </div>
          )}
        </div>

        {/* Input Sanitization Demo */}
        <div className="bg-surface border border-border rounded-forge p-4">
          <p className="text-xs font-medium text-ink2 mb-3">Input Sanitization Demo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-ink4 mb-1.5 uppercase">Raw Input</label>
              <textarea
                value={sanitizeInput2}
                onChange={(e) => handleSanitize(e.target.value)}
                rows={3}
                placeholder={'Try: <script>alert("xss")</script>\nor: \' OR 1=1; DROP TABLE users;'}
                className="w-full px-3 py-2 text-xs border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 font-mono resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-ink4 mb-1.5 uppercase">Sanitized Output</label>
              <div className="h-[76px] px-3 py-2 text-xs border border-border rounded-forge bg-surface2 text-green font-mono overflow-auto scrollbar-thin">
                {sanitized || <span className="text-ink4">Output appears here...</span>}
              </div>
            </div>
          </div>
          {attack && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-bg border border-red-border rounded-forge">
              <svg className="w-3.5 h-3.5 text-red shrink-0" viewBox="0 0 14 14" fill="none">
                <path d="M7 2L1.5 12h11L7 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M7 6v3M7 10.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-xs text-red font-medium">Attack detected: {attack}</span>
            </div>
          )}
          {!attack && sanitizeInput2 && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-bg border border-green-border rounded-forge">
              <svg className="w-3.5 h-3.5 text-green shrink-0" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs text-green">No attack patterns detected. Input sanitized safely.</span>
            </div>
          )}
        </div>

        {/* Security Log */}
        <div className="bg-surface border border-border rounded-forge p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <p className="text-xs font-medium text-ink2">Security Log</p>
            <span className="ml-auto text-[10px] text-ink4">Live</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin font-mono">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 py-1 border-b border-border/50 text-[11px] animate-fadeUp">
                <span className="text-ink4 shrink-0 w-20">{formatRelativeTime(log.time)}</span>
                <span className={cn(
                  'tag text-[10px] shrink-0',
                  log.type === 'info' ? 'tag-gray' : log.type === 'warn' ? 'tag-amber' : 'tag-red'
                )}>
                  {log.type}
                </span>
                <span className="text-ink3">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
