import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { callClaudeJSON } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'

// ─── Result types ─────────────────────────────────────────────────────────────

export interface PageAudit {
  url: string
  title: string
  purpose: string          // plain English: "This page lets users sign up for an account"
  score: number            // 0-100
  canGoBack: boolean       // does this page have a visible way to go back?
  nextStepClear: boolean   // is it obvious what to do next on this page?
  issues: Array<{
    severity: 'high' | 'medium' | 'low'
    title: string          // plain English short title
    detail: string         // what a real user would experience
  }>
  wins: string[]           // things working well, plain English
}

export interface UXAuditResult {
  url: string
  sitePurpose: string      // plain English: "A tool for managing freelance invoices"
  overallScore: number
  intuitivenessScore: number  // specific score for how easy it is to figure out
  summary: string          // honest plain-English verdict, 2-3 sentences
  pages: PageAudit[]
  navigationFlow: {
    score: number
    issues: Array<{
      severity: 'high' | 'medium' | 'low'
      description: string  // plain English: "Clicking the back button on the checkout page drops you at the homepage instead of your cart"
    }>
  }
  topFixes: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    whatUserExperiences: string  // the problem from the user's perspective
    howToFix: string             // plain English fix
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UA = 'ForgeUXAudit/1.0'

function extractCookieString(headers: Headers): string {
  const raw: string[] = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
    ?? [headers.get('set-cookie')].filter(Boolean) as string[]
  return raw.map(c => c.split(';')[0]).join('; ')
}

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

async function fetchPage(url: string, cookie: string): Promise<{ url: string; html: string; title: string } | null> {
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

async function findLoginUrl(baseUrl: string, html: string): Promise<string | null> {
  const base = new URL(baseUrl)
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1].toLowerCase()
    if (/\/(login|signin|sign-in|log-in|auth\/login|auth\/signin)/.test(href)) {
      try {
        const resolved = new URL(m[1], baseUrl)
        if (resolved.hostname === base.hostname) return resolved.href
      } catch {}
    }
  }
  const candidates = ['/login', '/signin', '/sign-in', '/auth/login', '/auth/signin', '/user/login']
  const results = await Promise.allSettled(
    candidates.map(async path => {
      const url = new URL(path, baseUrl).href
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA }, redirect: 'follow' })
      if (res.ok) return url
      throw new Error('not found')
    })
  )
  for (const r of results) if (r.status === 'fulfilled') return r.value
  return null
}

function findFormFields(html: string): { usernameField: string; passwordField: string } {
  const pwMatch =
    html.match(/name=["']([^"']+)["'][^>]*type=["']password["']/i) ||
    html.match(/type=["']password["'][^>]*name=["']([^"']+)["']/i)
  const emailMatch =
    html.match(/name=["']([^"']+)["'][^>]*type=["']email["']/i) ||
    html.match(/type=["']email["'][^>]*name=["']([^"']+)["']/i) ||
    html.match(/name=["'](email|username|user_?name|login|identifier)["']/i)
  return {
    usernameField: emailMatch?.[1] ?? 'email',
    passwordField: pwMatch?.[1] ?? 'password',
  }
}

async function loginWithCredentials(baseUrl: string, mainHtml: string, username: string, password: string): Promise<string> {
  const loginUrl = await findLoginUrl(baseUrl, mainHtml)
  if (!loginUrl) throw new Error("Couldn't find a login page. Try the 'Already logged in' method instead.")
  const loginPageRes = await fetch(loginUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  const initialCookie = extractCookieString(loginPageRes.headers)
  const loginHtml = await loginPageRes.text()
  const { usernameField, passwordField } = findFormFields(loginHtml)
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: initialCookie, 'User-Agent': UA, Referer: loginUrl },
    body: body.toString(),
    redirect: 'manual',
  })
  const sessionCookie = extractCookieString(postRes.headers)
  if (!sessionCookie && postRes.status >= 400) {
    throw new Error('Login failed — your credentials may be wrong, or this app uses magic links/OAuth. Try "Already logged in" instead.')
  }
  return [initialCookie, sessionCookie].filter(Boolean).join('; ')
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const allowed = await checkRateLimit(userId, 'ux_audit', 10)
    if (!allowed) {
      return NextResponse.json({ error: 'Daily limit reached (10 audits/day). Try again tomorrow.' }, { status: 429 })
    }

    const body = await req.json() as {
      url: string
      auth?: { type: 'cookie' | 'credentials'; cookie?: string; username?: string; password?: string }
    }
    const { url, auth: authOpts } = body
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`

    // Fetch main page (no auth)
    const mainPage = await fetchPage(normalizedUrl, '')
    if (!mainPage) {
      return NextResponse.json({ error: 'Could not reach that URL. Make sure it is running and accessible.' }, { status: 400 })
    }

    // Resolve auth cookie
    let cookie = ''
    if (authOpts?.type === 'cookie' && authOpts.cookie) {
      cookie = authOpts.cookie.trim()
    } else if (authOpts?.type === 'credentials' && authOpts.username && authOpts.password) {
      try {
        cookie = await loginWithCredentials(normalizedUrl, mainPage.html, authOpts.username, authOpts.password)
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 400 })
      }
    }

    // Re-fetch main page with auth + crawl up to 7 more pages
    const authedMain = cookie ? (await fetchPage(normalizedUrl, cookie) ?? mainPage) : mainPage
    const links = extractInternalLinks(authedMain.html, normalizedUrl).filter(l => l !== normalizedUrl).slice(0, 7)
    const extras = (await Promise.all(links.map(l => fetchPage(l, cookie)))).filter(Boolean) as Array<{ url: string; html: string; title: string }>
    const pages = [authedMain, ...extras]

    // Build the prompt
    const pagesBlock = pages
      .map((p, i) => `=== PAGE ${i + 1}: "${p.title}" ===\nURL: ${p.url}\n\n${p.html}`)
      .join('\n\n')

    const prompt = `You are a UX tester who has never seen this app before. Your job is to simulate being a real user visiting it for the first time and report back in plain, simple English — as if you're texting a friend about your experience.

IMPORTANT RULES FOR HOW TO WRITE:
- Write like you're talking to someone who built the app but isn't a developer
- Never use technical jargon. If you must mention something technical, explain it in plain words right after.
- Bad: "The component lacks breadcrumb navigation and ARIA labels"
- Good: "There's no way to tell where you are in the app, and if you hit the back button you end up on the wrong page"
- Bad: "CTA hierarchy is unclear"
- Good: "It's not obvious which button you're supposed to click — three buttons look equally important"
- Focus on what a confused real user would actually experience

Here are all the pages from the app:

${pagesBlock}

Return ONLY valid JSON in this exact shape:

{
  "url": "${normalizedUrl}",
  "sitePurpose": "One sentence plain-English description of what this app does, written as if explaining it to a friend",
  "overallScore": 72,
  "intuitivenessScore": 65,
  "summary": "2-3 honest sentences about the overall experience. Would a normal person be able to figure this out? What's the biggest problem?",
  "pages": [
    {
      "url": "full page url",
      "title": "page title",
      "purpose": "One sentence: what is this page for? What should the user do here?",
      "score": 75,
      "canGoBack": true,
      "nextStepClear": false,
      "issues": [
        {
          "severity": "high",
          "title": "Short plain-English problem title",
          "detail": "Describe exactly what a real user would experience. E.g. 'When you click the back arrow, it takes you to the homepage instead of the previous step. If you were in the middle of filling out a form, you lose all your progress.'"
        }
      ],
      "wins": [
        "Plain English description of something working well, e.g. 'The main action button is big and obvious — you can't miss what you're supposed to do'"
      ]
    }
  ],
  "navigationFlow": {
    "score": 60,
    "issues": [
      {
        "severity": "high",
        "description": "Describe the navigation problem as a user journey. E.g. 'If you go to Settings and then try to get back to your dashboard, there's no obvious path — you have to use your browser's back button and hope for the best'"
      }
    ]
  },
  "topFixes": [
    {
      "priority": "high",
      "title": "Short fix title",
      "whatUserExperiences": "Describe the problem from the user's point of view, in plain English",
      "howToFix": "What needs to change, explained simply. E.g. 'Add a Back button that returns to the previous step, not the homepage'"
    }
  ]
}

Rules:
- sitePurpose: one plain sentence, no jargon
- overallScore and intuitivenessScore: 0-100
- Each page must have the canGoBack and nextStepClear boolean fields filled in honestly
- pages: one entry per page provided, in the same order
- issues per page: 1-4 real issues a user would notice, severity high/medium/low
- wins per page: 1-3 things working well
- navigationFlow.issues: focus on broken journeys, dead ends, wrong redirects, confusing back-button behavior
- topFixes: 3-5 items ordered by priority — focus on the biggest user pain points first
- Everything must be written in plain English. Imagine explaining this to someone who uses apps but doesn't build them.`

    const result = await callClaudeJSON<UXAuditResult>(prompt)
    return NextResponse.json({ result })
  } catch (err) {
    console.error('UX audit error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
