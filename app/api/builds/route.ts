import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mine = searchParams.get('mine') === 'true'

    const supabase = createServiceClient()

    let query = supabase
      .from('build_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (mine) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('status', 'open')
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      title,
      description,
      budget,
      category,
      deadline_days = 30,
      anonymous = true,
      demo_required = true,
      notify_on_submission = true,
      company_name = null,
      tags = [],
    } = body

    if (!title || !description || !budget || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('build_requests')
      .insert({
        user_id: userId,
        title,
        description,
        budget,
        category,
        deadline_days,
        anonymous,
        demo_required,
        notify_on_submission,
        company_name,
        tags,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
