'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { PageExplainer } from '@/components/page-explainer'
import { NextStepBar } from '@/components/next-step-bar'
import { useProject } from '@/components/project-context'
import { useProfile } from '@/components/profile-context'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { cn } from '@/lib/utils'
import type { BuildGuide, IdeaAnalysis } from '@/types'

// ─── Shared helpers ──────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="px-2 py-0.5 text-[10px] border border-border rounded text-ink4 hover:text-ink hover:border-border2 transition-colors shrink-0"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

function CodeLine({ cmd }: { cmd: string }) {
  return (
    <div className="flex items-center gap-2 bg-ink rounded-forge px-3 py-2">
      <code className="text-xs text-white font-mono flex-1 select-all">{cmd}</code>
      <CopyButton text={cmd} />
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-blue underline underline-offset-2 hover:opacity-70 transition-opacity text-xs">
      {children}
    </a>
  )
}

function Collapse({ icon, title, children, defaultOpen = false }: {
  icon: string; title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface border border-border rounded-forge overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface2 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-ink">{title}</span>
        </div>
        <svg className={cn('w-4 h-4 text-ink4 transition-transform shrink-0', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 border-t border-border pt-3">{children}</div>}
    </div>
  )
}

function CheckRow({ label, sub, href, time, checked, onToggle }: {
  label: string; sub?: string; href?: string; time?: string; checked: boolean; onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex gap-3 p-3 rounded-forge border cursor-pointer transition-colors',
        checked ? 'bg-surface border-green-border' : 'bg-surface2 border-border hover:border-border2'
      )}
    >
      <div className={cn(
        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
        checked ? 'bg-green border-green' : 'border-border2 bg-surface'
      )}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 16 16">
            <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('text-sm font-medium', checked ? 'text-ink3 line-through' : 'text-ink')}>{label}</p>
          {time && <span className="text-[10px] text-ink4 bg-surface border border-border px-1.5 py-0.5 rounded">{time}</span>}
          {href && !checked && (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="text-xs text-blue underline underline-offset-2 hover:opacity-70">
              Open →
            </a>
          )}
        </div>
        {sub && <p className="text-xs text-ink3 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function PromptBlock({ label, prompt }: { label: string; prompt: string }) {
  return (
    <div className="p-3 bg-surface2 border border-border rounded-forge">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-ink4 uppercase tracking-wider">{label}</p>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>
      <p className="text-xs text-ink2 leading-relaxed">{prompt}</p>
    </div>
  )
}

// ─── Software track ───────────────────────────────────────────────────────────

function SoftwareGuide({
  guide, idea, activeProject,
}: {
  guide: BuildGuide
  idea: IdeaAnalysis | null
  activeProject: { id: string; name: string; idea: string; track: string; github_repo?: string | null } | null
}) {
  const { refreshProjects } = useProject()
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [scaffolding, setScaffolding] = useState(false)
  const [createdRepo, setCreatedRepo] = useState<{ url: string; cloneUrl: string; fullName: string } | null>(null)
  const [scaffoldError, setScaffoldError] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setChecked(p => ({ ...p, [k]: !p[k] }))

  // Existing repo linking
  const [repos, setRepos] = useState<{ name: string; full_name: string; url: string; clone_url?: string }[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [linkedRepo, setLinkedRepo] = useState<{ fullName: string; url: string; cloneUrl: string } | null>(
    activeProject?.github_repo ? { fullName: activeProject.github_repo, url: `https://github.com/${activeProject.github_repo}`, cloneUrl: `https://github.com/${activeProject.github_repo}.git` } : null
  )
  const [linkingRepo, setLinkingRepo] = useState(false)
  const [showRepoPicker, setShowRepoPicker] = useState(false)

  const fetchRepos = async () => {
    setReposLoading(true)
    try {
      const res = await fetch('/api/github/repos')
      const data = await res.json()
      setRepos(data.repos ?? [])
    } catch { /* ignore */ } finally {
      setReposLoading(false)
    }
  }

  const linkRepo = async (fullName: string, repoUrl: string, cloneUrl: string) => {
    if (!activeProject?.id) return
    setLinkingRepo(true)
    try {
      await fetch('/api/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id, repoFullName: fullName, repoUrl }),
      })
      setLinkedRepo({ fullName, url: repoUrl, cloneUrl: cloneUrl || `https://github.com/${fullName}.git` })
      setShowRepoPicker(false)
      refreshProjects()  // sync github_repo into context so other pages (Keys & Services) see it
    } catch { /* ignore */ } finally {
      setLinkingRepo(false)
    }
  }

  const productName = idea?.productName ?? activeProject?.name ?? 'my-app'
  const repoSlug = productName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  // Compute env vars from stack names
  const stackEnvMap: Record<string, string[]> = {
    supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    clerk: ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'],
    stripe: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    posthog: ['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST'],
    resend: ['RESEND_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    upstash: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    sentry: ['NEXT_PUBLIC_SENTRY_DSN'],
    neon: ['DATABASE_URL'],
    planetscale: ['DATABASE_URL'],
    twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
  }
  const envVars = Array.from(new Set(
    (guide.stack ?? []).flatMap(s => {
      const key = s.name.toLowerCase()
      return Object.entries(stackEnvMap).find(([k]) => key.includes(k))?.[1] ?? []
    })
  ))

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then(d => setGithubConnected(d.integrations?.some((i: { provider: string }) => i.provider === 'github') ?? false))
      .catch(() => setGithubConnected(false))
  }, [])

  const handleScaffold = async () => {
    setScaffolding(true)
    setScaffoldError('')
    try {
      const res = await fetch('/api/github/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject?.id,
          repoName: repoSlug,
          productName,
          tagline: idea?.tagline ?? '',
          idea: activeProject?.idea ?? '',
          track: activeProject?.track ?? 'software',
          stack: guide.stack ?? [],
          mvpFeatures: idea?.features?.mvp ?? [],
          setupSteps: guide.setupSteps ?? [],
          envVars,
          isPrivate: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create repo')
      setCreatedRepo(data.repo)
      refreshProjects()  // sync github_repo into context so other pages (Keys & Services) see it
    } catch (err) {
      setScaffoldError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setScaffolding(false)
    }
  }

  const activeRepo = createdRepo ?? linkedRepo
  const cloneCmd = activeRepo ? `git clone ${activeRepo.cloneUrl}` : `git clone https://github.com/you/${repoSlug}.git`
  const folderName = activeRepo ? activeRepo.fullName.split('/')[1] : repoSlug
  const cdAndOpen = `cd ${folderName} && npm install && claude`
  const vsCodeDeeplink = activeRepo ? `vscode://vscode.git/clone?url=${encodeURIComponent(activeRepo.cloneUrl)}` : null

  const featurePrompts = (idea?.features?.mvp ?? []).slice(0, 5).map(f => ({
    label: f.feature,
    prompt: `Build the "${f.feature}" feature for ${productName}. ${f.why} Create all necessary components, API routes, and database schema. Wire it end-to-end. Follow the existing code style.`,
  }))

  const prompts = [
    {
      label: 'Project setup',
      prompt: `I'm starting ${productName}. Tech stack: ${(guide.stack ?? []).map(s => s.name).join(', ')}. Set up the full project structure: folder layout, config files, TypeScript config, a basic layout component, and placeholder pages for each main section. Use the CLAUDE.md file in this repo for full context.`,
    },
    ...featurePrompts,
    {
      label: 'Deploy to Vercel',
      prompt: `Help me deploy ${productName} to Vercel. Walk me through connecting this GitHub repo, setting all environment variables from .env.example, and verifying the first build succeeds. Fix any issues blocking the build.`,
    },
  ]

  return (
    <div className="space-y-4">

      {/* Your code — link / paste existing code */}
      <div className="bg-surface border border-border rounded-forge overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🐙</span>
            <p className="text-sm font-medium text-ink">Your code</p>
            {activeRepo && <span className="tag tag-green">{activeRepo.fullName}</span>}
          </div>
          {activeRepo && (
            <div className="flex items-center gap-3">
              <a href={activeRepo.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue underline underline-offset-2 hover:opacity-70">
                GitHub →
              </a>
              {vsCodeDeeplink && (
                <a href={vsCodeDeeplink}
                  className="px-3 py-1 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors">
                  Open in VS Code
                </a>
              )}
            </div>
          )}
        </div>
        <div className="p-4">
          {activeRepo ? (
            <div className="space-y-3">
              <p className="text-xs text-ink3">
                This project is linked to <code className="font-mono text-ink">{activeRepo.fullName}</code>.
                Clone it locally and open it in Claude Code — it already has <code className="font-mono text-ink">CLAUDE.md</code> with full project context.
              </p>
              <CodeLine cmd={cloneCmd} />
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => { setShowRepoPicker(!showRepoPicker); if (!repos.length) fetchRepos() }}
                  className="text-xs text-ink4 hover:text-ink underline underline-offset-2 transition-colors"
                >
                  Link a different repo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink3">
                Already have code? Link your GitHub repo to connect it to this project and get VS Code + Claude Code deeplinks.
              </p>
              {githubConnected === false ? (
                <a href="/api/auth/github"
                  className="inline-flex px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors">
                  Connect GitHub first
                </a>
              ) : (
                <button
                  onClick={() => { setShowRepoPicker(!showRepoPicker); if (!repos.length) fetchRepos() }}
                  className="px-4 py-2 border border-border text-xs font-medium text-ink rounded-forge hover:bg-surface2 transition-colors"
                >
                  {showRepoPicker ? 'Hide' : 'Browse my repos →'}
                </button>
              )}
              {!activeRepo && (
                <p className="text-xs text-ink4">
                  Or skip this — create a new repo in <span className="font-medium">Step 1</span> below.
                </p>
              )}
            </div>
          )}

          {/* Repo picker */}
          {showRepoPicker && (
            <div className="mt-3 border border-border rounded-forge overflow-hidden">
              {reposLoading ? (
                <div className="p-4 flex items-center gap-2 text-xs text-ink4">
                  <div className="w-3 h-3 rounded-full border-2 border-ink4 border-t-transparent animate-spin" />
                  Loading repos...
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto">
                  {repos.map(r => (
                    <button
                      key={r.full_name}
                      onClick={() => linkRepo(r.full_name, r.url, r.clone_url ?? `https://github.com/${r.full_name}.git`)}
                      disabled={linkingRepo}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface2 transition-colors border-b border-border last:border-0"
                    >
                      <span className="text-sm">📁</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{r.name}</p>
                        <p className="text-[10px] text-ink4 truncate">{r.full_name}</p>
                      </div>
                      <span className="text-xs text-blue shrink-0">Link →</span>
                    </button>
                  ))}
                  {repos.length === 0 && (
                    <p className="p-4 text-xs text-ink4">No repos found. Create one below.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Keys explanation */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-medium text-ink2 mb-1">What the Keys page does</p>
            <p className="text-xs text-ink3 leading-relaxed">
              The <span className="font-medium text-ink">Keys page</span> generates your <code className="font-mono text-ink text-[11px]">.env.local</code> file — the file your local code reads for API keys and database connections. After connecting your services there, copy the generated file into your project root.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 — Repo */}
      <div className="bg-surface border border-border rounded-forge overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <p className="text-sm font-medium text-ink">Create your repo</p>
          {createdRepo && <span className="tag tag-green ml-auto">Done</span>}
        </div>
        <div className="p-4">
          {createdRepo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-bg border border-green-border rounded-forge">
                <svg className="w-4 h-4 text-green shrink-0" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-xs text-ink2 font-medium">
                  Repo created with <code className="font-mono">CLAUDE.md</code>, <code className="font-mono">.env.example</code>, and <code className="font-mono">README.md</code>
                </p>
                <a href={createdRepo.url} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-xs text-blue underline underline-offset-2 hover:opacity-70 shrink-0">
                  View on GitHub →
                </a>
              </div>
              <CodeLine cmd={cloneCmd} />
            </div>
          ) : githubConnected === null ? (
            <div className="flex items-center gap-2 text-xs text-ink4">
              <div className="w-3 h-3 rounded-full border-2 border-ink4 border-t-transparent animate-spin" />
              Checking GitHub connection...
            </div>
          ) : githubConnected ? (
            <div className="space-y-3">
              <p className="text-xs text-ink3">
                Forge will create a private GitHub repo named <code className="font-mono text-ink">{repoSlug}</code> and push <code className="font-mono text-ink">CLAUDE.md</code> with your full project context, <code className="font-mono text-ink">.env.example</code>, and a README.
              </p>
              {scaffoldError && (
                <p className="text-xs text-red px-3 py-2 bg-red-bg border border-red-border rounded-forge">{scaffoldError}</p>
              )}
              <button
                onClick={handleScaffold}
                disabled={scaffolding}
                className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
              >
                {scaffolding && <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {scaffolding ? 'Creating repo...' : '✦ Create & scaffold repo'}
              </button>
              <p className="text-[10px] text-ink4">Or create it manually on GitHub and come back.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink3">Connect GitHub to auto-scaffold your repo with project context and prompts already inside.</p>
              <div className="flex items-center gap-3">
                <a href="/api/auth/github"
                  className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors">
                  Connect GitHub
                </a>
                <span className="text-xs text-ink4">or create the repo manually and continue</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — Claude Code */}
      <div className="bg-surface border border-border rounded-forge overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
          <p className="text-sm font-medium text-ink">Open in Claude Code</p>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-ink3">
            Clone your repo, install dependencies, then open Claude Code. It will automatically read <code className="font-mono text-ink text-[11px]">CLAUDE.md</code> and know everything about your project.
          </p>
          <div className="space-y-2">
            <p className="text-[10px] text-ink4 font-medium uppercase tracking-wider">Clone & open</p>
            <CodeLine cmd={cloneCmd} />
            <CodeLine cmd={cdAndOpen} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a href="https://code.visualstudio.com/download" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 bg-surface2 border border-border rounded-forge hover:border-border2 transition-colors group text-xs">
              <span className="text-base">💻</span>
              <span className="text-ink group-hover:underline font-medium">Download VS Code</span>
            </a>
            <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 bg-surface2 border border-border rounded-forge hover:border-border2 transition-colors group text-xs">
              <span className="text-base">✦</span>
              <span className="text-ink group-hover:underline font-medium">Install Claude Code</span>
            </a>
          </div>
        </div>
      </div>

      {/* Step 3 — Prompts */}
      <div className="bg-surface border border-border rounded-forge overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
          <p className="text-sm font-medium text-ink">Use these prompts</p>
          <span className="text-xs text-ink4 ml-auto">Paste into Claude Code one at a time</span>
        </div>
        <div className="p-4 space-y-2">
          {prompts.map((p, i) => <PromptBlock key={i} label={p.label} prompt={p.prompt} />)}
        </div>
      </div>

      {/* Technical reference */}
      <Collapse icon="📖" title="Technical reference">
        <div className="space-y-4 pt-1">

          {/* Stack */}
          {guide.stack?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Stack</p>
              <div className="space-y-2">
                {guide.stack.map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface2 border border-border rounded-forge">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-ink">{t.name}</span>
                        <span className="tag tag-gray">{t.role}</span>
                        <span className="text-[10px] text-ink4">{t.cost}</span>
                      </div>
                      <p className="text-xs text-ink3">{t.why}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <ExtLink href={t.link}>Site</ExtLink>
                      <ExtLink href={t.docsLink}>Docs</ExtLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup steps with commands */}
          {guide.setupSteps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Setup commands</p>
              <div className="space-y-3">
                {guide.setupSteps.map((s, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-ink mb-1">{s.step}. {s.title}</p>
                    {s.command && <CodeLine cmd={s.command} />}
                    {!s.command && <p className="text-xs text-ink3">{s.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key files */}
          {guide.keyFiles?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Key files</p>
              <div className="space-y-1.5">
                {guide.keyFiles.map((f, i) => (
                  <div key={i} className="p-2.5 bg-surface2 border border-border rounded-forge">
                    <code className="text-xs font-mono text-ink">{f.path}</code>
                    <p className="text-xs text-ink3 mt-0.5">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deploy */}
          {guide.deploySteps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Deploy steps</p>
              <div className="space-y-2">
                {guide.deploySteps.map((s, i) => (
                  <div key={i} className="p-3 bg-surface2 border border-border rounded-forge">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-ink">{i + 1}. {s.title}</p>
                      {s.link && <ExtLink href={s.link}>Open →</ExtLink>}
                    </div>
                    <p className="text-xs text-ink3">{s.description}</p>
                    {s.command && <div className="mt-2"><CodeLine cmd={s.command} /></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Collapse>

      {/* Next step */}
      <NextStepBar href="/dashboard/checks" label="API Keys" description="Set up the services your project needs" />
    </div>
  )
}

// ─── Invention track ──────────────────────────────────────────────────────────

function InventionGuide({
  guide, idea,
}: {
  guide: BuildGuide
  idea: IdeaAnalysis | null
}) {
  const [ordered, setOrdered] = useState<Record<string, boolean>>({})
  const [milestones, setMilestones] = useState<Record<string, boolean>>({})
  const toggleOrdered = (k: string) => setOrdered(p => ({ ...p, [k]: !p[k] }))
  const toggleMilestone = (k: string) => setMilestones(p => ({ ...p, [k]: !p[k] }))

  const actionPlan = idea?.actionPlan ?? []
  const doneCount = Object.values(milestones).filter(Boolean).length

  function supplierLinks(name: string) {
    const q = encodeURIComponent(name)
    return [
      { label: 'Amazon', href: `https://www.amazon.com/s?k=${q}` },
      { label: 'Digikey', href: `https://www.digikey.com/en/products/filter?terms=${q}` },
      { label: 'Mouser', href: `https://www.mouser.com/c/?q=${q}` },
    ]
  }

  const estimatedTotal = guide.stack
    ?.map(s => {
      const m = s.cost?.match(/\$(\d[\d,]*)/)?.[1]?.replace(',', '')
      return m ? parseFloat(m) : 0
    })
    .reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">

      {/* Materials kit */}
      <div className="bg-surface border border-border rounded-forge overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-medium text-ink">Materials & suppliers</p>
          </div>
          {estimatedTotal > 0 && (
            <span className="text-xs font-medium text-ink2">
              Est. ${estimatedTotal.toLocaleString()}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          {(guide.stack ?? []).map((item, i) => (
            <div key={i} className={cn(
              'p-3 border rounded-forge transition-colors',
              ordered[`item-${i}`] ? 'bg-surface border-green-border' : 'bg-surface2 border-border'
            )}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleOrdered(`item-${i}`)}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    ordered[`item-${i}`] ? 'bg-green border-green' : 'border-border2 bg-surface'
                  )}
                >
                  {ordered[`item-${i}`] && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 16 16">
                      <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className={cn('text-sm font-medium', ordered[`item-${i}`] ? 'line-through text-ink3' : 'text-ink')}>{item.name}</p>
                    <span className="tag tag-gray">{item.role}</span>
                    {item.cost && <span className="text-xs text-ink3 font-medium">{item.cost}</span>}
                  </div>
                  <p className="text-xs text-ink3 mb-2">{item.why}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-ink4">Buy from:</span>
                    {supplierLinks(item.name).map(l => (
                      <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue hover:opacity-70 underline underline-offset-2">{l.label}</a>
                    ))}
                    <ExtLink href={item.link}>Manufacturer →</ExtLink>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-ink4 pt-1">
            Tip: check <ExtLink href="https://www.alibaba.com">Alibaba</ExtLink> for bulk pricing once you&apos;re past prototype stage.
          </p>
        </div>
      </div>

      {/* Prototype planner */}
      {actionPlan.length > 0 && (
        <div className="bg-surface border border-border rounded-forge overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-sm font-medium text-ink">Prototype milestones</p>
            </div>
            <span className="text-xs text-ink4">{doneCount} / {actionPlan.length}</span>
          </div>
          <div className="p-4 space-y-2">
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-green rounded-full transition-all duration-500"
                style={{ width: `${actionPlan.length ? (doneCount / actionPlan.length) * 100 : 0}%` }}
              />
            </div>
            {actionPlan.map((step, i) => (
              <CheckRow
                key={i}
                label={`${step.step}. ${step.title}`}
                sub={step.description}
                time={step.timeEstimate}
                href={step.link}
                checked={!!milestones[`m-${i}`]}
                onToggle={() => toggleMilestone(`m-${i}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reference */}
      <Collapse icon="📖" title="Reference">
        <div className="space-y-4 pt-1">
          {guide.keyFiles?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Key designs & documents</p>
              <div className="space-y-1.5">
                {guide.keyFiles.map((f, i) => (
                  <div key={i} className="p-2.5 bg-surface2 border border-border rounded-forge">
                    <p className="text-xs font-medium text-ink">{f.path}</p>
                    <p className="text-xs text-ink3 mt-0.5">{f.description}</p>
                    {f.hint && <p className="text-xs text-ink4 italic mt-1">💡 {f.hint}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {guide.deploySteps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Manufacturing steps</p>
              <div className="space-y-2">
                {guide.deploySteps.map((s, i) => (
                  <div key={i} className="p-3 bg-surface2 border border-border rounded-forge">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-ink">{i + 1}. {s.title}</p>
                      {s.link && <ExtLink href={s.link}>Open →</ExtLink>}
                    </div>
                    <p className="text-xs text-ink3">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {guide.vsCodeExtensions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Useful resources</p>
              <div className="space-y-2">
                {guide.vsCodeExtensions.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface2 border border-border rounded-forge">
                    <div>
                      <p className="text-xs font-medium text-ink mb-0.5">{r.name}</p>
                      <p className="text-xs text-ink3">{r.why}</p>
                    </div>
                    <ExtLink href={r.link}>Open →</ExtLink>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  )
}

// ─── Business track ───────────────────────────────────────────────────────────

function BusinessGuide({
  guide, idea,
}: {
  guide: BuildGuide
  idea: IdeaAnalysis | null
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setChecked(p => ({ ...p, [k]: !p[k] }))

  const setupItems = [
    ...(guide.prerequisites ?? []).map((p, i) => ({
      id: `pre-${i}`, label: p.title, sub: p.description, href: p.link, time: p.timeEstimate,
    })),
    ...(guide.setupSteps ?? []).map((s, i) => ({
      id: `setup-${i}`, label: s.title, sub: s.description, href: s.link, time: s.timeEstimate,
    })),
  ]

  const launchItems = (guide.deploySteps ?? []).map((s, i) => ({
    id: `launch-${i}`, label: s.title, sub: s.description, href: s.link, time: s.timeEstimate,
  }))

  const setupDone = setupItems.filter(i => checked[i.id]).length
  const launchDone = launchItems.filter(i => checked[i.id]).length

  return (
    <div className="space-y-4">

      {/* Setup checklist */}
      <div className="bg-surface border border-border rounded-forge overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-medium text-ink">Setup checklist</p>
          </div>
          <span className="text-xs text-ink4">{setupDone} / {setupItems.length}</span>
        </div>
        <div className="p-4 space-y-2">
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-green rounded-full transition-all duration-500"
              style={{ width: `${setupItems.length ? (setupDone / setupItems.length) * 100 : 0}%` }}
            />
          </div>
          {setupItems.map(item => (
            <CheckRow key={item.id} {...item} checked={!!checked[item.id]} onToggle={() => toggle(item.id)} />
          ))}
        </div>
      </div>

      {/* Tools */}
      {(guide.stack ?? []).length > 0 && (
        <div className="bg-surface border border-border rounded-forge overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-medium text-ink">Tools to set up</p>
          </div>
          <div className="p-4 space-y-2">
            {(guide.stack ?? []).map((tool, i) => (
              <div key={i} className={cn(
                'p-3 border rounded-forge transition-colors',
                checked[`tool-${i}`] ? 'bg-surface border-green-border' : 'bg-surface2 border-border'
              )}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(`tool-${i}`)}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                      checked[`tool-${i}`] ? 'bg-green border-green' : 'border-border2 bg-surface'
                    )}
                  >
                    {checked[`tool-${i}`] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 16 16">
                        <path d="M3.5 8l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className={cn('text-sm font-medium', checked[`tool-${i}`] ? 'line-through text-ink3' : 'text-ink')}>{tool.name}</p>
                      <span className="tag tag-gray">{tool.role}</span>
                      <span className="text-xs text-ink3">{tool.cost}</span>
                    </div>
                    <p className="text-xs text-ink3 mb-1.5">{tool.why}</p>
                    <div className="flex items-center gap-3">
                      <ExtLink href={tool.link}>Sign up →</ExtLink>
                      <ExtLink href={tool.docsLink}>Docs</ExtLink>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Launch plan */}
      {launchItems.length > 0 && (
        <div className="bg-surface border border-border rounded-forge overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p className="text-sm font-medium text-ink">Launch plan</p>
            </div>
            <span className="text-xs text-ink4">{launchDone} / {launchItems.length}</span>
          </div>
          <div className="p-4 space-y-2">
            {launchItems.map(item => (
              <CheckRow key={item.id} {...item} checked={!!checked[item.id]} onToggle={() => toggle(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Reference */}
      <Collapse icon="📖" title="Reference">
        <div className="space-y-4 pt-1">
          {guide.keyFiles?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Key documents</p>
              <div className="space-y-1.5">
                {guide.keyFiles.map((f, i) => (
                  <div key={i} className="p-2.5 bg-surface2 border border-border rounded-forge">
                    <p className="text-xs font-medium text-ink">{f.path}</p>
                    <p className="text-xs text-ink3 mt-0.5">{f.description}</p>
                    {f.hint && <p className="text-xs text-ink4 italic mt-1">💡 {f.hint}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {guide.vsCodeExtensions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink3 mb-2">Useful resources</p>
              <div className="space-y-2">
                {guide.vsCodeExtensions.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface2 border border-border rounded-forge">
                    <div>
                      <p className="text-xs font-medium text-ink mb-0.5">{r.name}</p>
                      <p className="text-xs text-ink3">{r.why}</p>
                    </div>
                    <ExtLink href={r.link}>Open →</ExtLink>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Collapse>

      {/* Next step */}
      <NextStepBar href="/dashboard/checks" label="Tools & Accounts" description="Set up accounts for your business tools" />
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function BuildGuidePage() {
  const { activeProject } = useProject()
  const { skillLevel } = useProfile()
  const { result: guide, loading, pending, error, regenerate } = useProjectAnalysis<BuildGuide>('buildguide')
  const { result: idea } = useProjectAnalysis<IdeaAnalysis>('idea')

  const track = activeProject?.track ?? 'software'

  const handleRegenerate = () => {
    if (!activeProject) return
    regenerate({ idea: activeProject.idea, track: activeProject.track, skillLevel: skillLevel ?? 'intermediate' })
  }

  const titles = {
    software: { title: 'Build Guide', subtitle: 'Create, code, ship' },
    invention: { title: 'Build Guide', subtitle: 'Source, prototype, manufacture' },
    business: { title: 'Build Guide', subtitle: 'Set up, connect, launch' },
  }
  const { title, subtitle } = titles[track] ?? titles.software

  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-5 max-w-3xl mx-auto">
        <PageExplainer
          storageKey="build-guide"
          text="A step-by-step guide tailored to your project and track. Software builders get a GitHub scaffold, Claude Code prompts, and a deploy path. Inventors get a materials kit and prototype planner. Business builders get a setup checklist and launch plan."
        />

        {!activeProject && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">🛠️</div>
            <p className="text-sm font-medium text-ink mb-1">No project selected</p>
            <p className="text-xs text-ink4 max-w-xs">Select a project from the sidebar. Your build guide appears automatically after you run Idea Lab.</p>
          </div>
        )}

        {activeProject && (loading || pending) && !guide && (
          <div className="bg-surface border border-border rounded-forge p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-ink3">Building your guide...</p>
            </div>
            <div className="space-y-2">
              {[65, 45, 80, 55].map((w, i) => (
                <div key={i} className="shimmer-bar rounded" style={{ height: 12, width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}

        {activeProject && !loading && !pending && !guide && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center mb-4 text-xl">🛠️</div>
            <p className="text-sm font-medium text-ink mb-1">No build guide yet</p>
            <p className="text-xs text-ink4 max-w-xs mb-4">Run Idea Lab first and this populates automatically.</p>
            <button onClick={handleRegenerate}
              className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors">
              Run now
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-bg border border-red-border rounded-forge text-sm text-red">{error}</div>
        )}

        {guide && (
          <div className="animate-fadeUp space-y-4">
            {/* Project header */}
            <div className="bg-surface border border-border rounded-forge p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-ink">{guide.title}</h2>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-ink4">Est. time</p>
                    <p className="text-xs font-semibold text-ink">{guide.estimatedTime}</p>
                  </div>
                </div>
                <p className="text-xs text-ink3 leading-relaxed">{guide.overview}</p>
                {guide.estimatedMonthlyCost && (
                  <p className="text-[11px] text-ink4 leading-relaxed border-l-2 border-border pl-2">{guide.estimatedMonthlyCost}/mo</p>
                )}
              </div>
              {guide.firstMilestone && (
                <div className="mt-3 px-3 py-2 bg-surface2 border border-border rounded-forge">
                  <span className="text-[10px] text-ink4">First milestone · </span>
                  <span className="text-xs text-ink">{guide.firstMilestone}</span>
                </div>
              )}
              <button onClick={handleRegenerate}
                className="mt-3 text-xs text-ink4 hover:text-ink transition-colors underline underline-offset-2">
                Regenerate
              </button>
            </div>

            {/* Track-specific content */}
            {track === 'software' && (
              <SoftwareGuide guide={guide} idea={idea} activeProject={activeProject} />
            )}
            {track === 'invention' && (
              <InventionGuide guide={guide} idea={idea} />
            )}
            {track === 'business' && (
              <BusinessGuide guide={guide} idea={idea} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
