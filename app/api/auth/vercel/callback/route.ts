import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  if (!userId) return NextResponse.redirect(`${appUrl}/dashboard`)

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('vercel_oauth_state')?.value
  cookieStore.delete('vercel_oauth_state')

  if (!code || !state || state !== savedState) {
    console.error('Vercel OAuth state mismatch', { code: !!code, state, savedState })
    return NextResponse.redirect(`${appUrl}/dashboard?error=vercel_auth_failed`)
  }

  // Exchange code for token
  const tokenRes = await fetch('https://api.vercel.com/v2/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VERCEL_CLIENT_ID ?? '',
      client_secret: process.env.VERCEL_CLIENT_SECRET ?? '',
      code,
      redirect_uri: `${appUrl}/api/auth/vercel/callback`,
    }),
  })
  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token
  if (!accessToken) {
    console.error('Vercel token exchange failed:', tokenData)
    return NextResponse.redirect(`${appUrl}/dashboard?error=vercel_token_failed`)
  }

  // Get Vercel user info
  const userRes = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const vercelUser = await userRes.json()

  const supabase = createServiceClient()
  await supabase.from('user_integrations').upsert(
    {
      user_id: userId,
      provider: 'vercel',
      access_token: accessToken,
      meta: {
        username: vercelUser.user?.username,
        name: vercelUser.user?.name,
        email: vercelUser.user?.email,
      },
    },
    { onConflict: 'user_id,provider' }
  )

  return NextResponse.redirect(`${appUrl}/dashboard/checks?connected=vercel`)
}
