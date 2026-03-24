import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', '.cache',
  '__pycache__', '.DS_Store', 'coverage', '.turbo', '.vercel',
])

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.css', '.scss', '.json', '.md', '.toml', '.yaml', '.yml',
  '.sql', '.prisma', '.graphql',
])

const ALLOWED_FILENAMES = new Set([
  'Dockerfile', '.gitignore', '.env.example', '.env.sample',
])

function shouldInclude(path: string): boolean {
  const parts = path.split('/')
  if (parts.some(p => IGNORED_DIRS.has(p))) return false
  const basename = parts[parts.length - 1]
  if (/^\.env(\.|$)/.test(basename) && basename !== '.env.example' && basename !== '.env.sample') return false
  if (ALLOWED_FILENAMES.has(basename)) return true
  const dot = basename.lastIndexOf('.')
  if (dot === -1) return false
  return ALLOWED_EXTENSIONS.has(basename.slice(dot))
}

async function getGithubToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .single()
  return data?.access_token ?? null
}

// GET /api/github/repo-files?repo=owner/name
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const repo = req.nextUrl.searchParams.get('repo')
  if (!repo) return NextResponse.json({ error: 'repo is required' }, { status: 400 })

  const token = await getGithubToken(userId)
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  // Fetch the full tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: err.message ?? `GitHub error: ${treeRes.status}` },
      { status: treeRes.status }
    )
  }

  const treeData = await treeRes.json()
  const allFiles: Array<{ path: string; url: string }> = (treeData.tree ?? [])
    .filter((item: { type: string; path: string; url: string; size?: number }) =>
      item.type === 'blob' &&
      shouldInclude(item.path) &&
      (item.size ?? 0) < 100_000
    )
    .slice(0, 60) // cap at 60 files

  if (allFiles.length === 0) {
    return NextResponse.json({ files: [] })
  }

  // Fetch file contents in parallel (in batches of 10 to avoid rate limits)
  const BATCH = 10
  const results: Array<{ path: string; content: string }> = []

  for (let i = 0; i < allFiles.length; i += BATCH) {
    const batch = allFiles.slice(i, i + BATCH)
    const fetched = await Promise.all(
      batch.map(async (file) => {
        const res = await fetch(file.url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        })
        if (!res.ok) return null
        const data = await res.json()
        if (!data.content) return null
        try {
          const content = Buffer.from(data.content, 'base64').toString('utf-8')
          return { path: file.path, content }
        } catch {
          return null
        }
      })
    )
    results.push(...(fetched.filter(Boolean) as Array<{ path: string; content: string }>))
  }

  return NextResponse.json({ files: results, repo })
}
