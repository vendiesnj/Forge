export function isBillingLive(): boolean {
  const d = process.env.NEXT_PUBLIC_BILLING_LIVE_DATE
  if (!d) return false
  return new Date() >= new Date(d)
}

export function getBillingLiveDate(): Date | null {
  const d = process.env.NEXT_PUBLIC_BILLING_LIVE_DATE
  if (!d) return null
  return new Date(d)
}

export const BUILDER_PRICE_ID = process.env.STRIPE_BUILDER_PRICE_ID ?? ''

export const ORG_PRICES = {
  starter:    { id: process.env.STRIPE_ORG_STARTER_PRICE_ID ?? '',    label: 'Starter',    monthly: 49,  seats: 3 },
  growth:     { id: process.env.STRIPE_ORG_GROWTH_PRICE_ID ?? '',     label: 'Growth',     monthly: 149, seats: 10 },
  enterprise: { id: process.env.STRIPE_ORG_ENTERPRISE_PRICE_ID ?? '', label: 'Enterprise', monthly: 499, seats: 999 },
} as const

export type OrgTier = 'explorer' | keyof typeof ORG_PRICES
export type BuilderTier = 'free' | 'pro'
