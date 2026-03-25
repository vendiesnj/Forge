import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'

export interface UXAuditResult {
  url: string
  overallScore: number
  summary: string
  navigation: {
    score: number
    findings: Array<{ type: 'good' | 'issue'; description: string }>
  }
  readability: {
    score: number
    findings: Array<{ type: 'good' | 'issue'; description: string }>
  }
  accessibility: {
    score: number
    findings: Array<{ type: 'good' | 'issue'; description: string }>
  }
  layout: {
    score: number
    findings: Array<{ type: 'good' | 'issue'; description: string }>
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    title: string
    description: string
    fix: string
  }>
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkRateLimit(userId, 'ux_audit', 10)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached (10 audits/day). Try again tomorrow.' },
        { status: 429 }
      )
    }

    const { url } = await req.json() as { url: string }
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    // Normalize URL
    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`

    // Fetch the page HTML server-side (works for localhost in dev, deployed URLs in prod)
    let html = ''
    let fetchError = ''
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ForgeUXAudit/1.0' },
      })
      clearTimeout(timeout)
      html = await res.text()
      // Trim to avoid huge token usage — keep first 30k chars
      if (html.length > 30000) html = html.slice(0, 30000)
    } catch (err) {
      fetchError = err instanceof Error ? err.message : 'Failed to fetch URL'
    }

    const prompt = `You are a senior UX designer and accessibility expert. Analyze the UX of this web app.

URL: ${normalizedUrl}
${html ? `HTML content (truncated):\n\`\`\`html\n${html}\n\`\`\`` : `Note: Could not fetch the page HTML (${fetchError}). Analyze based on the URL structure and any patterns you can infer.`}

Return ONLY valid JSON with this exact structure:
{
  "url": "${normalizedUrl}",
  "overallScore": 72,
  "summary": "2-3 sentence honest assessment of the overall UX quality",
  "navigation": {
    "score": 80,
    "findings": [
      {"type": "good", "description": "Clear primary navigation with descriptive labels"},
      {"type": "issue", "description": "No breadcrumbs on deep pages makes orientation difficult"}
    ]
  },
  "readability": {
    "score": 65,
    "findings": [
      {"type": "good", "description": "Adequate font size for body text"},
      {"type": "issue", "description": "Low contrast ratio on secondary text elements"}
    ]
  },
  "accessibility": {
    "score": 55,
    "findings": [
      {"type": "good", "description": "Form inputs have visible labels"},
      {"type": "issue", "description": "Missing alt text on decorative images"}
    ]
  },
  "layout": {
    "score": 78,
    "findings": [
      {"type": "good", "description": "Consistent spacing and visual hierarchy"},
      {"type": "issue", "description": "CTA buttons lack sufficient visual weight"}
    ]
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "Accessibility",
      "title": "Add keyboard navigation support",
      "description": "Interactive elements are not reachable via keyboard alone",
      "fix": "Add tabIndex, focus styles, and keyboard event handlers to all interactive components"
    }
  ]
}

Rules:
- Each category score is 0-100
- overallScore is the weighted average of all category scores
- Each category must have 2-4 findings mixing goods and issues
- Be honest and specific — avoid vague feedback
- recommendations: 3-5 items ordered by priority, each with a concrete actionable fix
- If you could not fetch the HTML, still provide a useful analysis based on what you know`

    const result = await callClaudeJSON<UXAuditResult>(prompt)

    return NextResponse.json({ result })
  } catch (err) {
    console.error('UX audit error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
