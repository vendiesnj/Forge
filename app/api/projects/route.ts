import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Projects fetch error:', error.message)
      return NextResponse.json({ projects: [] })
    }

    return NextResponse.json({ projects: data })
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
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, idea, track, stage, app_url } = await req.json()
    if (!name || !track) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const insert: Record<string, unknown> = { user_id: userId, name, track }
    if (idea) insert.idea = idea
    if (stage) insert.stage = stage
    if (app_url) insert.app_url = app_url

    const { data, error } = await supabase
      .from('projects')
      .insert(insert)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ project: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
