import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/analyses/latest?projectId=X&type=market
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const type = searchParams.get('type')

  if (!projectId || !type) {
    return NextResponse.json({ error: 'projectId and type are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('analyses')
    .select('result, created_at')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return NextResponse.json({ result: null })
  return NextResponse.json({ result: data.result, createdAt: data.created_at })
}
