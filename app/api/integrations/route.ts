import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_integrations')
    .select('provider, meta, created_at')
    .eq('user_id', userId)

  if (error) return NextResponse.json({ integrations: [] })
  return NextResponse.json({ integrations: data ?? [] })
}
