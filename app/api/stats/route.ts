import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()

    const [{ data: analyses }, { data: projects }, { count: requestCount }] = await Promise.all([
      supabase.from('analyses').select('type, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name, track, created_at').eq('user_id', userId),
      supabase.from('build_requests').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    const typeCounts: Record<string, number> = {}
    const last30Days: Record<string, number> = {}

    const now = new Date()
    for (const a of analyses ?? []) {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1
      const daysAgo = Math.floor((now.getTime() - new Date(a.created_at).getTime()) / 86400000)
      if (daysAgo < 30) {
        const key = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        last30Days[key] = (last30Days[key] || 0) + 1
      }
    }

    return NextResponse.json({
      totalAnalyses: analyses?.length ?? 0,
      totalProjects: projects?.length ?? 0,
      totalRequests: requestCount ?? 0,
      typeCounts,
      recentActivity: (analyses ?? []).slice(0, 10),
      projects: projects ?? [],
      last30Days,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
