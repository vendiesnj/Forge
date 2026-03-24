import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/github/link — link a repo to a project
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, repoFullName, repoUrl } = await req.json()
  if (!projectId || !repoFullName) {
    return NextResponse.json({ error: 'projectId and repoFullName are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('projects')
    .update({ github_repo: repoFullName })
    .eq('id', projectId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
