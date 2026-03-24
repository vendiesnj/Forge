'use client'

import { useState, useEffect } from 'react'
import { useProject } from '@/components/project-context'
import { useIntegrations } from '@/components/integrations-context'
import { cn } from '@/lib/utils'

interface Repo {
  id: number
  name: string
  full_name: string
  url: string
  private: boolean
  description: string
}

interface GithubRepoModalProps {
  onClose: () => void
}

export function GithubRepoModal({ onClose }: GithubRepoModalProps) {
  const { activeProject, refreshProjects } = useProject()
  const { github } = useIntegrations()

  const [tab, setTab] = useState<'link' | 'create'>('link')
  const [repos, setRepos] = useState<Repo[]>([])
  const [reposLoading, setReposLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Repo | null>(null)
  const [newName, setNewName] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/github/repos')
      .then(r => r.json())
      .then(d => setRepos(d.repos ?? []))
      .finally(() => setReposLoading(false))
  }, [])

  // Suggest a repo name from project name
  useEffect(() => {
    if (activeProject?.name) {
      setNewName(activeProject.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }, [activeProject])

  const filtered = repos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleLink = async () => {
    if (!activeProject || !selected) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id, repoFullName: selected.full_name, repoUrl: selected.url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await refreshProjects()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link repo')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!activeProject || !newName.trim()) return
    setSaving(true)
    setError('')
    try {
      // Create repo
      const createRes = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: activeProject.idea?.slice(0, 100), isPrivate }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error)

      // Link it to project
      await fetch('/api/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id, repoFullName: createData.repo.full_name }),
      })
      await refreshProjects()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface border border-border rounded-forge w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-ink">Connect GitHub Repo</h2>
            {activeProject && (
              <p className="text-xs text-ink4 mt-0.5">{activeProject.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-ink4 hover:text-ink transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['link', 'create'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium transition-colors',
                tab === t ? 'text-ink border-b-2 border-ink -mb-px' : 'text-ink4 hover:text-ink'
              )}
            >
              {t === 'link' ? 'Link Existing Repo' : 'Create New Repo'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'link' ? (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="w-full text-xs bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 mb-3"
              />
              <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                {reposLoading ? (
                  <p className="text-xs text-ink4 text-center py-4">Loading repos...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-ink4 text-center py-4">No repos found</p>
                ) : filtered.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => setSelected(selected?.id === repo.id ? null : repo)}
                    className={cn(
                      'w-full flex items-start gap-2.5 p-2.5 rounded-forge border text-left transition-colors',
                      selected?.id === repo.id
                        ? 'border-ink bg-surface2'
                        : 'border-border hover:border-border2 hover:bg-surface2'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{repo.full_name}</p>
                      {repo.description && (
                        <p className="text-[10px] text-ink4 truncate mt-0.5">{repo.description}</p>
                      )}
                    </div>
                    <span className="tag tag-gray shrink-0">{repo.private ? 'private' : 'public'}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleLink}
                disabled={!selected || saving}
                className="mt-4 w-full py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
              >
                {saving ? 'Linking...' : 'Link Repo'}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Repository name</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-ink4">{github?.meta?.login}/</span>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                      placeholder="my-project"
                      className="flex-1 text-xs bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs text-ink3">Make repository private</span>
                </label>
              </div>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="mt-4 w-full py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create & Link Repo'}
              </button>
            </>
          )}

          {error && (
            <p className="mt-3 text-xs text-red">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
