import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-02-25.clover' })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceClient()

    // Fetch escrow record
    const { data: escrow, error: fetchError } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    // Only payer can release
    if (escrow.payer_id !== userId) {
      return NextResponse.json({ error: 'Only the payer can release funds' }, { status: 403 })
    }

    if (escrow.status !== 'held') {
      return NextResponse.json({ error: 'Funds must be in held status to release' }, { status: 400 })
    }

    if (!escrow.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No payment intent associated' }, { status: 400 })
    }

    // Get payee's Stripe Connect account
    const { data: payeeProfile } = await supabase
      .from('user_profiles')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', escrow.payee_id)
      .single()

    if (!payeeProfile?.stripe_connect_account_id || !payeeProfile?.stripe_connect_onboarded) {
      return NextResponse.json(
        { error: 'Builder has not completed Stripe Connect onboarding' },
        { status: 400 }
      )
    }

    // Capture the payment intent
    await stripe.paymentIntents.capture(escrow.stripe_payment_intent_id)

    // Calculate platform fee (e.g., 3%) and transfer remainder to builder
    const platformFee = Math.floor(escrow.amount_cents * 0.03)
    const transferAmount = escrow.amount_cents - platformFee

    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: escrow.currency,
      destination: payeeProfile.stripe_connect_account_id,
      description: `Escrow release: ${escrow.description}`,
      metadata: { escrow_id: id },
    })

    // Update escrow record
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        stripe_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, transfer_id: transfer.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
