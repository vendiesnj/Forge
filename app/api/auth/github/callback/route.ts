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
  const savedState = cookieStore.get('github_oauth_state')?.value
  const isPopup = cookieStore.get('github_oauth_popup')?.value === '1'
  const projectId = cookieStore.get('github_oauth_project')?.value ?? ''
  cookieStore.delete('github_oauth_state')
  cookieStore.delete('github_oauth_popup')
  cookieStore.delete('github_oauth_project')

  if (!code || !state || state !== savedState) {
    console.error('GitHub OAuth state mismatch', { code: !!code, state, savedState })
    return NextResponse.redirect(`${appUrl}/dashboard?error=github_auth_failed`)
  }

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/auth/github/callback`,
    }),
  })
  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token
  if (!accessToken) {
    console.error('GitHub token exchange failed:', tokenData)
    return NextResponse.redirect(`${appUrl}/dashboard?error=github_token_failed`)
  }

  // Get GitHub user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
  })
  const ghUser = await userRes.json()

  // Store in Supabase
  const supabase = createServiceClient()
  await supabase.from('user_integrations').upsert(
    {
      user_id: userId,
      provider: 'github',
      access_token: accessToken,
      meta: { login: ghUser.login, avatar_url: ghUser.avatar_url, name: ghUser.name },
    },
    { onConflict: 'user_id,provider' }
  )

  if (isPopup) {
    const doneUrl = new URL(`${appUrl}/auth/done`)
    doneUrl.searchParams.set('provider', 'github')
    if (projectId) doneUrl.searchParams.set('project', projectId)
    return NextResponse.redirect(doneUrl.toString())
  }
  return NextResponse.redirect(`${appUrl}/dashboard/checks?connected=github`)
}
