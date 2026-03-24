import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mine = searchParams.get('mine') === '1'
    const { userId } = await auth()
    const supabase = createServiceClient()

    let query = supabase
      .from('marketplace_listings')
      .select('*')
      .order('created_at', { ascending: false })

    if (mine && userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('status', 'active')
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ listings: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({ ...body, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ listing: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
