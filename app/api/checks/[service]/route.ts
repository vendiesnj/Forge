import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

type ServiceStatus = {
  ok: boolean
  message: string
  detail?: string
}

// Helper: split multi-part combined keys (PART1|PART2|PART3)
function parts(key: string) {
  return key.split('|').map(s => s.trim()).filter(Boolean)
}

async function checkGitHub(key: string): Promise<ServiceStatus> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${key}`, 'User-Agent': 'Forge-App' },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: 'Connected', detail: `Logged in as @${data.login}` }
    }
    return { ok: false, message: 'Invalid token', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkVercel(key: string): Promise<ServiceStatus> {
  try {
    const res = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: 'Connected', detail: `Logged in as ${data.user?.username || data.user?.email}` }
    }
    return { ok: false, message: 'Invalid token', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkStripe(key: string): Promise<ServiceStatus> {
  // Combined format: PUBLISHABLE_KEY|SECRET_KEY|WEBHOOK_SECRET
  // We need the secret key (starts with sk_) for API calls
  const ps = parts(key)
  const secretKey = ps.find(p => p.startsWith('sk_')) ?? ps[0]
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (res.ok) {
      return { ok: true, message: 'Connected', detail: 'Balance endpoint accessible' }
    }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkSupabase(key: string): Promise<ServiceStatus> {
  // Combined format: URL|ANON_KEY|SERVICE_ROLE_KEY
  const ps = parts(key)
  const url = ps[0]
  const anonKey = ps[1]
  if (!url || !anonKey) {
    return { ok: false, message: 'Needs URL|ANON_KEY', detail: 'Upload .env.local or paste as URL|ANON_KEY' }
  }
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    })
    if (res.ok || res.status === 200) {
      return { ok: true, message: 'Connected', detail: 'REST API accessible' }
    }
    return { ok: false, message: 'Connection failed', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkClerk(key: string): Promise<ServiceStatus> {
  // Combined format: PUBLISHABLE_KEY|SECRET_KEY
  const ps = parts(key)
  const secretKey = ps.find(p => p.startsWith('sk_')) ?? ps[0]
  if (!secretKey) return { ok: false, message: 'No key provided' }
  if (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_')) {
    return { ok: true, message: 'Valid format', detail: secretKey.startsWith('sk_test_') ? 'Test mode' : 'Live mode' }
  }
  // Check publishable key format as fallback
  const pubKey = ps.find(p => p.startsWith('pk_'))
  if (pubKey) {
    return { ok: true, message: 'Valid format', detail: 'Publishable key detected' }
  }
  return { ok: false, message: 'Invalid format', detail: 'Expected pk_test_... or sk_test_...' }
}

async function checkPostHog(key: string): Promise<ServiceStatus> {
  // Combined format: PROJECT_KEY|HOST
  const ps = parts(key)
  const projectKey = ps[0]
  const host = ps[1] ?? 'https://app.posthog.com'
  if (!projectKey) return { ok: false, message: 'No key provided' }
  try {
    // Use the decide endpoint which accepts project API keys
    const res = await fetch(`${host}/decide/?v=3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: projectKey, distinct_id: 'forge-check' }),
    })
    if (res.ok) {
      return { ok: true, message: 'Connected', detail: 'Project key valid' }
    }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkResend(key: string): Promise<ServiceStatus> {
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) return { ok: true, message: 'Connected' }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkAnthropic(key: string): Promise<ServiceStatus> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    })
    if (res.ok) return { ok: true, message: 'Connected', detail: 'API key valid' }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkOpenAI(key: string): Promise<ServiceStatus> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) return { ok: true, message: 'Connected', detail: 'API key valid' }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkUpstash(key: string): Promise<ServiceStatus> {
  // Combined format: REST_URL|REST_TOKEN
  const ps = parts(key)
  const url = ps[0]
  const token = ps[1]
  if (!url || !token) {
    return { ok: false, message: 'Needs URL|TOKEN', detail: 'Upload .env.local or paste as URL|TOKEN' }
  }
  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) return { ok: true, message: 'Connected', detail: 'Redis reachable' }
    return { ok: false, message: 'Invalid credentials', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkNeon(key: string): Promise<ServiceStatus> {
  if (!key) return { ok: false, message: 'No connection string provided' }
  if (key.startsWith('postgresql://') || key.startsWith('postgres://')) {
    return { ok: true, message: 'Valid format', detail: 'Connection string looks correct' }
  }
  return { ok: false, message: 'Invalid format', detail: 'Expected postgresql://...' }
}

async function checkMongoDB(key: string): Promise<ServiceStatus> {
  if (!key) return { ok: false, message: 'No connection string provided' }
  if (key.startsWith('mongodb://') || key.startsWith('mongodb+srv://')) {
    return { ok: true, message: 'Valid format', detail: 'Connection string looks correct' }
  }
  return { ok: false, message: 'Invalid format', detail: 'Expected mongodb+srv://...' }
}

async function checkSentry(key: string): Promise<ServiceStatus> {
  if (!key) return { ok: false, message: 'No DSN provided' }
  if (key.startsWith('https://') && key.includes('@') && key.includes('sentry.io')) {
    return { ok: true, message: 'Valid DSN', detail: 'DSN format looks correct' }
  }
  return { ok: false, message: 'Invalid DSN', detail: 'Expected https://xxx@sentry.io/xxx' }
}

async function checkSendGrid(key: string): Promise<ServiceStatus> {
  try {
    const res = await fetch('https://api.sendgrid.com/v3/scopes', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.ok) return { ok: true, message: 'Connected' }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkTwilio(key: string): Promise<ServiceStatus> {
  // Combined format: ACCOUNT_SID|AUTH_TOKEN|PHONE
  const ps = parts(key)
  const accountSid = ps[0]
  const authToken = ps[1]
  if (!accountSid || !authToken) {
    return { ok: false, message: 'Needs SID|TOKEN', detail: 'Upload .env.local or paste as SID|TOKEN' }
  }
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (res.ok) return { ok: true, message: 'Connected' }
    return { ok: false, message: 'Invalid credentials', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkAlgolia(key: string): Promise<ServiceStatus> {
  // Combined format: APP_ID|SEARCH_KEY|ADMIN_KEY
  const ps = parts(key)
  const appId = ps[0]
  const searchKey = ps[1] ?? ps[0]
  if (!appId) return { ok: false, message: 'No App ID provided' }
  try {
    const res = await fetch(`https://${appId}-dsn.algolia.net/1/indexes`, {
      headers: {
        'X-Algolia-Application-Id': appId,
        'X-Algolia-API-Key': searchKey,
      },
    })
    if (res.ok) return { ok: true, message: 'Connected' }
    return { ok: false, message: 'Invalid credentials', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkCloudflare(key: string): Promise<ServiceStatus> {
  // Combined format: API_TOKEN|ACCOUNT_ID
  const ps = parts(key)
  const token = ps[0]
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as { success?: boolean }
    if (data.success) return { ok: true, message: 'Connected', detail: 'Token valid' }
    return { ok: false, message: 'Invalid token' }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkAWS(key: string): Promise<ServiceStatus> {
  // Combined format: ACCESS_KEY_ID|SECRET_ACCESS_KEY|REGION
  const ps = parts(key)
  const accessKeyId = ps[0]
  if (!accessKeyId) return { ok: false, message: 'No Access Key ID provided' }
  if (accessKeyId.startsWith('AKIA') || accessKeyId.startsWith('ASIA')) {
    return { ok: true, message: 'Valid format', detail: 'Access key format looks correct' }
  }
  return { ok: false, message: 'Invalid format', detail: 'Expected AKIA... or ASIA...' }
}

async function checkMapbox(key: string): Promise<ServiceStatus> {
  if (!key) return { ok: false, message: 'No token provided' }
  try {
    const res = await fetch(`https://api.mapbox.com/tokens/v2?access_token=${key}`)
    if (res.ok) return { ok: true, message: 'Connected', detail: 'Token valid' }
    return { ok: false, message: 'Invalid token', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

async function checkLemonSqueezy(key: string): Promise<ServiceStatus> {
  // Combined format: API_KEY|STORE_ID|WEBHOOK_SECRET
  const ps = parts(key)
  const apiKey = ps[0]
  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) return { ok: true, message: 'Connected' }
    return { ok: false, message: 'Invalid key', detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, message: 'Connection failed' }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { service } = await params
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key') || ''

    let result: ServiceStatus

    switch (service) {
      case 'github':        result = await checkGitHub(key); break
      case 'vercel':        result = await checkVercel(key); break
      case 'stripe':        result = await checkStripe(key); break
      case 'supabase':      result = await checkSupabase(key); break
      case 'clerk':         result = await checkClerk(key); break
      case 'posthog':       result = await checkPostHog(key); break
      case 'resend':        result = await checkResend(key); break
      case 'anthropic':     result = await checkAnthropic(key); break
      case 'openai':        result = await checkOpenAI(key); break
      case 'upstash':       result = await checkUpstash(key); break
      case 'neon':          result = await checkNeon(key); break
      case 'planetscale':   result = await checkNeon(key); break  // same format
      case 'mongodb':       result = await checkMongoDB(key); break
      case 'sentry':        result = await checkSentry(key); break
      case 'sendgrid':      result = await checkSendGrid(key); break
      case 'twilio':        result = await checkTwilio(key); break
      case 'algolia':       result = await checkAlgolia(key); break
      case 'cloudflare':    result = await checkCloudflare(key); break
      case 'aws':           result = await checkAWS(key); break
      case 'mapbox':        result = await checkMapbox(key); break
      case 'lemon_squeezy': result = await checkLemonSqueezy(key); break
      default:
        result = { ok: false, message: 'Check not supported', detail: 'Verify this key manually' }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Check error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
