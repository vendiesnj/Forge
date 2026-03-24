'use client'

import { useState, useEffect } from 'react'
import { isBillingLive, getBillingLiveDate, ORG_PRICES } from '@/lib/billing'
import { cn } from '@/lib/utils'

const TIERS = [
  {
    id: 'explorer',
    label: 'Explorer',
    price: 0,
    desc: 'Get started browsing the marketplace',
    features: ['Browse all listings', 'Save up to 3 apps', 'Basic info only'],
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'starter',
    label: 'Starter',
    price: 49,
    desc: 'For teams actively evaluating apps',
    features: ['Full contact info', 'Unlimited saves', 'Up to 3 team seats', 'Email builder directly'],
    cta: 'Get Starter',
    highlight: false,
  },
  {
    id: 'growth',
    label: 'Growth',
    price: 149,
    desc: 'For deal-driven teams',
    features: ['Everything in Starter', 'Deal pipeline & notes', 'Up to 10 team seats', 'Advanced search filters', 'Priority listings'],
    cta: 'Get Growth',
    highlight: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 499,
    desc: 'For acquisition-focused firms',
    features: ['Everything in Growth', 'Unlimited seats', 'API access', 'Custom integrations', 'Dedicated support'],
    cta: 'Get Enterprise',
    highlight: false,
  },
]

// Suppress unused import warning — ORG_PRICES is used for type reference
void ORG_PRICES

export default function OrgBillingPage() {
  const [profile, setProfile] = useState<{ subscription_tier?: string; subscription_status?: string } | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const billingLive = isBillingLive()
  const liveDate = getBillingLiveDate()

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => setProfile(d.profile)).catch(() => {})
  }, [])

  const currentTier = profile?.subscription_status === 'active' ? profile.subscription_tier : 'explorer'

  const handleCheckout = async (tierId: string) => {
    if (tierId === 'explorer') return
    setCheckoutLoading(tierId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId, role: 'org' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManage = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Org Plans</h1>
        <p className="text-sm text-ink3 mt-1">Find, evaluate, and acquire apps built by the Forge community.</p>
      </div>

      {!billingLive && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-forge flex items-center gap-3">
          <span className="text-lg">🎉</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Currently in beta — all org features are free</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {liveDate
                ? `Paid plans activate ${liveDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
                : 'Paid plans will activate at official launch.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {TIERS.map(tier => {
          const isCurrent = currentTier === tier.id
          return (
            <div
              key={tier.id}
              className={cn(
                'rounded-forge border p-5 flex flex-col',
                tier.highlight ? 'bg-ink text-white border-ink' : 'bg-surface border-border',
                isCurrent && !tier.highlight && 'border-border2'
              )}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn('text-sm font-bold', tier.highlight ? 'text-white' : 'text-ink')}>{tier.label}</h3>
                  {isCurrent && <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold', tier.highlight ? 'bg-white/20 text-white' : 'bg-surface2 text-ink3')}>Current</span>}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  {tier.price === 0
                    ? <span className={cn('text-xl font-bold', tier.highlight ? 'text-white' : 'text-ink')}>Free</span>
                    : <><span className={cn('text-xl font-bold', tier.highlight ? 'text-white' : 'text-ink')}>${tier.price}</span><span className={cn('text-xs', tier.highlight ? 'text-white/60' : 'text-ink4')}>/mo</span></>
                  }
                </div>
                <p className={cn('text-[11px]', tier.highlight ? 'text-white/70' : 'text-ink4')}>{tier.desc}</p>
              </div>

              <ul className="space-y-1.5 flex-1 mb-4">
                {tier.features.map(f => (
                  <li key={f} className={cn('flex items-start gap-1.5 text-xs', tier.highlight ? 'text-white/80' : 'text-ink3')}>
                    <span className={cn('mt-0.5 shrink-0', tier.highlight ? 'text-white/60' : 'text-green-600')}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                tier.id !== 'explorer' ? (
                  <button onClick={handleManage} disabled={portalLoading} className={cn('w-full py-2 text-xs font-medium rounded-forge transition-colors', tier.highlight ? 'bg-white/20 text-white hover:bg-white/30' : 'border border-border text-ink3 hover:text-ink')}>
                    {portalLoading ? 'Loading…' : 'Manage'}
                  </button>
                ) : null
              ) : (
                <button
                  onClick={() => handleCheckout(tier.id)}
                  disabled={!!checkoutLoading || tier.id === 'explorer'}
                  className={cn(
                    'w-full py-2 text-xs font-medium rounded-forge transition-colors disabled:opacity-50',
                    tier.highlight ? 'bg-white text-ink hover:bg-white/90' : 'bg-ink text-white hover:bg-ink2'
                  )}
                >
                  {checkoutLoading === tier.id ? 'Loading…' : billingLive ? tier.cta : `${tier.cta} (free now)`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
