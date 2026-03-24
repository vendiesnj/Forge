import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY)

// POST — create a Checkout Session for purchasing a product
// Uses a Destination Charge: platform charges the customer, transfers to builder minus fee
export async function POST(req: NextRequest) {
  try {
    const { price_id, product_id } = await req.json()

    if (!price_id || !product_id) {
      return NextResponse.json({ error: 'price_id and product_id required' }, { status: 400 })
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'

    // Fetch the product to get the connected account stored in metadata
    const product = await stripeClient.products.retrieve(product_id)
    const connectedAccountId = product.metadata?.connected_account_id

    if (!connectedAccountId) {
      return NextResponse.json(
        { error: 'This product is not linked to a builder account' },
        { status: 400 }
      )
    }

    // Fetch price to know the amount for fee calculation
    const price = await stripeClient.prices.retrieve(price_id)
    const amount = price.unit_amount ?? 0

    // Platform fee: 3% of the transaction
    // Remaining 97% is transferred to the builder's connected account
    const applicationFeeAmount = Math.floor(amount * 0.03)

    // Create a Destination Charge via Checkout Session
    // The charge is made to the platform, which then transfers funds to the builder
    const session = await stripeClient.checkout.sessions.create({
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      payment_intent_data: {
        // Platform takes 3% application fee
        application_fee_amount: applicationFeeAmount,
        // Remaining funds go to the builder's connected account
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      mode: 'payment',
      success_url: `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
