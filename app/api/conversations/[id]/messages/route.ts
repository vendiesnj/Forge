import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function verifyParticipant(supabase: ReturnType<typeof import('@/lib/supabase/server').createServiceClient>, conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, builder_id, participant_id')
    .eq('id', conversationId)
    .single()

  if (error || !data) return null
  if (data.builder_id !== userId && data.participant_id !== userId) return null
  return data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    const conv = await verifyParticipant(supabase, id, userId)
    if (!conv) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

    // Fetch all messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Mark unread messages (sent by the other party) as read
    const unreadIds = (messages ?? [])
      .filter((m) => m.sender_id !== userId && !m.read_at)
      .map((m) => m.id)

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)
    }

    return NextResponse.json({ messages: messages ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const conv = await verifyParticipant(supabase, id, userId)
    if (!conv) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: userId,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) throw error

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ message })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
