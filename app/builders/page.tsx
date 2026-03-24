'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Builder {
  id: string
  username: string
  bio: string | null
  skills: string[]
  available_for_work: boolean
  project_count: number
}

function SkillPill({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-surface2 text-ink3 border border-border">
      {skill}
    </span>
  )
}

function AvailableBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
      Available
    </span>
  )
}

function BuilderCard({ builder }: { builder: Builder }) {
  const initial = (builder.username?.[0] ?? '?').toUpperCase()

  return (
    <Link
      href={`/builders/${builder.username}`}
      className="block bg-surface border border-border rounded-forge p-5 hover:border-border2 transition-colors group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-forge bg-surface2 border border-border flex items-center justify-center shrink-0 text-sm font-semibold text-ink group-hover:bg-ink group-hover:text-white transition-colors">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink">@{builder.username}</span>
            {builder.available_for_work && <AvailableBadge />}
          </div>
          {builder.bio && (
            <p className="text-xs text-ink3 mt-0.5 line-clamp-2">{builder.bio}</p>
          )}
        </div>
      </div>

      {builder.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {builder.skills.slice(0, 5).map((skill) => (
            <SkillPill key={skill} skill={skill} />
          ))}
          {builder.skills.length > 5 && (
            <span className="text-[11px] text-ink4">+{builder.skills.length - 5} more</span>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink4">
        {builder.project_count === 0
          ? 'No public projects'
          : builder.project_count === 1
          ? '1 public project'
          : `${builder.project_count} public projects`}
      </p>
    </Link>
  )
}

export default function BuildersPage() {
  const [builders, setBuilders] = useState<Builder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  useEffect(() => {
    fetch('/api/builders')
      .then((r) => r.json())
      .then((d) => setBuilders(d.builders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = builders.filter((b) => {
    if (availableOnly && !b.available_for_work) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      b.username?.toLowerCase().includes(q) ||
      b.bio?.toLowerCase().includes(q) ||
      b.skills.some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-surface2">
      {/* Nav */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ink rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-ink">Forge</span>
          </Link>
          <Link
            href="/sign-in"
            className="text-xs text-ink3 hover:text-ink transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink mb-1">Browse Builders</h1>
          <p className="text-sm text-ink3">Discover builders working on projects and available for opportunities.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, skill, or bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-forge px-3 py-2 text-sm text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
          <button
            onClick={() => setAvailableOnly((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-forge border text-sm font-medium transition-colors whitespace-nowrap ${
              availableOnly
                ? 'bg-ink text-white border-ink'
                : 'bg-surface border-border text-ink3 hover:text-ink hover:border-border2'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            Available now
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-forge p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink3 text-sm">No builders found.</p>
            {(search || availableOnly) && (
              <button
                onClick={() => { setSearch(''); setAvailableOnly(false) }}
                className="mt-2 text-xs text-ink4 hover:text-ink3 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((builder) => (
              <BuilderCard key={builder.id} builder={builder} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
