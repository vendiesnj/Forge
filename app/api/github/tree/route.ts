import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UI_EXTENSIONS = new Set(['.tsx', '.jsx', '.css', '.scss'])
const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', '.cache'])

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

// GET /api/github/tree?repo=owner/name — returns list of UI file paths only
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const repo = req.nextUrl.searchParams.get('repo')
  if (!repo) return NextResponse.json({ error: 'repo is required' }, { status: 400 })

  const token = await getGithubToken(userId)
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!res.ok) return NextResponse.json({ error: `GitHub error: ${res.status}` }, { status: res.status })

  const data = await res.json()
  const files: string[] = (data.tree ?? [])
    .filter((item: { type: string; path: string }) => {
      if (item.type !== 'blob') return false
      const parts = item.path.split('/')
      if (parts.some(p => IGNORED_DIRS.has(p))) return false
      const ext = item.path.slice(item.path.lastIndexOf('.'))
      return UI_EXTENSIONS.has(ext)
    })
    .map((item: { path: string }) => item.path)
    .slice(0, 200)

  return NextResponse.json({ files })
}
