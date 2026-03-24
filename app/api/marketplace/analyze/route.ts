import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const allowed = await checkRateLimit(userId, 'marketplace_analyze', 10)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached (10 analyses/day). Try again tomorrow.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { url, files, manualData } = body as {
      url?: string
      files?: Array<{ name: string; content: string }>
      manualData?: Record<string, string>
    }

    const context: string[] = []
    if (url) {
      context.push(`App URL: ${url}`)
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ForgeBot/1.0)' },
          signal: AbortSignal.timeout(8000),
        })
        const html = await res.text()
        // Strip tags, collapse whitespace, take first 6000 chars
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 6000)
        if (text) context.push(`\n--- Website content ---\n${text}`)
      } catch {
        // URL fetch failed — continue with other context
      }
    }
    if (manualData) {
      Object.entries(manualData).forEach(([k, v]) => {
        if (v) context.push(`${k}: ${v}`)
      })
    }
    if (files?.length) {
      const sample = files.slice(0, 10)
      context.push('\n--- Code Files ---')
      for (const f of sample) {
        context.push(`\n=== ${f.name} ===\n${f.content.slice(0, 2000)}`)
      }
    }

    const prompt = `You are analyzing a software product for a marketplace listing. Extract and infer as much structured data as possible.

${context.join('\n')}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "name": "product name",
  "tagline": "one-line description",
  "description": "2-3 sentence overview",
  "tech_stack": ["Next.js", "Supabase", ...],
  "key_features": ["feature 1", "feature 2", ...],
  "pricing_model": "freemium | subscription | one-time | usage-based | free | ...",
  "target_market": "who this is for",
  "traction": "summary of traction/growth signals",
  "estimated_arr": "estimated ARR if inferable, else null",
  "estimated_customers": "estimated customer count if inferable, else null",
  "valuation_note": "brief note on estimated value / market position",
  "strengths": ["strength 1", "strength 2", ...],
  "risks": ["risk 1", "risk 2", ...]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Analysis failed' }, { status: 500 })
  }
}
