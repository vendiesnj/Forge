'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

interface Props {
  onSelect: (project: Project) => void
  selectedId?: string
}

export function ProjectSelector({ onSelect, selectedId }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || projects.length === 0) return null

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-ink3 mb-2">Load from project</p>
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-forge border text-xs font-medium transition-all',
              selectedId === p.id
                ? 'border-ink bg-ink text-white'
                : 'border-border bg-surface text-ink2 hover:border-border2'
            )}
          >
            <span>{p.track === 'software' ? '💻' : p.track === 'invention' ? '⚙️' : '🏢'}</span>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}
