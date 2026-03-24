'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type Stripe from 'stripe'

type ProductWithPrice = Stripe.Product & {
  default_price: Stripe.Price | null
}

export default function StorePage() {
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleBuy = async (product: ProductWithPrice) => {
    const priceId = typeof product.default_price === 'object'
      ? product.default_price?.id
      : product.default_price
    if (!priceId) return

    setPurchasing(product.id)
    try {
      const res = await fetch('/api/products/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId, product_id: product.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // handle error
    } finally {
      setPurchasing(null)
    }
  }

  const formatPrice = (price: Stripe.Price | null) => {
    if (!price || !price.unit_amount) return 'Free'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100)
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ink rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-ink">Forge</span>
            <span className="text-ink4 text-sm">/</span>
            <span className="text-sm text-ink3">Store</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/builders" className="text-sm text-ink3 hover:text-ink transition-colors">
              Browse builders
            </Link>
            <Link href="/dashboard" className="text-sm text-ink3 hover:text-ink transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink mb-1">Marketplace</h1>
          <p className="text-sm text-ink3">Apps and tools built by indie builders</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-forge p-5 animate-pulse">
                <div className="h-4 bg-surface2 rounded w-2/3 mb-3" />
                <div className="h-3 bg-surface2 rounded w-full mb-2" />
                <div className="h-3 bg-surface2 rounded w-4/5 mb-6" />
                <div className="h-8 bg-surface2 rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-forge">
            <p className="text-sm text-ink3 mb-2">No products listed yet</p>
            <Link href="/dashboard/profile" className="text-xs text-blue underline underline-offset-2">
              List your app →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-surface border border-border rounded-forge p-5 flex flex-col">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-ink mb-1.5">{product.name}</h2>
                  {product.description && (
                    <p className="text-xs text-ink3 leading-relaxed mb-4 line-clamp-3">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm font-semibold text-ink">
                    {formatPrice(product.default_price)}
                  </span>
                  <button
                    onClick={() => handleBuy(product)}
                    disabled={purchasing === product.id || !product.default_price}
                    className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-40"
                  >
                    {purchasing === product.id ? 'Redirecting...' : 'Buy →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
