import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

// IMPORTANT: Set STRIPE_SECRET_KEY in your .env.local
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', userId)
      .single()

    if (!profile?.stripe_connect_account_id) {
      return NextResponse.json({ onboarded: false, account_id: null })
    }

    // Step: Retrieve account status from Stripe V2 API directly (source of truth)
    // We always fetch live from Stripe — do not rely solely on cached DB value
    const account = await stripeClient.v2.core.accounts.retrieve(
      profile.stripe_connect_account_id,
      { include: ['configuration.recipient', 'requirements'] }
    )

    // Transfers are active when the stripe_transfers capability status is "active"
    const readyToReceivePayments =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (account as any)?.configuration?.recipient?.capabilities
        ?.stripe_balance?.stripe_transfers?.status === 'active'

    // Onboarding is complete when there are no currently_due or past_due requirements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requirementsStatus = (account as any).requirements?.summary?.minimum_deadline?.status
    const onboardingComplete =
      requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due'

    const onboarded = readyToReceivePayments && onboardingComplete

    // Sync status back to DB if it changed
    if (onboarded !== profile.stripe_connect_onboarded) {
      await supabase
        .from('user_profiles')
        .update({ stripe_connect_onboarded: onboarded })
        .eq('user_id', userId)
    }

    return NextResponse.json({
      onboarded,
      ready_to_receive: readyToReceivePayments,
      onboarding_complete: onboardingComplete,
      account_id: profile.stripe_connect_account_id,
      requirements_status: requirementsStatus,
    })
  } catch (err) {
    console.error('Connect status error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
