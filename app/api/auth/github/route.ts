import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    console.error('GITHUB_CLIENT_ID is not set')
    return NextResponse.redirect(new URL('/dashboard?error=github_not_configured', req.url))
  }

  // Derive the app base URL from the request if env var isn't set
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  const state = crypto.randomUUID()
  const isPopup = req.nextUrl.searchParams.get('popup') === 'true'
  const projectId = req.nextUrl.searchParams.get('project') ?? ''
  const cookieStore = await cookies()
  cookieStore.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  if (isPopup) {
    cookieStore.set('github_oauth_popup', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })
  }
  if (projectId) {
    cookieStore.set('github_oauth_project', projectId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/github/callback`,
    scope: 'repo user:email',
    state,
  })

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`)
}
