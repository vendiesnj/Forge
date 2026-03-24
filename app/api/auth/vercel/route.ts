import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET — initiate Vercel OAuth flow
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.VERCEL_CLIENT_ID
  if (!clientId) {
    console.error('VERCEL_CLIENT_ID is not set')
    return NextResponse.redirect(new URL('/dashboard?error=vercel_not_configured', req.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('vercel_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/vercel/callback`,
    scope: 'user',
    state,
  })

  return NextResponse.redirect(`https://vercel.com/oauth/authorize?${params}`)
}

// POST — save a Vercel token (fallback / manual paste)
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token?.trim()) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  // Validate token against Vercel API
  const vercelRes = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${token.trim()}` },
  })
  if (!vercelRes.ok) return NextResponse.json({ error: 'Invalid Vercel token' }, { status: 400 })
  const vercelUser = await vercelRes.json()

  const supabase = createServiceClient()
  await supabase.from('user_integrations').upsert(
    {
      user_id: userId,
      provider: 'vercel',
      access_token: token.trim(),
      meta: { username: vercelUser.user?.username, name: vercelUser.user?.name },
    },
    { onConflict: 'user_id,provider' }
  )

  return NextResponse.json({ ok: true, username: vercelUser.user?.username })
}

// DELETE — disconnect Vercel
export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  await supabase.from('user_integrations').delete().eq('user_id', userId).eq('provider', 'vercel')
  return NextResponse.json({ ok: true })
}
