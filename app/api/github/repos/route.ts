import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function getGithubToken(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .single()
  return data?.access_token ?? null
}

// GET /api/github/repos — list user's repos
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getGithubToken(userId)
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch repos' }, { status: res.status })

  const repos = await res.json()
  return NextResponse.json({
    repos: repos.map((r: { id: number; name: string; full_name: string; html_url: string; private: boolean; description: string }) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      url: r.html_url,
      private: r.private,
      description: r.description,
    })),
  })
}

// POST /api/github/repos — create a new repo
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getGithubToken(userId)
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  const { name, description, isPrivate = true } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: description ?? '',
      private: isPrivate,
      auto_init: true,
    }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.message ?? 'Failed to create repo' }, { status: res.status })

  return NextResponse.json({ repo: { name: data.name, full_name: data.full_name, url: data.html_url } })
}
