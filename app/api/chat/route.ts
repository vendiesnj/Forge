import { NextRequest, NextResponse } from 'next/server'
import Anthropic from 'anthropic'
import { createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const RATE_LIMIT = 20 // messages per hour per IP

const SYSTEM_PROMPT = `You are the Forge assistant. Forge is a two-sided marketplace connecting indie software builders with organizations, universities, and companies. Builders can: create projects, run idea analysis, market research, distribution strategy, manage API keys/services, upload code for feature analysis, set up Stripe Connect for payments, list products in the store, send/receive messages, and use escrow for secure payments. Organizations can: browse builder listings in the marketplace, save favorites, message builders directly, set up escrow payments for project work, and manage billing. Help users understand how to use these features. If a user wants to request a feature or report a bug, say you've logged their request and actually save it. Keep answers short and friendly.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const supabase = createServiceClient()

    // Rate limit: count messages from this IP in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 }
      )
    }

    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ''
    const isFeatureRequest =
      /feature request|request a feature|suggest a feature|feature suggestion|report a bug|bug report/i.test(
        userMessage
      )

    // Log every message
    supabase
      .from('chat_messages')
      .insert({ user_message: userMessage, ip, type: isFeatureRequest ? 'feature_request' : 'general' })
      .then(() => {})
      .catch((e: unknown) => console.error('Failed to log chat message:', e))

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const messageContent = response.content[0]
    const text = messageContent.type === 'text' ? messageContent.text : ''

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
