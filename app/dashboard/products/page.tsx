'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/topbar'
import type Stripe from 'stripe'

type ProductWithPrice = Stripe.Product & {
  default_price: Stripe.Price | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [connectStatus, setConnectStatus] = useState<{ onboarded: boolean; account_id: string | null } | null>(null)
  const [onboarding, setOnboarding] = useState(false)

  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/connect/status').then(r => r.json()),
    ]).then(([productsData, connectData]) => {
      setProducts(productsData.products ?? [])
      setConnectStatus(connectData)
    }).finally(() => setLoading(false))
  }, [])

  const handleOnboard = async () => {
    setOnboarding(true)
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setOnboarding(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price_cents: Math.round(parseFloat(form.price) * 100),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProducts(prev => [data.product, ...prev])
      setForm({ name: '', description: '', price: '' })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (price: Stripe.Price | null) => {
    if (!price || !price.unit_amount) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100)
  }

  return (
    <div className="min-h-screen bg-surface2">
      <Topbar title="Products" subtitle="List apps for sale on the Forge store" />
      <main className="max-w-3xl mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-ink mb-1">Products</h1>
            <p className="text-sm text-ink3">List apps and tools for sale on the Forge store</p>
          </div>
          {connectStatus?.onboarded && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              + New product
            </button>
          )}
        </div>

        {/* Stripe Connect banner */}
        {!loading && !connectStatus?.onboarded && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-forge">
            <p className="text-sm font-medium text-amber-800 mb-1">Set up payouts to sell products</p>
            <p className="text-xs text-amber-700 mb-3">
              Connect your Stripe account to receive payments when customers buy your products. Forge takes a 3% platform fee.
            </p>
            <button
              onClick={handleOnboard}
              disabled={onboarding}
              className="px-3 py-1.5 bg-amber-800 text-white text-xs font-medium rounded-forge hover:bg-amber-900 transition-colors disabled:opacity-50"
            >
              {onboarding ? 'Redirecting to Stripe...' : 'Set up payouts →'}
            </button>
          </div>
        )}

        {/* Create product form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 p-4 bg-surface border border-border rounded-forge space-y-3">
            <p className="text-sm font-medium text-ink">New product</p>
            <div>
              <label className="text-xs text-ink3 mb-1 block">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My App"
                className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                required
              />
            </div>
            <div>
              <label className="text-xs text-ink3 mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does your app do?"
                rows={2}
                className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink3 mb-1 block">Price (USD)</label>
              <input
                type="number"
                min="0.50"
                step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="29.00"
                className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                required
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create product'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 border border-border text-xs text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Product list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="bg-surface border border-border rounded-forge p-4 animate-pulse">
                <div className="h-4 bg-surface2 rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface2 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-forge">
            <p className="text-sm text-ink3 mb-1">No products yet</p>
            <p className="text-xs text-ink4">
              {connectStatus?.onboarded
                ? 'Click "+ New product" to list your first app'
                : 'Complete payout setup first'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <div key={product.id} className="bg-surface border border-border rounded-forge p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-ink3 mt-0.5 line-clamp-1">{product.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-ink">
                    {formatPrice(product.default_price)}
                  </span>
                  <a
                    href="/store"
                    target="_blank"
                    className="text-xs text-ink4 hover:text-ink3 transition-colors"
                  >
                    View in store →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
