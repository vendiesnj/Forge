import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`builder_id.eq.${userId},participant_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Conversations fetch error:', error.message)
      return NextResponse.json({ conversations: [] })
    }

    // For each conversation, fetch last message and unread count
    const enriched = await Promise.all(
      (conversations ?? []).map(async (conv) => {
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .is('read_at', null)

        return {
          ...conv,
          last_message: lastMessages?.[0] ?? null,
          unread_count: unreadCount ?? 0,
        }
      })
    )

    return NextResponse.json({ conversations: enriched })
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

    const { builder_id, project_id, subject, initial_message } = await req.json()

    if (!builder_id || !initial_message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (builder_id === userId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Upsert conversation (unique on builder_id, participant_id, project_id)
    const convInsert: Record<string, unknown> = {
      builder_id,
      participant_id: userId,
      subject: subject ?? null,
      status: 'active',
    }
    if (project_id) convInsert.project_id = project_id

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .upsert(convInsert, { onConflict: 'builder_id,participant_id,project_id', ignoreDuplicates: false })
      .select()
      .single()

    if (convError) throw convError

    // Create first message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: userId,
        content: initial_message,
      })
      .select()
      .single()

    if (msgError) throw msgError

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id)

    return NextResponse.json({ conversation, message })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
