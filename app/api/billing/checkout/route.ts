import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { BUILDER_PRICE_ID, ORG_PRICES } from '@/lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tier, role } = await req.json() as { tier: string; role: 'builder' | 'org' }
    const supabase = createServiceClient()

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId } })
      customerId = customer.id
      await supabase.from('user_profiles').upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })
    }

    // Resolve price ID
    let priceId: string
    if (role === 'builder') {
      priceId = BUILDER_PRICE_ID
    } else {
      const orgPrice = ORG_PRICES[tier as keyof typeof ORG_PRICES]
      if (!orgPrice) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      priceId = orgPrice.id
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/${role === 'org' ? 'org' : 'dashboard'}/billing?success=1`,
      cancel_url: `${origin}/${role === 'org' ? 'org' : 'dashboard'}/billing?cancelled=1`,
      metadata: { userId, tier, role },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
