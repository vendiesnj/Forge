'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

interface EscrowTransaction {
  id: string
  conversation_id: string | null
  payer_id: string
  payee_id: string
  amount_cents: number
  currency: string
  description: string
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed'
  created_at: string
  held_at: string | null
  released_at: string | null
}

interface Conversation {
  id: string
  subject: string | null
  builder_id: string
  participant_id: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  held: 'Held in Escrow',
  released: 'Released',
  refunded: 'Refunded',
  disputed: 'Disputed',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-ink3 bg-surface2',
  held: 'text-amber-700 bg-amber-50',
  released: 'text-green-700 bg-green-50',
  refunded: 'text-ink4 bg-surface2',
  disputed: 'text-red-700 bg-red-50',
}

function formatCents(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function EscrowInner() {
  const { userId } = useAuth()
  const searchParams = useSearchParams()

  const [transactions, setTransactions] = useState<EscrowTransaction[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [newPayee, setNewPayee] = useState('')
  const [newConvId, setNewConvId] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [txRes, convRes] = await Promise.all([
        fetch('/api/escrow'),
        fetch('/api/conversations'),
      ])
      if (txRes.ok) {
        const d = await txRes.json()
        setTransactions(d.transactions ?? [])
      }
      if (convRes.ok) {
        const d = await convRes.json()
        setConversations(d.conversations ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const param = searchParams.get('escrow')
    if (param === 'success') {
      setSuccessMsg('Payment authorized. Funds are held in escrow.')
      fetchAll()
    }
  }, [searchParams, fetchAll])

  const handleRelease = async (id: string) => {
    setActionLoading(id + '-release')
    setError(null)
    try {
      const res = await fetch(`/api/escrow/${id}/release`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to release funds'); return }
      setSuccessMsg('Funds released to builder.')
      fetchAll()
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefund = async (id: string) => {
    setActionLoading(id + '-refund')
    setError(null)
    try {
      const res = await fetch(`/api/escrow/${id}/refund`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to process refund'); return }
      setSuccessMsg('Refund processed.')
      fetchAll()
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreate = async () => {
    if (!newPayee.trim() || !newAmount || !newDescription.trim()) {
      setCreateError('Builder ID, amount, and description are required')
      return
    }
    const amountCents = Math.round(parseFloat(newAmount) * 100)
    if (isNaN(amountCents) || amountCents < 50) {
      setCreateError('Amount must be at least $0.50')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payee_id: newPayee.trim(),
          conversation_id: newConvId || null,
          amount_cents: amountCents,
          description: newDescription.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? 'Failed to create escrow'); return }
      setShowModal(false)
      setNewPayee('')
      setNewConvId('')
      setNewAmount('')
      setNewDescription('')
      setSuccessMsg('Escrow created. Complete payment to hold funds.')
      fetchAll()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-surface shrink-0">
        <h1 className="text-base font-semibold text-ink">Escrow</h1>
        <p className="text-xs text-ink4 mt-0.5">Hold and release payments to builders securely</p>
      </div>

      <div className="flex-1 px-6 py-6 max-w-3xl mx-auto w-full space-y-6">

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-forge text-sm text-red-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">&times;</button>
          </div>
        )}
        {successMsg && (
          <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-forge text-sm text-green-700 flex items-center justify-between">
            {successMsg}
            <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-600 ml-4">&times;</button>
          </div>
        )}

        {/* How it works */}
        <div className="px-4 py-3 bg-surface border border-border rounded-forge">
          <p className="text-xs font-medium text-ink mb-1">How escrow works</p>
          <p className="text-xs text-ink4">
            Create an escrow to authorize payment for a builder. Funds are held securely and only released when you approve the work. You can request a refund at any time before release. A 3% platform fee applies on release.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Transactions</h2>
          <button
            onClick={() => { setShowModal(true); setCreateError(null) }}
            className="px-3 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
          >
            + New Escrow
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-border border-t-ink3 rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-12 h-12 bg-surface2 rounded-forge flex items-center justify-center">
              <svg className="w-6 h-6 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-ink4 mb-1">No escrow transactions yet</p>
              <p className="text-xs text-ink4">Start by finding a builder in Discover and creating an escrow for your project.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors"
            >
              Create escrow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isPayer = tx.payer_id === userId
              const canRelease = isPayer && tx.status === 'held'
              const canRefund = isPayer && ['pending', 'held'].includes(tx.status)

              return (
                <div key={tx.id} className="border border-border rounded-forge bg-surface p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{tx.description}</p>
                      <p className="text-xs text-ink4 mt-0.5">
                        To: {tx.payee_id.slice(0, 16)}…
                        {' · '}
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-base font-semibold text-ink">
                        {formatCents(tx.amount_cents, tx.currency)}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          STATUS_COLORS[tx.status] ?? 'text-ink4 bg-surface2'
                        )}
                      >
                        {STATUS_LABELS[tx.status] ?? tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {canRelease && (
                      <button
                        onClick={() => handleRelease(tx.id)}
                        disabled={actionLoading === tx.id + '-release'}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-forge hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === tx.id + '-release' ? 'Releasing…' : 'Release to builder'}
                      </button>
                    )}
                    {canRefund && (
                      <button
                        onClick={() => handleRefund(tx.id)}
                        disabled={actionLoading === tx.id + '-refund'}
                        className="px-3 py-1 border border-border text-xs text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === tx.id + '-refund' ? 'Refunding…' : 'Request refund'}
                      </button>
                    )}
                    {tx.status === 'released' && (
                      <span className="text-xs text-green-700">
                        Released {tx.released_at ? formatDate(tx.released_at) : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Escrow Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface border border-border rounded-forge w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">New Escrow</h2>
              <button onClick={() => setShowModal(false)} className="text-ink4 hover:text-ink transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Builder User ID *</label>
                <input
                  value={newPayee}
                  onChange={(e) => setNewPayee(e.target.value)}
                  placeholder="Paste builder's Clerk user ID…"
                  className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Link to conversation (optional)</label>
                <select
                  value={newConvId}
                  onChange={(e) => setNewConvId(e.target.value)}
                  className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink focus:outline-none focus:border-border2"
                >
                  <option value="">None</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject ?? `Conversation ${c.id.slice(0, 8)}…`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Amount (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink4 text-sm">$</span>
                  <input
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    min="0.50"
                    step="0.01"
                    className="w-full text-sm bg-surface2 border border-border rounded-forge pl-7 pr-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink3 mb-1">Description *</label>
                <input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. MVP build — milestone 1"
                  className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                />
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
              <p className="text-xs text-ink4">
                Funds are authorized but not captured until you release them to the builder. A 3% platform fee applies on release.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Escrow'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-border text-sm text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgEscrowPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-border border-t-ink3 rounded-full animate-spin" /></div>}>
      <EscrowInner />
    </Suspense>
  )
}
