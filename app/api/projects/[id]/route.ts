import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { idea, step } = body

    const supabase = createServiceClient()

    // Verify ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, steps_completed, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (idea !== undefined) updates.idea = idea
    if (body.name !== undefined) updates.name = body.name
    if (body.stage !== undefined) updates.stage = body.stage
    if (body.track !== undefined) updates.track = body.track
    if (body.app_url !== undefined) updates.app_url = body.app_url
    if (body.is_public !== undefined) updates.is_public = body.is_public
    if (body.feature_suggestions !== undefined) updates.feature_suggestions = body.feature_suggestions
    if (step) {
      const existing: string[] = project.steps_completed ?? []
      if (!existing.includes(step)) {
        updates.steps_completed = [...existing, step]
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
