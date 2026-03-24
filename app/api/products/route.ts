import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)

// GET — list all active products (public storefront)
export async function GET() {
  try {
    // Fetch products from Stripe at the platform level
    const products = await stripeClient.products.list({
      active: true,
      expand: ['data.default_price'],
    })

    return NextResponse.json({ products: products.data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST — create a product (authenticated builder)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description, price_cents, currency = 'usd' } = await req.json()

    if (!name || !price_cents) {
      return NextResponse.json({ error: 'name and price_cents are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get the builder's Connect account ID — needed to route payments to them
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', userId)
      .single()

    if (!profile?.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Complete Stripe Connect onboarding before creating products' },
        { status: 400 }
      )
    }

    // Create the product at the platform level (not on the connected account)
    // We store the connected_account_id in metadata so checkout can route payment correctly
    const product = await stripeClient.products.create({
      name,
      description: description ?? undefined,
      default_price_data: {
        unit_amount: price_cents,
        currency,
      },
      metadata: {
        // This maps the product to the builder's Connect account for destination charges
        connected_account_id: profile.stripe_connect_account_id,
        builder_user_id: userId,
      },
    })

    return NextResponse.json({ product })
  } catch (err) {
    console.error('Product create error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create product' },
      { status: 500 }
    )
  }
}
