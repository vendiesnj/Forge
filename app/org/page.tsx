'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { MarketplaceListing, ListingType } from '@/types'

const TYPE_LABELS: Record<ListingType, { label: string; emoji: string; color: string }> = {
  showcase:    { label: 'Showcase',    emoji: '🌟', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  acquisition: { label: 'Acquisition', emoji: '💼', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  investment:  { label: 'Investment',  emoji: '📈', color: 'bg-green-50 text-green-700 border-green-100' },
  partnership: { label: 'Partnership', emoji: '🤝', color: 'bg-purple-50 text-purple-700 border-purple-100' },
}

const FILTER_OPTIONS: { value: ListingType | 'all'; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'acquisition', label: '💼 For Sale' },
  { value: 'investment',  label: '📈 Seeking Investment' },
  { value: 'partnership', label: '🤝 Partnership' },
  { value: 'showcase',    label: '🌟 Showcase' },
]

function ListingCard({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) {
  const typeInfo = TYPE_LABELS[listing.listing_type]
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-border rounded-forge p-5 hover:border-border2 hover:shadow-sm transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ink group-hover:text-ink truncate">{listing.name}</h3>
          {listing.tagline && (
            <p className="text-xs text-ink3 mt-0.5 line-clamp-2">{listing.tagline}</p>
          )}
        </div>
        <span className={cn('shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium', typeInfo.color)}>
          {typeInfo.emoji} {typeInfo.label}
        </span>
      </div>

      {/* Stats row */}
      {(listing.arr || listing.customers || listing.team_size) && (
        <div className="flex items-center gap-3 mb-3">
          {listing.arr && (
            <div>
              <p className="text-[9px] text-ink4 uppercase tracking-wide">ARR</p>
              <p className="text-xs font-semibold text-ink">{listing.arr}</p>
            </div>
          )}
          {listing.customers && (
            <div>
              <p className="text-[9px] text-ink4 uppercase tracking-wide">Customers</p>
              <p className="text-xs font-semibold text-ink">{listing.customers}</p>
            </div>
          )}
          {listing.team_size && (
            <div>
              <p className="text-[9px] text-ink4 uppercase tracking-wide">Team</p>
              <p className="text-xs font-semibold text-ink">{listing.team_size}</p>
            </div>
          )}
          {listing.asking_price && (
            <div className="ml-auto">
              <p className="text-[9px] text-ink4 uppercase tracking-wide">Asking</p>
              <p className="text-xs font-bold text-ink">{listing.asking_price}</p>
            </div>
          )}
        </div>
      )}

      {/* Tech stack */}
      {listing.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {listing.tech_stack.slice(0, 5).map(tech => (
            <span key={tech} className="text-[10px] px-1.5 py-0.5 bg-surface2 text-ink3 rounded border border-border">
              {tech}
            </span>
          ))}
          {listing.tech_stack.length > 5 && (
            <span className="text-[10px] px-1.5 py-0.5 text-ink4">+{listing.tech_stack.length - 5}</span>
          )}
        </div>
      )}

      {/* Description */}
      {listing.description && (
        <p className="text-xs text-ink3 line-clamp-2">{listing.description}</p>
      )}
    </button>
  )
}

function ListingModal({ listing, onClose }: { listing: MarketplaceListing; onClose: () => void }) {
  const typeInfo = TYPE_LABELS[listing.listing_type]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-forge border border-border shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-ink">{listing.name}</h2>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0', typeInfo.color)}>
                {typeInfo.emoji} {typeInfo.label}
              </span>
            </div>
            {listing.tagline && <p className="text-sm text-ink3">{listing.tagline}</p>}
          </div>
          <button onClick={onClose} className="text-ink4 hover:text-ink shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Key stats */}
          {(listing.arr || listing.mrr || listing.customers || listing.team_size || listing.founded_year || listing.asking_price) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'ARR', value: listing.arr },
                { label: 'MRR', value: listing.mrr },
                { label: 'Customers', value: listing.customers },
                { label: 'Team size', value: listing.team_size },
                { label: 'Founded', value: listing.founded_year },
                { label: listing.listing_type === 'acquisition' ? 'Asking price' : listing.listing_type === 'investment' ? 'Seeking' : undefined, value: listing.asking_price },
              ].filter(s => s.value).map(stat => (
                <div key={stat.label} className="bg-surface2 rounded-forge p-3 border border-border">
                  <p className="text-[10px] text-ink4 mb-0.5">{stat.label}</p>
                  <p className="text-sm font-semibold text-ink">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-2">About</p>
              <p className="text-sm text-ink2 leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Traction */}
          {listing.traction && (
            <div>
              <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-2">Traction</p>
              <p className="text-sm text-ink2 leading-relaxed">{listing.traction}</p>
            </div>
          )}

          {/* Key features */}
          {listing.key_features?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-2">Key Features</p>
              <ul className="space-y-1">
                {listing.key_features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink2">
                    <span className="text-ink4 mt-0.5 shrink-0">•</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tech stack */}
          {listing.tech_stack?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {listing.tech_stack.map(tech => (
                  <span key={tech} className="text-xs px-2 py-1 bg-surface2 text-ink2 rounded border border-border">{tech}</span>
                ))}
              </div>
            </div>
          )}

          {/* Target market + pricing */}
          <div className="grid grid-cols-2 gap-4">
            {listing.target_market && (
              <div>
                <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1">Target Market</p>
                <p className="text-sm text-ink2">{listing.target_market}</p>
              </div>
            )}
            {listing.pricing_model && (
              <div>
                <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1">Pricing</p>
                <p className="text-sm text-ink2">{listing.pricing_model}</p>
              </div>
            )}
          </div>

          {/* App URL */}
          {listing.url && (
            <div>
              <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1">App URL</p>
              <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue underline underline-offset-2 hover:opacity-70">
                {listing.url}
              </a>
            </div>
          )}
        </div>

        {/* CTA footer */}
        <div className="p-5 border-t border-border bg-surface2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink3">Interested? Reach out directly.</p>
            <div className="flex items-center gap-2 shrink-0">
              {listing.contact_email && (
                <a
                  href={`mailto:${listing.contact_email}?subject=Interested in ${listing.name} on Forge Marketplace`}
                  className="px-3 py-1.5 border border-border text-xs text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors"
                >
                  Email →
                </a>
              )}
              <a
                href={`/org/messages?builder=${listing.user_id}`}
                className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
              >
                Message on Forge →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrgDiscoverPage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ListingType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MarketplaceListing | null>(null)

  useEffect(() => {
    fetch('/api/marketplace/listings')
      .then(r => r.json())
      .then(d => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = listings.filter(l => {
    if (filter !== 'all' && l.listing_type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.name.toLowerCase().includes(q) ||
        l.tagline?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.tech_stack?.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Forge Marketplace</h1>
        <p className="text-sm text-ink3 mt-1">Discover apps built by the Forge community — acquire, invest, or partner.</p>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search apps, tech, keywords..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-forge bg-surface text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-forge border transition-colors whitespace-nowrap',
                filter === f.value ? 'bg-ink text-white border-ink' : 'border-border text-ink3 hover:border-border2'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-surface2 border border-border rounded-forge animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">◎</p>
          <p className="text-sm font-medium text-ink2 mb-1">No listings yet</p>
          <p className="text-xs text-ink4">
            {search || filter !== 'all' ? 'Try adjusting your search or filters.' : 'Be the first to list your app on Forge Marketplace.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing} onClick={() => setSelected(listing)} />
          ))}
        </div>
      )}

      {selected && (
        <ListingModal listing={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
