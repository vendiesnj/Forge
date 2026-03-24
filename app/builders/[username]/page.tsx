import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PublicProject {
  id: string
  name: string
  idea: string
  stage: string
  track: string
}

interface BuilderProfile {
  id: string
  username: string
  bio: string | null
  skills: string[]
  available_for_work: boolean
  website_url: string | null
  github_username: string | null
  projects: PublicProject[]
}

const TRACK_ICONS: Record<string, string> = {
  software: '💻',
  invention: '⚙️',
  business: '🏢',
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea',
  building: 'Building',
  built: 'Built',
}

async function getBuilder(username: string): Promise<BuilderProfile | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/builders/${username}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.builder ?? null
}

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const builder = await getBuilder(username)

  if (!builder) notFound()

  return (
    <div className="min-h-screen bg-surface2">
      {/* Nav */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ink rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-ink">Forge</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/builders"
              className="text-xs text-ink3 hover:text-ink transition-colors"
            >
              ← All builders
            </Link>
            <Link
              href="/sign-in"
              className="text-xs text-ink3 hover:text-ink transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Profile header */}
        <div className="bg-surface border border-border rounded-forge p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-forge bg-surface2 border border-border flex items-center justify-center text-xl font-bold text-ink shrink-0">
              {(builder.username?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-ink">@{builder.username}</h1>
                {builder.available_for_work && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    Available
                  </span>
                )}
              </div>
              {builder.bio && (
                <p className="text-sm text-ink3 mt-1">{builder.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {builder.github_username && (
                  <a
                    href={`https://github.com/${builder.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink4 hover:text-ink3 transition-colors"
                  >
                    github.com/{builder.github_username}
                  </a>
                )}
                {builder.website_url && (
                  <a
                    href={builder.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink4 hover:text-ink3 transition-colors"
                  >
                    {builder.website_url.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
            <Link
              href={`/dashboard/messages?builder=${builder.username}`}
              className="shrink-0 px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Contact Builder
            </Link>
          </div>

          {builder.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
              {builder.skills.map((skill) => (
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

        {/* Public projects */}
        <div>
          <h2 className="text-sm font-semibold text-ink mb-3">
            Public Projects
            {builder.projects.length > 0 && (
              <span className="ml-2 text-ink4 font-normal">({builder.projects.length})</span>
            )}
          </h2>

          {builder.projects.length === 0 ? (
            <div className="bg-surface border border-border rounded-forge p-6 text-center">
              <p className="text-sm text-ink4">No public projects yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {builder.projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-surface border border-border rounded-forge p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">
                      {TRACK_ICONS[project.track] ?? '📦'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{project.name}</span>
                        <span className="text-[11px] text-ink4 bg-surface2 border border-border px-2 py-0.5 rounded-full">
                          {STAGE_LABELS[project.stage] ?? project.stage}
                        </span>
                      </div>
                      {project.idea && (
                        <p className="text-xs text-ink3 mt-1 line-clamp-2">{project.idea}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
