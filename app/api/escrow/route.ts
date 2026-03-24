import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()

    const { data: transactions, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Escrow fetch error:', error.message)
      return NextResponse.json({ transactions: [] })
    }

    return NextResponse.json({ transactions: transactions ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { conversation_id, payee_id, amount_cents, description } = await req.json()

    if (!payee_id || !amount_cents || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (amount_cents < 50) {
      return NextResponse.json({ error: 'Amount must be at least $0.50' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get or create Stripe customer for payer
    const { data: payerProfile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = payerProfile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId } })
      customerId = customer.id
      await supabase
        .from('user_profiles')
        .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })
    }

    // Create PaymentIntent with manual capture (funds authorized, not captured)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      capture_method: 'manual',
      customer: customerId,
      description,
      metadata: {
        payer_id: userId,
        payee_id,
        conversation_id: conversation_id ?? '',
      },
    })

    // Create escrow record in DB
    const escrowInsert: Record<string, unknown> = {
      payer_id: userId,
      payee_id,
      amount_cents,
      currency: 'usd',
      description,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
    }
    if (conversation_id) escrowInsert.conversation_id = conversation_id

    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .insert(escrowInsert)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      escrow_id: escrow.id,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
