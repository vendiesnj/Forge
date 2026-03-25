'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { GithubRepoModal } from '@/components/github-repo-modal'
import { NewProjectModal } from '@/components/new-project-modal'
import { useState } from 'react'

const getStageNav = (stage: 'idea' | 'building' | 'built' | null) => {
  if (stage === null) {
    return []
  }

  if (stage === 'idea') {
    return [
      {
        section: 'Project',
        items: [
          { label: 'Overview', href: '/dashboard/overview' },
          { label: 'Idea Analysis', href: '/dashboard/idea-lab' },
          { label: 'Market Research', href: '/dashboard/market' },
          { label: 'Keys & Services', href: '/dashboard/checks' },
        ],
      },
      {
        section: 'Build',
        items: [
          { label: 'Build Guide', href: '/dashboard/build-guide' },
          { label: 'UI Customize', href: '/dashboard/ui-customize' },
          { label: 'UX Audit', href: '/dashboard/ux-audit' },
        ],
      },
      {
        section: 'Launch',
        items: [
          { label: 'Distribution', href: '/dashboard/distribution' },
          { label: 'Market Gaps', href: '/dashboard/gaps' },
          { label: 'Marketplace', href: '/dashboard/marketplace' },
          { label: 'My Profile', href: '/dashboard/profile' },
          { label: 'Messages', href: '/dashboard/messages' },
          { label: 'Escrow', href: '/dashboard/escrow' },
          { label: 'Billing', href: '/dashboard/billing' },
        ],
      },
    ]
  }

  if (stage === 'building') {
    return [
      {
        section: 'Project',
        items: [
          { label: 'Overview', href: '/dashboard/overview' },
          { label: 'Code & Features', href: '/dashboard/features' },
          { label: 'Keys & Services', href: '/dashboard/checks' },
          { label: 'Market Research', href: '/dashboard/market' },
        ],
      },
      {
        section: 'Build',
        items: [
          { label: 'Build Guide', href: '/dashboard/build-guide' },
          { label: 'Feature Suggestions', href: '/dashboard/feature-suggestions' },
          { label: 'UI Customize', href: '/dashboard/ui-customize' },
          { label: 'UX Audit', href: '/dashboard/ux-audit' },
          { label: 'Build Requests', href: '/dashboard/requests' },
        ],
      },
      {
        section: 'Launch',
        items: [
          { label: 'Distribution', href: '/dashboard/distribution' },
          { label: 'Marketplace', href: '/dashboard/marketplace' },
          { label: 'My Profile', href: '/dashboard/profile' },
          { label: 'Messages', href: '/dashboard/messages' },
          { label: 'Escrow', href: '/dashboard/escrow' },
          { label: 'Billing', href: '/dashboard/billing' },
        ],
      },
    ]
  }

  // stage === 'built'
  return [
    {
      section: 'Your App',
      items: [
        { label: 'Overview', href: '/dashboard/overview' },
        { label: 'Code & Features', href: '/dashboard/features' },
        { label: 'Keys & Services', href: '/dashboard/checks' },
        { label: 'Market Research', href: '/dashboard/market' },
      ],
    },
    {
      section: 'Build',
      items: [
        { label: 'Build Guide', href: '/dashboard/build-guide' },
        { label: 'Feature Suggestions', href: '/dashboard/feature-suggestions' },
        { label: 'UI Customize', href: '/dashboard/ui-customize' },
        { label: 'UX Audit', href: '/dashboard/ux-audit' },
      ],
    },
    {
      section: 'Monetize',
      items: [
        { label: 'List Your App', href: '/dashboard/marketplace' },
        { label: 'Products', href: '/dashboard/products' },
        { label: 'Browse Marketplace', href: '/dashboard/marketplace/browse' },
        { label: 'Escrow', href: '/dashboard/escrow' },
        { label: 'Billing', href: '/dashboard/billing' },
      ],
    },
    {
      section: 'Grow',
      items: [
        { label: 'Distribution', href: '/dashboard/distribution' },
        { label: 'Analytics', href: '/dashboard/analytics' },
        { label: 'My Profile', href: '/dashboard/profile' },
        { label: 'Messages', href: '/dashboard/messages' },
        { label: 'Escrow', href: '/dashboard/escrow' },
      ],
    },
  ]
}

// All pages list (for "More" section)
const ALL_PAGES = [
  { label: 'Overview', href: '/dashboard/overview' },
  { label: 'Idea Lab', href: '/dashboard/idea-lab' },
  { label: 'Market Analysis', href: '/dashboard/market' },
  { label: 'Build Guide', href: '/dashboard/build-guide' },
  { label: 'Keys & Services', href: '/dashboard/checks' },
  { label: 'Features', href: '/dashboard/features' },
  { label: 'Distribution', href: '/dashboard/distribution' },
  { label: 'Market Gaps', href: '/dashboard/gaps' },
  { label: 'Forge Marketplace', href: '/dashboard/marketplace' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Patents & IP', href: '/dashboard/patents' },
  { label: 'Acquire', href: '/dashboard/acquire' },
  { label: 'Build Requests', href: '/dashboard/requests' },
  { label: 'Feature Suggestions', href: '/dashboard/feature-suggestions' },
  { label: 'UI Customize', href: '/dashboard/ui-customize' },
  { label: 'UX Audit', href: '/dashboard/ux-audit' },
  { label: 'Security', href: '/dashboard/security' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'My Profile', href: '/dashboard/profile' },
  { label: 'Messages', href: '/dashboard/messages' },
  { label: 'Escrow', href: '/dashboard/escrow' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { projects, activeProject, setActiveProject, refreshProjects, markStepComplete } = useProject()
  const { github, vercel, loading: integrationsLoading, refresh: refreshIntegrations } = useIntegrations()
  const [showRepoModal, setShowRepoModal] = useState(false)
  const [showVercelInput, setShowVercelInput] = useState(false)
  const [vercelToken, setVercelToken] = useState('')
  const [vercelSaving, setVercelSaving] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  const stage = activeProject?.stage ?? null
  const stageNav = getStageNav(stage)

  const handleConnectGithub = () => {
    const projectParam = activeProject ? `&project=${activeProject.id}` : ''
    window.open(`/api/auth/github?popup=true${projectParam}`, 'github-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes')
    const ch = new BroadcastChannel('forge-oauth')
    ch.onmessage = async (e) => {
      if (e.data?.type === 'oauth-success' && e.data?.provider === 'github') {
        await refreshIntegrations()
        // Mark step on the project that initiated the connect, not whatever is active now
        const targetProjectId = e.data?.projectId || activeProject?.id
        if (targetProjectId) {
          await fetch(`/api/projects/${targetProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 'keys_generated' }),
          })
          await refreshProjects()
        }
        ch.close()
      }
    }
  }

  const handleVercelSave = async () => {
    if (!vercelToken.trim()) return
    setVercelSaving(true)
    try {
      const res = await fetch('/api/auth/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: vercelToken }),
      })
      if (res.ok) {
        setVercelToken('')
        setShowVercelInput(false)
        await refreshIntegrations()
        markStepComplete('keys_generated')
      }
    } finally {
      setVercelSaving(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    setDeleting(true)
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (activeProject?.id === projectId) {
        setActiveProject(null)
        router.push('/dashboard')
      }
      await refreshProjects()
    } finally {
      setDeleting(false)
      setContextMenu(null)
    }
  }

  return (
    <>
    <aside className="fixed left-0 top-0 h-screen w-[200px] bg-surface border-r border-border flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
        <div className="w-6 h-6 bg-ink rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">F</span>
        </div>
        <span className="text-sm font-semibold text-ink">Forge</span>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="border-b border-border px-4 py-3 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">Projects</p>
          <div className="space-y-0.5">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, projectId: p.id })
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-forge text-xs transition-colors text-left',
                  activeProject?.id === p.id
                    ? 'bg-ink text-white'
                    : 'text-ink3 hover:text-ink hover:bg-surface2'
                )}
              >
                <span className="shrink-0">
                  {p.track === 'software' ? '💻' : p.track === 'invention' ? '⚙️' : '🏢'}
                </span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
          {activeProject && (
            <button
              onClick={() => setActiveProject(null)}
              className="mt-1.5 text-[10px] text-ink4 hover:text-ink3 transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* GitHub repo link for active project */}
      {activeProject && github && (
        <div className="border-b border-border px-4 py-2 shrink-0">
          {activeProject?.github_repo ? (
                <a
                  href={`https://github.com/${activeProject.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-ink3 hover:text-ink transition-colors"
                >
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  {activeProject.github_repo}
                </a>
              ) : (
                <button
                  onClick={() => setShowRepoModal(true)}
                  className="flex items-center gap-1.5 text-[10px] text-ink4 hover:text-ink transition-colors"
                >
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Link GitHub repo
                </button>
          )}
        </div>
      )}

      {showRepoModal && (
        <GithubRepoModal onClose={() => setShowRepoModal(false)} />
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {stage === null ? (
          <div className="mb-4">
            <Link
              href="/dashboard/marketplace/browse"
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                pathname === '/dashboard/marketplace/browse' || pathname.startsWith('/dashboard/marketplace/browse/')
                  ? 'text-ink bg-surface2 font-medium'
                  : 'text-ink3 hover:text-ink hover:bg-surface2'
              )}
            >
              <span>Browse Marketplace</span>
            </Link>
            <div className="px-4 mt-3">
              <button
                onClick={() => setShowNewModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-ink text-white rounded-forge text-xs font-medium hover:bg-ink2 transition-colors"
              >
                <span>+</span> New Project
              </button>
            </div>
          </div>
        ) : (
          stageNav.map((section) => (
            <div key={section.section} className="mb-4">
              <div className="px-4 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink4">
                  {section.section}
                </span>
              </div>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'text-ink bg-surface2 font-medium'
                        : 'text-ink3 hover:text-ink hover:bg-surface2'
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))
        )}

        {/* More / All pages */}
        <div className="mb-4">
          <button
            onClick={() => setShowMore(v => !v)}
            className="flex items-center gap-2 px-4 py-1.5 w-full text-left"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink4">
              {showMore ? '▾ Less' : '▸ All tools'}
            </span>
          </button>
          {showMore && ALL_PAGES.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'text-ink bg-surface2 font-medium'
                    : 'text-ink3 hover:text-ink hover:bg-surface2'
                )}
              >
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* New project button */}
        <div className="px-4 mt-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-border rounded-forge text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors"
          >
            <span>+</span> New project
          </button>
        </div>
      </nav>

      {/* Integrations */}
      {!integrationsLoading && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink4 mb-2">Integrations</p>
          <div className="space-y-1.5">
            {/* GitHub */}
            {github ? (
              <div className="flex items-center gap-2 px-2 py-1.5">
                {github.meta?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={github.meta.avatar_url} alt="" className="w-4 h-4 rounded-full shrink-0" />
                )}
                <span className="text-xs text-ink3 truncate">@{github.meta?.login}</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="GitHub connected" />
              </div>
            ) : (
              <button
                onClick={handleConnectGithub}
                className="flex items-center gap-2 px-2 py-1.5 rounded-forge border border-border text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors w-full"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                Connect GitHub
              </button>
            )}

            {/* Vercel */}
            {vercel ? (
              <div className="flex items-center gap-2 px-2 py-1.5">
                <svg className="w-3.5 h-3.5 shrink-0 text-ink3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L24 22H0L12 1z" />
                </svg>
                <span className="text-xs text-ink3 truncate">{vercel.meta?.username ?? 'Vercel'}</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Vercel connected" />
              </div>
            ) : showVercelInput ? (
              <div className="space-y-1.5">
                <input
                  value={vercelToken}
                  onChange={e => setVercelToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVercelSave()}
                  placeholder="Paste token..."
                  type="password"
                  className="w-full text-xs bg-surface2 border border-border rounded-forge px-2 py-1.5 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleVercelSave}
                    disabled={vercelSaving || !vercelToken.trim()}
                    className="flex-1 py-1 bg-ink text-white text-[10px] font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
                  >
                    {vercelSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setShowVercelInput(false); setVercelToken('') }}
                    className="flex-1 py-1 border border-border text-[10px] text-ink4 rounded-forge hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[10px] text-ink4 hover:text-ink3 transition-colors"
                >
                  Get token at vercel.com/account/tokens →
                </a>
              </div>
            ) : (
              <button
                onClick={() => setShowVercelInput(true)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-forge border border-border text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors w-full"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L24 22H0L12 1z" />
                </svg>
                Connect Vercel
              </button>
            )}
          </div>
        </div>
      )}

      {/* User */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        <UserButton
          appearance={{
            elements: {
              userButtonBox: 'flex items-center gap-2',
              userButtonTrigger: 'focus:shadow-none',
            },
          }}
        />
        <Link
          href="/org"
          className="block text-[10px] text-ink4 hover:text-ink3 transition-colors"
        >
          Switch to Org view →
        </Link>
      </div>
    </aside>

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-surface border border-border rounded-forge shadow-lg py-1 min-w-[140px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => handleDeleteProject(contextMenu.projectId)}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red hover:bg-surface2 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? 'Deleting...' : 'Delete project'}
            </button>
          </div>
        </>
      )}

      {/* New project modal */}
      {showNewModal && (
        <NewProjectModal onClose={() => setShowNewModal(false)} />
      )}
    </>
  )
}
