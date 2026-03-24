'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import { isBillingLive, getBillingLiveDate } from '@/lib/billing'
import { cn } from '@/lib/utils'

export default function BuilderBillingPage() {
  const [profile, setProfile] = useState<{ subscription_tier?: string; subscription_status?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const billingLive = isBillingLive()
  const liveDate = getBillingLiveDate()

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isPro = profile?.subscription_tier === 'pro' && profile?.subscription_status === 'active'

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro', role: 'builder' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setCheckoutLoading(false)
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
    <>
      <Topbar title="Billing" subtitle="Manage your Forge subscription" />
      <div className="p-5 max-w-2xl mx-auto">

        {/* Beta banner */}
        {!billingLive && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-forge flex items-center gap-3">
            <span className="text-lg">🎉</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">You&apos;re in beta — everything is free right now</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {liveDate
                  ? `Builder membership ($20/month) activates on ${liveDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Enjoy free access until then.`
                  : 'Billing will activate once Forge officially launches. Enjoy free access until then.'}
              </p>
            </div>
          </div>
        )}

        {/* Current plan */}
        <div className="bg-surface border border-border rounded-forge p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-ink4 mb-1">Current plan</p>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">{isPro ? 'Pro' : 'Free'}</h2>
                {!billingLive && <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium border border-amber-200">Beta</span>}
                {isPro && <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium border border-green-200">Active</span>}
              </div>
            </div>
            {isPro ? (
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="px-4 py-2 border border-border rounded-forge text-sm text-ink3 hover:text-ink hover:border-border2 transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'Loading…' : 'Manage billing'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading || loading}
                className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
              >
                {checkoutLoading ? 'Loading…' : billingLive ? 'Upgrade to Pro — $20/mo' : 'Pre-register for Pro'}
              </button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-ink3 uppercase tracking-wide mb-3">What&apos;s included</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { feature: 'Unlimited projects', free: true },
                { feature: 'AI idea analysis', free: true },
                { feature: 'Market research', free: true },
                { feature: 'Build guide generation', free: true },
                { feature: 'Code feature analysis', free: true },
                { feature: 'Forge Marketplace listing', free: false },
                { feature: 'Verified builder badge', free: false },
                { feature: 'Priority AI analysis queue', free: false },
                { feature: 'Org discovery visibility', free: false },
              ].map(item => (
                <div key={item.feature} className={cn('flex items-center gap-2', !item.free && !isPro && 'opacity-40')}>
                  <span className={cn('text-xs', item.free || isPro ? 'text-green-600' : 'text-ink4')}>
                    {item.free || isPro ? '✓' : '✗'}
                  </span>
                  <span className="text-xs text-ink2">{item.feature}</span>
                  {!item.free && <span className="text-[9px] text-amber-500 font-bold">PRO</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing card */}
        {!isPro && (
          <div className="bg-ink text-white rounded-forge p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Forge Pro</h3>
                <p className="text-white/60 text-sm mt-0.5">For builders serious about distribution</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">$20</p>
                <p className="text-white/50 text-xs">/month</p>
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="w-full py-2.5 bg-white text-ink text-sm font-semibold rounded-forge hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {checkoutLoading ? 'Loading…' : billingLive ? 'Get Pro →' : 'Pre-register (free during beta)'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
