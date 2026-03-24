import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
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

async function fetchRepoFile(token: string, repoFullName: string, path: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.content) return null
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

// GET /api/github/repo-context?repo=owner/name
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const repo = req.nextUrl.searchParams.get('repo')
  if (!repo) return NextResponse.json({ error: 'repo is required' }, { status: 400 })

  const token = await getGithubToken(userId)
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })

  const [packageJsonRaw, envExampleRaw] = await Promise.all([
    fetchRepoFile(token, repo, 'package.json'),
    fetchRepoFile(token, repo, '.env.example'),
  ])

  // Parse dependencies from package.json
  const dependencies: string[] = []
  if (packageJsonRaw) {
    try {
      const pkg = JSON.parse(packageJsonRaw)
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      }
      dependencies.push(...Object.keys(allDeps))
    } catch {
      // ignore parse errors
    }
  }

  // Parse env var names from .env.example
  const envVars: string[] = []
  if (envExampleRaw) {
    for (const line of envExampleRaw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        envVars.push(trimmed.slice(0, eqIdx).trim())
      }
    }
  }

  return NextResponse.json({
    envVars,
    dependencies,
    hasEnvExample: !!envExampleRaw,
    hasPackageJson: !!packageJsonRaw,
  })
}
