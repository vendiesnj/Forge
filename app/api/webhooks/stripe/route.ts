import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, tier, role } = session.metadata ?? {}
    if (userId && tier && role) {
      await supabase.from('user_profiles').upsert({
        user_id: userId,
        subscription_tier: role === 'builder' ? 'pro' : tier,
        subscription_status: 'active',
        subscription_id: session.subscription as string,
        role,
      }, { onConflict: 'user_id' })
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const sub = event.data.object as Stripe.Subscription
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('subscription_id', sub.id)
    if (profiles?.[0]) {
      await supabase.from('user_profiles').update({
        subscription_status: 'cancelled',
        subscription_tier: profiles[0].user_id ? undefined : 'free',
      }).eq('subscription_id', sub.id)
    }
  }

  return NextResponse.json({ received: true })
}
