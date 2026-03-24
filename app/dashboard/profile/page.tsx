'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/topbar'

interface Project {
  id: string
  name: string
  track: string
  stage: string
  is_public: boolean
}

interface Profile {
  username: string | null
  bio: string | null
  skills: string[]
  available_for_work: boolean
  website_url: string | null
  github_username: string | null
}

const TRACK_ICONS: Record<string, string> = {
  software: '💻',
  invention: '⚙️',
  business: '🏢',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    username: '',
    bio: '',
    skills: [],
    available_for_work: false,
    website_url: '',
    github_username: '',
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [skillsInput, setSkillsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ])
      .then(([profileData, projectsData]) => {
        const p = profileData.profile ?? {}
        setProfile({
          username: p.username ?? '',
          bio: p.bio ?? '',
          skills: p.skills ?? [],
          available_for_work: p.available_for_work ?? false,
          website_url: p.website_url ?? '',
          github_username: p.github_username ?? '',
        })
        setSkillsInput((p.skills ?? []).join(', '))
        const rawProjects: Array<{ id: string; name: string; track: string; stage: string; is_public?: boolean }> = projectsData.projects ?? []
        setProjects(
          rawProjects.map((proj) => ({
            ...proj,
            is_public: proj.is_public ?? false,
          }))
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, skills }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setProfile((prev) => ({ ...prev, skills }))
      setSkillsInput(skills.join(', '))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const toggleProjectPublic = async (projectId: string, currentValue: boolean) => {
    const newValue = !currentValue
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, is_public: newValue } : p))
    )
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: newValue }),
      })
    } catch {
      // Revert on failure
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, is_public: currentValue } : p))
      )
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Topbar title="My Profile" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="My Profile" subtitle="Public builder profile" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

          {/* Identity */}
          <section className="bg-surface border border-border rounded-forge p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                  placeholder="your-handle"
                  className="w-full bg-surface2 border border-border rounded-forge px-3 py-2 text-sm text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
                <p className="text-[11px] text-ink4 mt-1">
                  Your public URL will be forge.so/builders/{profile.username || 'your-handle'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink3 mb-1.5">
                  Bio
                </label>
                <textarea
                  value={profile.bio ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="A short description of what you build..."
                  rows={3}
                  className="w-full bg-surface2 border border-border rounded-forge px-3 py-2 text-sm text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink3 mb-1.5">
                  Skills
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="React, Node.js, Supabase, ..."
                  className="w-full bg-surface2 border border-border rounded-forge px-3 py-2 text-sm text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
                <p className="text-[11px] text-ink4 mt-1">Comma-separated list of skills</p>
                {skillsInput.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skillsInput.split(',').map((s) => s.trim()).filter(Boolean).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-surface2 text-ink3 border border-border"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Links */}
          <section className="bg-surface border border-border rounded-forge p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Links</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  value={profile.website_url ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://yoursite.com"
                  className="w-full bg-surface2 border border-border rounded-forge px-3 py-2 text-sm text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1.5">
                  GitHub Username
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink4 shrink-0">github.com/</span>
                  <input
                    type="text"
                    value={profile.github_username ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, github_username: e.target.value }))}
                    placeholder="your-username"
                    className="flex-1 bg-surface2 border border-border rounded-forge px-3 py-2 text-sm text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Availability */}
          <section className="bg-surface border border-border rounded-forge p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">Available for Opportunities</h2>
                <p className="text-xs text-ink3 mt-1">
                  Show a green badge on your profile indicating you&apos;re open to freelance work,
                  collaborations, or job opportunities. Other builders and orgs can see this.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={profile.available_for_work}
                onClick={() =>
                  setProfile((p) => ({ ...p, available_for_work: !p.available_for_work }))
                }
                className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  profile.available_for_work ? 'bg-green-500' : 'bg-surface2 border border-border'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    profile.available_for_work ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {profile.available_for_work && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                Available badge is showing on your profile
              </div>
            )}
          </section>

          {/* Projects visibility */}
          {projects.length > 0 && (
            <section className="bg-surface border border-border rounded-forge p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-ink">Project Visibility</h2>
                <p className="text-xs text-ink3 mt-1">
                  Choose which projects appear on your public profile.
                </p>
              </div>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-3 py-2.5 px-3 bg-surface2 rounded-forge border border-border"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 text-base">
                        {TRACK_ICONS[project.track] ?? '📦'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-ink font-medium truncate">{project.name}</p>
                        <p className="text-[11px] text-ink4 capitalize">{project.stage}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-ink4">
                        {project.is_public ? 'Public' : 'Private'}
                      </span>
                      <button
                        role="switch"
                        aria-checked={project.is_public}
                        onClick={() => toggleProjectPublic(project.id, project.is_public)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          project.is_public ? 'bg-ink' : 'bg-surface border border-border'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            project.is_public ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Save */}
          <div className="flex items-center justify-between pb-8">
            <div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {saved && <p className="text-xs text-green-600">Profile saved.</p>}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
