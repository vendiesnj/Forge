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
  type: 'cookie' | 'credentials'
  cookie?: string
  username?: string
  password?: string
}

const UA = 'ForgeUXAudit/1.0'

// Collapse all Set-Cookie headers into a single Cookie string
function extractCookieString(headers: Headers): string {
  const raw: string[] = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
    ?? [headers.get('set-cookie')].filter(Boolean) as string[]
  return raw.map(c => c.split(';')[0]).join('; ')
}

// Scan a page's HTML for a login URL — first by link text/href, then common paths
async function findLoginUrl(baseUrl: string, html: string): Promise<string | null> {
  const base = new URL(baseUrl)

  // 1. Find a login/signin link in the page HTML
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1].toLowerCase()
    if (/\/(login|signin|sign-in|log-in|auth\/login|auth\/signin)/.test(href)) {
      try {
        const resolved = new URL(m[1], baseUrl)
        if (resolved.hostname === base.hostname) return resolved.href
      } catch {}
    }
  }

  // 2. Try common login paths
  const candidates = [
    '/login', '/signin', '/sign-in', '/log-in',
    '/auth/login', '/auth/signin', '/auth/sign-in',
    '/user/login', '/users/sign_in', '/account/login',
  ]
  const results = await Promise.allSettled(
    candidates.map(async path => {
      const url = new URL(path, baseUrl).href
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA }, redirect: 'follow' })
      if (res.ok) return url
      throw new Error('not found')
    })
  )
  for (const r of results) {
    if (r.status === 'fulfilled') return r.value
  }

  return null
}

// Parse a login page's HTML to find the email/username and password input field names
function findFormFields(html: string): { usernameField: string; passwordField: string } {
  // Password field name
  const pwMatch =
    html.match(/name=["']([^"']+)["'][^>]*type=["']password["']/i) ||
    html.match(/type=["']password["'][^>]*name=["']([^"']+)["']/i)
  const passwordField = pwMatch?.[1] ?? 'password'

  // Email / username field name — look for type=email first, then name heuristics
  const emailMatch =
    html.match(/name=["']([^"']+)["'][^>]*type=["']email["']/i) ||
    html.match(/type=["']email["'][^>]*name=["']([^"']+)["']/i) ||
    html.match(/name=["'](email|username|user_?name|login|identifier)["']/i)
  const usernameField = emailMatch?.[1] ?? 'email'

  return { usernameField, passwordField }
}

// Attempt credential-based login; returns session cookie string or throws a user-readable error
async function loginWithCredentials(
  baseUrl: string,
  mainHtml: string,
  username: string,
  password: string,
): Promise<string> {
  const loginUrl = await findLoginUrl(baseUrl, mainHtml)
  if (!loginUrl) {
    throw new Error(
      "Couldn't find a login page automatically. Try the session cookie method instead."
    )
  }

  // Fetch the login page to get initial cookies + CSRF tokens
  const loginPageRes = await fetch(loginUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  const initialCookie = extractCookieString(loginPageRes.headers)
  const loginHtml = await loginPageRes.text()

  const { usernameField, passwordField } = findFormFields(loginHtml)

  // Look for CSRF token in common patterns
  const csrfMatch =
    loginHtml.match(/name=["']_?csrf(?:_?token)?["'][^>]*value=["']([^"']+)["']/i) ||
    loginHtml.match(/value=["']([^"']+)["'][^>]*name=["']_?csrf(?:_?token)?["']/i) ||
    loginHtml.match(/"csrfToken"\s*:\s*"([^"]+)"/i)
  const csrfToken = csrfMatch?.[1]

  const body = new URLSearchParams({
    [usernameField]: username,
    [passwordField]: password,
    ...(csrfToken ? { _csrf: csrfToken, csrf_token: csrfToken, csrfToken } : {}),
  })

  const postRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initialCookie,
      'User-Agent': UA,
      'Referer': loginUrl,
    },
    body: body.toString(),
    redirect: 'manual', // don't follow — we need Set-Cookie from this response
  })

  const sessionCookie = extractCookieString(postRes.headers)
  if (!sessionCookie && postRes.status >= 400) {
    throw new Error(
      'Login failed — your credentials may be incorrect, or this app uses OAuth/magic links. ' +
      'Try the session cookie method instead.'
    )
  }

  return [initialCookie, sessionCookie].filter(Boolean).join('; ')
}

// Fetch one page with optional auth cookie
async function fetchPage(
  url: string,
  cookie: string,
): Promise<{ url: string; html: string; title: string } | null> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, ...(cookie ? { Cookie: cookie } : {}) },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const html = await res.text()
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? 'Untitled'
    return { url, html: html.slice(0, 8000), title }
  } catch {
    return null
  }
}

// Parse internal links from HTML
function extractInternalLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const seen = new Set<string>()
  const links: string[] = []
  for (const m of html.matchAll(/href=["']([^"'#?][^"']*)/g)) {
    try {
      const resolved = new URL(m[1], baseUrl)
      if (resolved.hostname !== base.hostname) continue
      const clean = resolved.origin + resolved.pathname.replace(/\/$/, '') || '/'
      if (!seen.has(clean)) { seen.add(clean); links.push(clean) }
    } catch {}
  }
  return links
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // ── Fetch the main page (no auth yet) ─────────────────────────────────
    const mainPage = await fetchPage(normalizedUrl, '')
    if (!mainPage) {
      return NextResponse.json(
        { error: 'Could not reach that URL. Check it is running and accessible.' },
        { status: 400 }
      )
    }

    // ── Resolve auth cookie ────────────────────────────────────────────────
    let cookie = ''
    if (authOpts?.type === 'cookie' && authOpts.cookie) {
      cookie = authOpts.cookie.trim()
    } else if (authOpts?.type === 'credentials' && authOpts.username && authOpts.password) {
      try {
        cookie = await loginWithCredentials(
          normalizedUrl,
          mainPage.html,
          authOpts.username,
          authOpts.password,
        )
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Login failed' },
          { status: 400 }
        )
      }
    }

    // ── Re-fetch main page with auth if we now have a cookie ───────────────
    const authedMain = cookie ? (await fetchPage(normalizedUrl, cookie) ?? mainPage) : mainPage

    // ── Crawl up to 7 more internal pages ─────────────────────────────────
    const links = extractInternalLinks(authedMain.html, normalizedUrl)
      .filter(l => l !== normalizedUrl)
      .slice(0, 7)

    const extras = (
      await Promise.all(links.map(l => fetchPage(l, cookie)))
    ).filter(Boolean) as Array<{ url: string; html: string; title: string }>

    const pages = [authedMain, ...extras]

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
    "findings": [{"type": "good", "description": "..."}, {"type": "issue", "description": "..."}]
  },
  "accessibility": {
    "score": 55,
    "findings": [{"type": "good", "description": "..."}, {"type": "issue", "description": "..."}]
  },
  "layout": {
    "score": 78,
    "findings": [{"type": "good", "description": "..."}, {"type": "issue", "description": "..."}]
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
- Scores 0-100; overallScore is weighted average
- Each category: 2-4 findings mixing goods and issues, referencing specific pages where helpful
- recommendations: 3-6 items ordered by priority with concrete fixes
- Be specific — avoid vague feedback`

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
