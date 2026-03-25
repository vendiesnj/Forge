import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'

export interface UXAuditResult {
  url: string
  overallScore: number
  summary: string
  pagesAudited: Array<{ url: string; title: string }>
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

interface AuthOptions {
  type: 'cookie' | 'form'
  // cookie auth
  cookie?: string
  // form auth
  loginUrl?: string
  usernameField?: string
  username?: string
  passwordField?: string
  password?: string
}

// Extract all Set-Cookie values and return as a single Cookie header string
function extractCookieString(headers: Headers): string {
  // Node 18+ has getSetCookie(); fall back to single get()
  const raw: string[] = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
    ?? [headers.get('set-cookie')].filter(Boolean) as string[]
  return raw.map(c => c.split(';')[0]).join('; ')
}

// Parse internal links from HTML, resolved against the base URL
function extractInternalLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const seen = new Set<string>()
  const links: string[] = []

  for (const m of html.matchAll(/href=["']([^"'#?][^"']*)/g)) {
    try {
      const resolved = new URL(m[1], baseUrl)
      if (resolved.hostname !== base.hostname) continue
      const clean = resolved.origin + resolved.pathname.replace(/\/$/, '') || '/'
      if (!seen.has(clean)) {
        seen.add(clean)
        links.push(clean)
      }
    } catch {}
  }

  return links
}

// Extract page title from HTML
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : 'Untitled'
}

// Attempt form-based login; returns cookie string or throws
async function loginWithForm(opts: AuthOptions): Promise<string> {
  const loginUrl = opts.loginUrl!
  const ua = 'ForgeUXAudit/1.0'

  // 1. GET login page — capture any initial cookies + CSRF token
  const getRes = await fetch(loginUrl, {
    headers: { 'User-Agent': ua },
    redirect: 'follow',
  })
  const initialCookie = extractCookieString(getRes.headers)
  const loginHtml = await getRes.text()

  // Try to find common CSRF field patterns
  const csrfMatch =
    loginHtml.match(/name=["']_?csrf(?:_?token)?["'][^>]*value=["']([^"']+)["']/i) ||
    loginHtml.match(/value=["']([^"']+)["'][^>]*name=["']_?csrf(?:_?token)?["']/i) ||
    loginHtml.match(/"csrfToken"\s*:\s*"([^"]+)"/i)
  const csrfToken = csrfMatch?.[1]

  // 2. POST credentials
  const body = new URLSearchParams({
    [opts.usernameField ?? 'email']: opts.username ?? '',
    [opts.passwordField ?? 'password']: opts.password ?? '',
    ...(csrfToken ? { _csrf: csrfToken, csrf_token: csrfToken, csrfToken } : {}),
  })

  const postRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initialCookie,
      'User-Agent': ua,
      'Referer': loginUrl,
    },
    body: body.toString(),
    redirect: 'manual', // capture Set-Cookie before redirect
  })

  const sessionCookie = extractCookieString(postRes.headers)
  const combined = [initialCookie, sessionCookie].filter(Boolean).join('; ')

  // status 302/303 = redirect after login = success
  if (postRes.status < 300 || postRes.status >= 400) {
    // Might still have succeeded (SPAs return 200); check we got a new cookie
    if (!sessionCookie) throw new Error('Login did not return a session cookie — check your credentials and login URL')
  }

  return combined
}

// Fetch one page; return { html, title } or null on error
async function fetchPage(url: string, cookie: string): Promise<{ url: string; html: string; title: string } | null> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ForgeUXAudit/1.0',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const html = await res.text()
    return { url, html: html.slice(0, 8000), title: extractTitle(html) }
  } catch {
    return null
  }
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

    const body = await req.json() as { url: string; auth?: AuthOptions }
    const { url, auth: authOpts } = body
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url : `https://${url}`

    // ── Resolve auth cookie ────────────────────────────────────────────────
    let cookie = ''
    if (authOpts?.type === 'cookie' && authOpts.cookie) {
      cookie = authOpts.cookie.trim()
    } else if (authOpts?.type === 'form') {
      try {
        cookie = await loginWithForm(authOpts)
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Login failed' },
          { status: 400 }
        )
      }
    }

    // ── Fetch main page ────────────────────────────────────────────────────
    const mainPage = await fetchPage(normalizedUrl, cookie)
    if (!mainPage) {
      return NextResponse.json({ error: 'Could not fetch the page. Check the URL and any auth credentials.' }, { status: 400 })
    }

    // ── Crawl internal links (up to 7 more pages) ─────────────────────────
    const links = extractInternalLinks(mainPage.html, normalizedUrl)
      .filter(l => l !== normalizedUrl)
      .slice(0, 14) // candidates

    const extras = (
      await Promise.all(links.slice(0, 7).map(l => fetchPage(l, cookie)))
    ).filter(Boolean) as Array<{ url: string; html: string; title: string }>

    const pages = [mainPage, ...extras]

    // ── Build Claude prompt ────────────────────────────────────────────────
    const pagesBlock = pages
      .map((p, i) => `--- Page ${i + 1}: ${p.title} (${p.url}) ---\n${p.html}`)
      .join('\n\n')

    const prompt = `You are a senior UX designer and accessibility expert. Audit the UX of this web app across ${pages.length} page(s).

${pagesBlock}

Return ONLY valid JSON:
{
  "url": "${normalizedUrl}",
  "overallScore": 72,
  "summary": "2-3 sentence honest assessment covering patterns seen across all audited pages",
  "pagesAudited": [
    ${pages.map(p => `{"url": "${p.url}", "title": "${p.title.replace(/"/g, '\\"')}"}`).join(',\n    ')}
  ],
  "navigation": {
    "score": 80,
    "findings": [
      {"type": "good", "description": "specific finding referencing what you saw"},
      {"type": "issue", "description": "specific issue with page reference where relevant"}
    ]
  },
  "readability": {
    "score": 65,
    "findings": [
      {"type": "good", "description": "..."},
      {"type": "issue", "description": "..."}
    ]
  },
  "accessibility": {
    "score": 55,
    "findings": [
      {"type": "good", "description": "..."},
      {"type": "issue", "description": "..."}
    ]
  },
  "layout": {
    "score": 78,
    "findings": [
      {"type": "good", "description": "..."},
      {"type": "issue", "description": "..."}
    ]
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "Navigation",
      "title": "Short actionable title",
      "description": "What the problem is and where it appears",
      "fix": "Specific code-level or design-level action to fix it"
    }
  ]
}

Rules:
- Scores are 0-100; overallScore is the weighted average
- Each category: 2-4 findings mixing goods and issues, referencing specific pages where relevant
- recommendations: 3-6 items ordered by priority, each with a concrete fix
- Be honest — avoid vague feedback like "consider improving contrast"`

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
