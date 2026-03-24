import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    return NextResponse.json({ profile: data ?? null })
  } catch {
    return NextResponse.json({ profile: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { bio, username, available_for_work, skills, website_url, github_username } = body

    const supabase = createServiceClient()

    const updates: Record<string, unknown> = {}
    if (bio !== undefined) updates.bio = bio
    if (username !== undefined) updates.username = username
    if (available_for_work !== undefined) updates.available_for_work = available_for_work
    if (skills !== undefined) updates.skills = skills
    if (website_url !== undefined) updates.website_url = website_url
    if (github_username !== undefined) updates.github_username = github_username

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { skill_level } = await req.json()
    if (!skill_level) return NextResponse.json({ error: 'Missing skill_level' }, { status: 400 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, skill_level }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
