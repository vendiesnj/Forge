import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const supabase = createServiceClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, username, bio, skills, available_for_work, website_url, github_username')
      .eq('username', username)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, idea, stage, track')
      .eq('user_id', profile.user_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      builder: {
        id: profile.id,
        username: profile.username,
        bio: profile.bio,
        skills: profile.skills ?? [],
        available_for_work: profile.available_for_work ?? false,
        website_url: profile.website_url,
        github_username: profile.github_username,
        projects: projects ?? [],
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
