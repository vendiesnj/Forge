import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

// IMPORTANT: Set STRIPE_SECRET_KEY in your .env.local
// Get it from: https://dashboard.stripe.com/test/apikeys
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

// Initialize Stripe client — used for ALL Stripe requests
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await currentUser()
    const supabase = createServiceClient()
    const origin = req.headers.get('origin') ?? 'http://localhost:3000'

    // Step 1: Check if this builder already has a Connect account stored in DB
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_connect_account_id')
      .eq('user_id', userId)
      .single()

    let connectAccountId = profile?.stripe_connect_account_id

    if (!connectAccountId) {
      // Step 2: Create a new V2 Connect account (marketplace model)
      // The platform (Forge) is responsible for fees and losses collection.
      // We request stripe_transfers capability so the builder can receive payouts.
      // NOTE: Do NOT pass top-level type: 'express' — that is the V1 pattern.
      const account = await stripeClient.v2.core.accounts.create({
        display_name: user?.fullName ?? user?.username ?? 'Builder',
        contact_email: user?.emailAddresses[0]?.emailAddress ?? '',
        identity: {
          country: 'us', // Default to US — update if supporting international
        },
        dashboard: 'express', // Builder gets an Express dashboard to track payouts
        defaults: {
          responsibilities: {
            // Platform (Forge) collects fees and is responsible for losses
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: {
                  requested: true, // Request ability to receive transfers
                },
              },
            },
          },
        },
      })

      connectAccountId = account.id

      // Step 3: Store the mapping from this user to their Stripe Connect account ID
      await supabase
        .from('user_profiles')
        .upsert(
          { user_id: userId, stripe_connect_account_id: connectAccountId },
          { onConflict: 'user_id' }
        )
    }

    // Step 4: Create a V2 Account Link for the onboarding flow
    // The builder is redirected to Stripe to complete KYC, add bank account, etc.
    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: connectAccountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'], // Must match what we requested above
          refresh_url: `${origin}/dashboard/escrow?connect=refresh`,
          return_url: `${origin}/dashboard/escrow?connect=success&accountId=${connectAccountId}`,
        },
      },
    })

    return NextResponse.json({ url: accountLink.url, account_id: connectAccountId })
  } catch (err) {
    console.error('Connect onboard error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
