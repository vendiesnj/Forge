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

    // Only payer can refund
    if (escrow.payer_id !== userId) {
      return NextResponse.json({ error: 'Only the payer can request a refund' }, { status: 403 })
    }

    const refundableStatuses = ['pending', 'held']
    if (!refundableStatuses.includes(escrow.status)) {
      return NextResponse.json(
        { error: 'This escrow cannot be refunded in its current status' },
        { status: 400 }
      )
    }

    if (!escrow.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'No payment intent associated' }, { status: 400 })
    }

    // Cancel the PaymentIntent (if not yet captured) — this releases the authorization
    const paymentIntent = await stripe.paymentIntents.retrieve(escrow.stripe_payment_intent_id)

    if (paymentIntent.status === 'requires_capture') {
      await stripe.paymentIntents.cancel(escrow.stripe_payment_intent_id)
    } else if (paymentIntent.status === 'succeeded') {
      // Already captured — issue a refund
      await stripe.refunds.create({ payment_intent: escrow.stripe_payment_intent_id })
    } else {
      // pending/requires_payment_method/requires_confirmation etc. — just cancel
      await stripe.paymentIntents.cancel(escrow.stripe_payment_intent_id)
    }

    // Update escrow record
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({ status: 'refunded' })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
