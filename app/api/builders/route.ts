import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceClient()

    // Get all profiles that are either available for work or have public projects
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, username, bio, skills, available_for_work')
      .not('username', 'is', null)

    if (error) throw error

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ builders: [] })
    }

    // Get public project counts per user
    const userIds = profiles.map((p) => p.user_id)
    const { data: projects } = await supabase
      .from('projects')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_public', true)

    const projectCountMap: Record<string, number> = {}
    for (const project of projects ?? []) {
      projectCountMap[project.user_id] = (projectCountMap[project.user_id] ?? 0) + 1
    }

    // Only return builders who are available_for_work OR have at least one public project
    const builders = profiles
      .filter((p) => p.available_for_work || (projectCountMap[p.user_id] ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        username: p.username,
        bio: p.bio,
        skills: p.skills ?? [],
        available_for_work: p.available_for_work ?? false,
        project_count: projectCountMap[p.user_id] ?? 0,
      }))

    return NextResponse.json({ builders })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
