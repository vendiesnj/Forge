import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

// GET /api/github/file?repo=owner/name&path=src/components/Foo.tsx
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const repo = req.nextUrl.searchParams.get('repo')
  const path = req.nextUrl.searchParams.get('path')
  if (!repo || !path) return NextResponse.json({ error: 'repo and path are required' }, { status: 400 })

  const token = await getGithubToken(userId)
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!res.ok) return NextResponse.json({ error: `GitHub error: ${res.status}` }, { status: res.status })

  const data = await res.json()
  if (!data.content) return NextResponse.json({ error: 'No content' }, { status: 404 })

  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return NextResponse.json({ content, sha: data.sha })
}
