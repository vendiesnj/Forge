import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

// IMPORTANT: Separate webhook secret for V2 Connect thin events.
// Set STRIPE_CONNECT_WEBHOOK_SECRET in your .env.local
//
// Setup in Stripe dashboard:
//   Developers → Webhooks → + Add destination
//   → Events from: Connected accounts
//   → Show advanced options → Payload style: Thin
//   → Add event types:
//       v2.core.account[requirements].updated
//       v2.core.account[configuration.recipient].capability_status_updated
//
// For local dev (Stripe CLI):
//   stripe listen \
//     --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' \
//     --forward-thin-to localhost:3000/api/webhooks/connect

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)

// Thin event shape: { id: string, type: string, created: string, related_object?: { id: string, type: string } }
interface ThinEvent {
  id: string
  type: string
  related_object?: { id: string; type: string }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Missing STRIPE_CONNECT_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Step 1: Verify the webhook signature using constructEvent
  // Thin events use the same HMAC signature scheme as regular webhooks
  let thinEvent: ThinEvent
  try {
    const verified = stripeClient.webhooks.constructEvent(body, sig, webhookSecret)
    thinEvent = verified as unknown as ThinEvent
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    // Step 2: Fetch the full V2 event from Stripe
    // Thin events only contain id + type — always fetch full data before acting
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id)
    const accountId = thinEvent.related_object?.id

    const supabase = createServiceClient()

    switch (event.type) {
      case 'v2.core.account[requirements].updated': {
        // Requirements changed — re-check onboarding status for this connected account
        if (!accountId) break

        const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
          include: ['configuration.recipient', 'requirements'],
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requirementsStatus = (account as any).requirements?.summary?.minimum_deadline?.status
        const onboardingComplete =
          requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const readyToReceive = (account as any)?.configuration?.recipient
          ?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active'

        await supabase
          .from('user_profiles')
          .update({ stripe_connect_onboarded: onboardingComplete && readyToReceive })
          .eq('stripe_connect_account_id', accountId)

        console.log(`Account ${accountId} requirements updated`)
        break
      }

      case 'v2.core.account[configuration.recipient].capability_status_updated': {
        // A capability flipped (e.g. stripe_transfers became active)
        if (!accountId) break

        const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
          include: ['configuration.recipient', 'requirements'],
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const readyToReceive = (account as any)?.configuration?.recipient
          ?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active'

        await supabase
          .from('user_profiles')
          .update({ stripe_connect_onboarded: readyToReceive })
          .eq('stripe_connect_account_id', accountId)

        console.log(`Account ${accountId} capability updated — ready: ${readyToReceive}`)
        break
      }

      default:
        console.log(`Unhandled Connect event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}
