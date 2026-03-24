'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/topbar'
import { useProject } from '@/components/project-context'
import { cn } from '@/lib/utils'
import type { ListingType, ListingStatus, MarketplaceListing } from '@/types'

const LISTING_TYPES: { value: ListingType; label: string; emoji: string; desc: string }[] = [
  { value: 'showcase',    emoji: '🌟', label: 'Showcase',    desc: 'Show off your work to the community' },
  { value: 'acquisition', emoji: '💼', label: 'Acquisition', desc: 'Looking to sell your app' },
  { value: 'investment',  emoji: '📈', label: 'Investment',  desc: 'Seeking funding or investors' },
  { value: 'partnership', emoji: '🤝', label: 'Partnership', desc: 'Looking for co-founders or partners' },
]

const STATUS_BADGE: Record<ListingStatus, { label: string; color: string }> = {
  draft:  { label: 'Draft',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  active: { label: 'Active', color: 'bg-green-50 text-green-700 border-green-200' },
  closed: { label: 'Closed', color: 'bg-surface2 text-ink4 border-border' },
}

interface AnalysisResult {
  name?: string
  tagline?: string
  description?: string
  tech_stack?: string[]
  key_features?: string[]
  pricing_model?: string
  target_market?: string
  traction?: string
  estimated_arr?: string
  estimated_customers?: string
  valuation_note?: string
  strengths?: string[]
  risks?: string[]
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', 'coverage'])
const IGNORED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.zip', '.lock'])

// ─── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  listing: MarketplaceListing
  onClose: () => void
  onSaved: () => void
}

function EditModal({ listing, onClose, onSaved }: EditModalProps) {
  const [name, setName] = useState(listing.name)
  const [tagline, setTagline] = useState(listing.tagline ?? '')
  const [description, setDescription] = useState(listing.description ?? '')
  const [status, setStatus] = useState<ListingStatus>(listing.status)
  const [listingType, setListingType] = useState<ListingType>(listing.listing_type)
  const [askingPrice, setAskingPrice] = useState(listing.asking_price ?? '')
  const [contactEmail, setContactEmail] = useState(listing.contact_email ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/marketplace/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          status,
          listing_type: listingType,
          asking_price: askingPrice.trim() || null,
          contact_email: contactEmail.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-forge w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">Edit Listing</h2>
          <button onClick={onClose} className="text-ink4 hover:text-ink transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] text-ink3 mb-1">App name <span className="text-red">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Tagline</label>
            <input
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-ink3 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ListingStatus)}
                className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink focus:outline-none focus:border-border2"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-ink3 mb-1">Listing type</label>
              <select
                value={listingType}
                onChange={e => setListingType(e.target.value as ListingType)}
                className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink focus:outline-none focus:border-border2"
              >
                {LISTING_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          {(listingType === 'acquisition' || listingType === 'investment') && (
            <div>
              <label className="block text-[11px] text-ink3 mb-1">
                {listingType === 'acquisition' ? 'Asking price' : 'Investment sought'}
              </label>
              <input
                value={askingPrice}
                onChange={e => setAskingPrice(e.target.value)}
                placeholder={listingType === 'acquisition' ? '$50k' : '$200k for 15%'}
                className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Contact email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="hello@myapp.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>
          {error && <p className="text-xs text-red">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-border rounded-forge text-sm text-ink3 hover:text-ink hover:border-border2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 py-2 bg-ink text-white rounded-forge text-sm font-medium hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
              )}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── My Listings Tab ───────────────────────────────────────────────────────────

interface MyListingsProps {
  onSwitchToList: () => void
}

function MyListings({ onSwitchToList }: MyListingsProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/marketplace/listings?mine=1')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setListings(data.listings ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await fetch(`/api/marketplace/listings/${id}`, { method: 'DELETE' })
      await fetchListings()
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="w-5 h-5 animate-spin text-ink3" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-red mb-3">{error}</p>
        <button onClick={fetchListings} className="text-xs text-ink3 hover:text-ink transition-colors underline">
          Try again
        </button>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-forge p-10 text-center">
        <p className="text-sm font-medium text-ink mb-1">No listings yet</p>
        <p className="text-xs text-ink4 mb-5">You haven&apos;t listed any apps yet</p>
        <button
          onClick={onSwitchToList}
          className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors"
        >
          List your app
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 pb-6">
        {listings.map(listing => {
          const badge = STATUS_BADGE[listing.status]
          const typeInfo = LISTING_TYPES.find(t => t.value === listing.listing_type)
          return (
            <div key={listing.id} className="bg-surface border border-border rounded-forge p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold text-ink">{listing.name}</h3>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                    {typeInfo && (
                      <span className="text-[10px] text-ink4">
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                    )}
                  </div>
                  {listing.tagline && (
                    <p className="text-xs text-ink3 mb-1">{listing.tagline}</p>
                  )}
                  {listing.description && (
                    <p className="text-xs text-ink4 line-clamp-2">{listing.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {listing.arr && (
                      <span className="text-[10px] text-ink4">ARR: {listing.arr}</span>
                    )}
                    {listing.asking_price && (
                      <span className="text-[10px] text-ink4">Asking: {listing.asking_price}</span>
                    )}
                    {listing.contact_email && (
                      <span className="text-[10px] text-ink4">{listing.contact_email}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingListing(listing)}
                    className="px-3 py-1.5 border border-border rounded-forge text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(listing.id, listing.name)}
                    disabled={deletingId === listing.id}
                    className="px-3 py-1.5 border border-red/30 rounded-forge text-xs text-red hover:bg-red/5 transition-colors disabled:opacity-50"
                  >
                    {deletingId === listing.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editingListing && (
        <EditModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            setEditingListing(null)
            fetchListings()
          }}
        />
      )}
    </>
  )
}

// ─── List Your App Form ────────────────────────────────────────────────────────

interface ListFormProps {
  onSaved: () => void
}

function ListForm({ onSaved }: ListFormProps) {
  const { activeProject } = useProject()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [listingType, setListingType] = useState<ListingType>('showcase')
  const [url, setUrl] = useState(activeProject?.vercel_url ?? '')
  const [name, setName] = useState(activeProject?.name ?? '')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState(activeProject?.idea ?? '')
  const [arr, setArr] = useState('')
  const [mrr, setMrr] = useState('')
  const [customers, setCustomers] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [pricingModel, setPricingModel] = useState('')
  const [targetMarket, setTargetMarket] = useState('')
  const [traction, setTraction] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [techStack, setTechStack] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')

  const [files, setFiles] = useState<Array<{ name: string; content: string }>>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const items = Array.from(e.target.files ?? [])
    const loaded: Array<{ name: string; content: string }> = []
    let pending = 0
    const filtered = items.filter(f => {
      const parts = f.webkitRelativePath.split('/')
      if (parts.some(p => IGNORED_DIRS.has(p))) return false
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      return !IGNORED_EXTS.has(ext) && f.size < 200_000
    }).slice(0, 60)

    if (filtered.length === 0) return
    pending = filtered.length
    filtered.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        loaded.push({ name: file.webkitRelativePath || file.name, content: ev.target?.result as string })
        pending--
        if (pending === 0) setFiles(loaded)
      }
      reader.readAsText(file)
    })
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const manualData: Record<string, string> = {}
      if (arr) manualData['ARR'] = arr
      if (customers) manualData['Customer count'] = customers
      if (teamSize) manualData['Team size'] = teamSize
      if (pricingModel) manualData['Pricing model'] = pricingModel
      if (description) manualData['Description'] = description

      const res = await fetch('/api/marketplace/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url || undefined, files: files.length ? files : undefined, manualData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const result: AnalysisResult = data.result
      setAnalysisResult(result)

      // Auto-fill empty fields
      if (!name && result.name) setName(result.name)
      if (!tagline && result.tagline) setTagline(result.tagline)
      if (!description && result.description) setDescription(result.description)
      if (!techStack && result.tech_stack?.length) setTechStack(result.tech_stack.join(', '))
      if (!keyFeatures && result.key_features?.length) setKeyFeatures(result.key_features.join('\n'))
      if (!pricingModel && result.pricing_model) setPricingModel(result.pricing_model)
      if (!targetMarket && result.target_market) setTargetMarket(result.target_market)
      if (!traction && result.traction) setTraction(result.traction)
      if (!arr && result.estimated_arr) setArr(result.estimated_arr)
      if (!customers && result.estimated_customers) setCustomers(result.estimated_customers)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async (status: 'draft' | 'active') => {
    if (!name.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          url: url.trim() || null,
          arr: arr.trim() || null,
          mrr: mrr.trim() || null,
          customers: customers.trim() || null,
          team_size: teamSize.trim() || null,
          founded_year: foundedYear.trim() || null,
          pricing_model: pricingModel.trim() || null,
          target_market: targetMarket.trim() || null,
          traction: traction.trim() || null,
          asking_price: askingPrice.trim() || null,
          contact_email: contactEmail.trim() || null,
          tech_stack: techStack ? techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
          key_features: keyFeatures ? keyFeatures.split('\n').map(s => s.trim()).filter(Boolean) : [],
          listing_type: listingType,
          status,
          ai_summary: analysisResult ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(true)
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="bg-surface border border-border rounded-forge p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3 3 7-6" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-ink mb-2">Listing submitted!</h2>
        <p className="text-sm text-ink3 mb-6">Your app is now visible to organizations browsing the Forge Marketplace.</p>
        <button onClick={() => setSaved(false)} className="px-4 py-2 border border-border rounded-forge text-sm text-ink3 hover:text-ink transition-colors">
          Submit another
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Listing type */}
      <div className="bg-surface border border-border rounded-forge p-4">
        <p className="text-xs font-semibold text-ink2 mb-3">What are you looking for?</p>
        <div className="grid grid-cols-2 gap-2">
          {LISTING_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setListingType(t.value)}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-forge border text-left transition-all',
                listingType === t.value ? 'bg-ink text-white border-ink' : 'border-border hover:border-border2'
              )}
            >
              <span className="text-xl shrink-0 mt-0.5">{t.emoji}</span>
              <div>
                <p className={cn('text-xs font-medium', listingType === t.value ? 'text-white' : 'text-ink')}>{t.label}</p>
                <p className={cn('text-[10px] mt-0.5', listingType === t.value ? 'text-white/60' : 'text-ink4')}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI analysis */}
      <div className="bg-surface border border-border rounded-forge p-4">
        <p className="text-xs font-semibold text-ink2 mb-1">Analyze with AI</p>
        <p className="text-[11px] text-ink4 mb-3">Paste your app URL and/or upload your code folder. Claude will extract stats, features, and tech stack automatically.</p>
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://myapp.com"
            className="flex-1 px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-forge text-xs text-ink3 hover:text-ink hover:border-border2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload code folder
          </button>
          {files.length > 0 && (
            <span className="text-[11px] text-ink3">{files.length} files loaded</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in standard types
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={handleFolderUpload}
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || (!url && files.length === 0)}
            className="ml-auto px-4 py-1.5 bg-ink text-white text-xs font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing && (
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
              </svg>
            )}
            {analyzing ? 'Analyzing...' : '✦ Analyze with AI'}
          </button>
        </div>
        {/* Security notice */}
        <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-surface2 border border-border rounded-forge">
          <svg className="w-3 h-3 text-ink4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-[10px] text-ink4 leading-relaxed">
            <span className="font-medium text-ink3">Code is never stored.</span>{' '}
            Files are read in your browser and sent directly to Claude for analysis only. Secrets and dependencies are automatically excluded.
          </p>
        </div>
        {analyzeError && <p className="mt-2 text-xs text-red">{analyzeError}</p>}
        {analysisResult && (
          <div className="mt-3 p-3 bg-surface2 rounded-forge border border-border">
            <p className="text-[11px] font-medium text-ink2 mb-2">✓ Analysis complete — fields auto-filled below</p>
            {analysisResult.valuation_note && (
              <p className="text-[11px] text-ink3 mb-1.5">💡 {analysisResult.valuation_note}</p>
            )}
            {analysisResult.strengths && analysisResult.strengths.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysisResult.strengths.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-100">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* App info */}
      <div className="bg-surface border border-border rounded-forge p-4 space-y-3">
        <p className="text-xs font-semibold text-ink2">App Info</p>
        <div>
          <label className="block text-[11px] text-ink3 mb-1">App name <span className="text-red">*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My App"
            className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink3 mb-1">Tagline</label>
          <input
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="One sentence that nails what you do"
            className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink3 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="What does your app do? Who is it for?"
            className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Tech stack</label>
            <input
              value={techStack}
              onChange={e => setTechStack(e.target.value)}
              placeholder="Next.js, Supabase, Stripe..."
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Pricing model</label>
            <input
              value={pricingModel}
              onChange={e => setPricingModel(e.target.value)}
              placeholder="Freemium, subscription..."
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-ink3 mb-1">Key features (one per line)</label>
          <textarea
            value={keyFeatures}
            onChange={e => setKeyFeatures(e.target.value)}
            rows={3}
            placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
            className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink3 mb-1">Target market</label>
          <input
            value={targetMarket}
            onChange={e => setTargetMarket(e.target.value)}
            placeholder="e.g. SMB SaaS companies, indie developers..."
            className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
          />
        </div>
      </div>

      {/* Stats & traction */}
      <div className="bg-surface border border-border rounded-forge p-4 space-y-3">
        <p className="text-xs font-semibold text-ink2">Stats & Traction</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-ink3 mb-1">ARR</label>
            <input value={arr} onChange={e => setArr(e.target.value)} placeholder="$24k" className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">MRR</label>
            <input value={mrr} onChange={e => setMrr(e.target.value)} placeholder="$2k" className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Customers</label>
            <input value={customers} onChange={e => setCustomers(e.target.value)} placeholder="450" className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Team size</label>
            <input value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="2" className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
          </div>
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Founded</label>
            <input value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="2023" className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-ink3 mb-1">Traction highlights</label>
          <textarea
            value={traction}
            onChange={e => setTraction(e.target.value)}
            rows={2}
            placeholder="e.g. 40% MoM growth, featured on Product Hunt, $10k MRR in 6 months..."
            className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
          />
        </div>
      </div>

      {/* Listing details */}
      {listingType !== 'showcase' && (
        <div className="bg-surface border border-border rounded-forge p-4 space-y-3">
          <p className="text-xs font-semibold text-ink2">Listing Details</p>
          {(listingType === 'acquisition' || listingType === 'investment') && (
            <div>
              <label className="block text-[11px] text-ink3 mb-1">
                {listingType === 'acquisition' ? 'Asking price' : 'Investment sought'}
              </label>
              <input
                value={askingPrice}
                onChange={e => setAskingPrice(e.target.value)}
                placeholder={listingType === 'acquisition' ? '$50k' : '$200k for 15%'}
                className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] text-ink3 mb-1">Contact email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="hello@myapp.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
            />
          </div>
        </div>
      )}

      {saveError && <p className="text-xs text-red">{saveError}</p>}

      {/* Actions */}
      <div className="flex gap-2 pb-6">
        <button
          onClick={() => handleSubmit('draft')}
          disabled={saving || !name.trim()}
          className="flex-1 py-2.5 border border-border rounded-forge text-sm text-ink3 hover:text-ink hover:border-border2 transition-colors disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          onClick={() => handleSubmit('active')}
          disabled={saving || !name.trim()}
          className="flex-2 px-6 py-2.5 bg-ink text-white rounded-forge text-sm font-medium hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && (
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
            </svg>
          )}
          {saving ? 'Publishing...' : 'Publish to Marketplace'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'list' | 'my-listings'

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('list')

  return (
    <>
      <Topbar title="Forge Marketplace" subtitle={tab === 'list' ? 'List your app' : 'My listings'} />
      <div className="p-5 max-w-2xl mx-auto space-y-5">

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-surface2 border border-border rounded-forge w-fit">
          <button
            onClick={() => setTab('list')}
            className={cn(
              'px-4 py-1.5 rounded text-xs font-medium transition-colors',
              tab === 'list'
                ? 'bg-surface text-ink shadow-sm border border-border'
                : 'text-ink3 hover:text-ink'
            )}
          >
            List Your App
          </button>
          <button
            onClick={() => setTab('my-listings')}
            className={cn(
              'px-4 py-1.5 rounded text-xs font-medium transition-colors',
              tab === 'my-listings'
                ? 'bg-surface text-ink shadow-sm border border-border'
                : 'text-ink3 hover:text-ink'
            )}
          >
            My Listings
          </button>
        </div>

        {tab === 'list' && (
          <ListForm onSaved={() => setTab('my-listings')} />
        )}

        {tab === 'my-listings' && (
          <MyListings onSwitchToList={() => setTab('list')} />
        )}

      </div>
    </>
  )
}
