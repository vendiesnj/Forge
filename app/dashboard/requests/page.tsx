'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/topbar'
import { SubmitBuildModal } from '@/components/submit-build-modal'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { BuildRequest, Submission } from '@/types'

type Tab = 'browse' | 'post' | 'mine'

const BUDGETS = ['Under $500', '$500–$1,000', '$1,000–$2,500', '$2,500–$5,000', '$5,000–$10,000', '$10,000+']
const DEADLINES = [7, 14, 30, 60, 90]
const CATEGORIES = ['Web App', 'Mobile App', 'API / Backend', 'Chrome Extension', 'CLI Tool', 'Dashboard', 'Landing Page', 'Other']

const statusColors: Record<string, string> = {
  open: 'tag-green',
  closed: 'tag-gray',
  filled: 'tag-blue',
}

const submissionStatusColors: Record<string, string> = {
  pending: 'tag-gray',
  viewed: 'tag-blue',
  accepted: 'tag-green',
  rejected: 'tag-red',
}

export default function RequestsPage() {
  const [tab, setTab] = useState<Tab>('browse')
  const [requests, setRequests] = useState<BuildRequest[]>([])
  const [myRequests, setMyRequests] = useState<BuildRequest[]>([])
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<BuildRequest | null>(null)
  const [selectedSubmissions, setSelectedSubmissions] = useState<Submission[]>([])
  const [submitModal, setSubmitModal] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [postError, setPostError] = useState('')
  const [posting, setPosting] = useState(false)

  // Post form state
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    budget: BUDGETS[2],
    deadline_days: 30,
    category: CATEGORIES[0],
    company_name: '',
    anonymous: true,
    demo_required: true,
    notify_on_submission: true,
  })

  const loadBrowse = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/builds')
      const data = await res.json()
      setRequests(data.data || [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMine = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/builds?mine=true')
      const data = await res.json()
      setMyRequests(data.data || [])
    } catch {
      setMyRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'browse') loadBrowse()
    if (tab === 'mine') loadMine()
  }, [tab, loadBrowse, loadMine])

  const loadSubmissions = async (req: BuildRequest) => {
    try {
      const res = await fetch(`/api/builds/${req.id}/submissions`)
      const data = await res.json()
      setSelectedSubmissions(data.data || [])
    } catch {
      setSelectedSubmissions([])
    }
  }

  const selectRequest = (req: BuildRequest) => {
    setSelected(req)
    loadSubmissions(req)
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setPosting(true)
    setPostError('')

    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postForm),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')

      setPostSuccess(true)
      setPostForm({
        title: '',
        description: '',
        budget: BUDGETS[2],
        deadline_days: 30,
        category: CATEGORIES[0],
        company_name: '',
        anonymous: true,
        demo_required: true,
        notify_on_submission: true,
      })
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <>
      <Topbar title="Build Requests" subtitle="Marketplace" />
      <div className="p-5 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-surface2 p-1 rounded-forge border border-border w-fit">
          {[
            { key: 'browse', label: 'Browse Requests' },
            { key: 'post', label: 'Post a Request' },
            { key: 'mine', label: 'My Submissions' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key as Tab); setSelected(null) }}
              className={cn(
                'px-4 py-1.5 text-sm rounded transition-colors',
                tab === t.key
                  ? 'bg-surface font-medium text-ink shadow-sm border border-border'
                  : 'text-ink3 hover:text-ink'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Browse tab */}
        {tab === 'browse' && (
          <div>
            {loading ? (
              <div className="shimmer-bar rounded-full mb-4" />
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-ink4">No open requests yet.</p>
                <button onClick={() => setTab('post')} className="mt-2 text-sm text-amber hover:underline">
                  Post the first one
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {requests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => selectRequest(req)}
                      className={cn(
                        'text-left p-4 rounded-forge border transition-all',
                        selected?.id === req.id
                          ? 'border-ink bg-surface shadow-sm'
                          : 'border-border bg-surface hover:border-border2'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-ink line-clamp-1">{req.title}</p>
                        <span className={cn('tag shrink-0', statusColors[req.status])}>{req.status}</span>
                      </div>
                      <p className="text-xs text-ink3 leading-relaxed line-clamp-2 mb-3">{req.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="tag tag-amber">{req.budget}</span>
                        <span className="tag tag-gray">{req.category}</span>
                        <span className="text-[10px] text-ink4 ml-auto">{formatRelativeTime(req.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Detail panel */}
                {selected && (
                  <div className="bg-surface border border-border rounded-forge p-5 animate-fadeUp">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-base font-semibold text-ink mb-1">{selected.title}</h2>
                        <p className="text-sm text-ink3 leading-relaxed">{selected.description}</p>
                      </div>
                      <button
                        onClick={() => setSubmitModal(true)}
                        className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors whitespace-nowrap"
                      >
                        Submit Your Build
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-surface2 rounded-forge p-3 border border-border">
                        <p className="text-[10px] text-ink4 mb-0.5">Budget</p>
                        <p className="text-xs font-medium text-ink">{selected.budget}</p>
                      </div>
                      <div className="bg-surface2 rounded-forge p-3 border border-border">
                        <p className="text-[10px] text-ink4 mb-0.5">Deadline</p>
                        <p className="text-xs font-medium text-ink">{selected.deadline_days} days</p>
                      </div>
                      <div className="bg-surface2 rounded-forge p-3 border border-border">
                        <p className="text-[10px] text-ink4 mb-0.5">Category</p>
                        <p className="text-xs font-medium text-ink">{selected.category}</p>
                      </div>
                      <div className="bg-surface2 rounded-forge p-3 border border-border">
                        <p className="text-[10px] text-ink4 mb-0.5">Demo Required</p>
                        <p className="text-xs font-medium text-ink">{selected.demo_required ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    {selected.tags && selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {selected.tags.map((tag, i) => (
                          <span key={i} className="tag tag-gray">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Submissions */}
                    <div>
                      <p className="text-xs font-medium text-ink2 mb-2">
                        Submissions ({selectedSubmissions.length})
                      </p>
                      {selectedSubmissions.length === 0 ? (
                        <p className="text-xs text-ink4 py-2">No submissions yet. Be the first!</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedSubmissions.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-forge border border-border">
                              <div className="flex-1 min-w-0">
                                <a href={sub.demo_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs font-medium text-blue hover:underline truncate block">
                                  {sub.demo_url}
                                </a>
                                <p className="text-xs text-ink3 truncate">{sub.description}</p>
                              </div>
                              <span className={cn('tag shrink-0', submissionStatusColors[sub.status])}>{sub.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Post tab */}
        {tab === 'post' && (
          <div className="max-w-xl">
            {postSuccess ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-green-bg border border-green-border flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-green" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink mb-1">Request Posted!</p>
                <p className="text-xs text-ink4 mb-4">Your build request is now live in the marketplace.</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setPostSuccess(false)} className="px-4 py-2 text-sm border border-border rounded-forge text-ink3 hover:text-ink">
                    Post Another
                  </button>
                  <button onClick={() => { setTab('browse'); loadBrowse() }} className="px-4 py-2 text-sm bg-ink text-white rounded-forge hover:bg-ink2">
                    Browse Requests
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePost} className="bg-surface border border-border rounded-forge p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Title *</label>
                  <input
                    value={postForm.title}
                    onChange={(e) => setPostForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Build a Stripe billing dashboard with usage charts"
                    className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Description *</label>
                  <textarea
                    value={postForm.description}
                    onChange={(e) => setPostForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    placeholder="Describe what you need built, tech requirements, acceptance criteria..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink2 mb-1.5">Budget *</label>
                    <select
                      value={postForm.budget}
                      onChange={(e) => setPostForm(f => ({ ...f, budget: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink focus:outline-none focus:border-border2"
                    >
                      {BUDGETS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink2 mb-1.5">Deadline</label>
                    <select
                      value={postForm.deadline_days}
                      onChange={(e) => setPostForm(f => ({ ...f, deadline_days: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink focus:outline-none focus:border-border2"
                    >
                      {DEADLINES.map((d) => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Category *</label>
                  <select
                    value={postForm.category}
                    onChange={(e) => setPostForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink focus:outline-none focus:border-border2"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1.5">Company / Display Name (optional)</label>
                  <input
                    value={postForm.company_name}
                    onChange={(e) => setPostForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="Leave blank if anonymous"
                    className="w-full px-3 py-2 text-sm border border-border rounded-forge bg-surface2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>

                {/* Toggles */}
                <div className="border border-border rounded-forge overflow-hidden">
                  {[
                    { key: 'anonymous', label: 'Post anonymously', desc: 'Hide your identity from builders' },
                    { key: 'demo_required', label: 'Require demo', desc: 'Submissions must include a working demo' },
                    { key: 'notify_on_submission', label: 'Email notifications', desc: 'Get notified when builders submit' },
                  ].map((toggle, i) => (
                    <label
                      key={toggle.key}
                      className={cn(
                        'flex items-center justify-between p-3 cursor-pointer hover:bg-surface2 transition-colors',
                        i > 0 && 'border-t border-border'
                      )}
                    >
                      <div>
                        <p className="text-sm text-ink">{toggle.label}</p>
                        <p className="text-xs text-ink4">{toggle.desc}</p>
                      </div>
                      <div
                        className={cn(
                          'w-9 h-5 rounded-full transition-colors relative',
                          postForm[toggle.key as keyof typeof postForm] ? 'bg-ink' : 'bg-border'
                        )}
                        onClick={() => setPostForm(f => ({ ...f, [toggle.key]: !f[toggle.key as keyof typeof postForm] }))}
                      >
                        <div className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                          postForm[toggle.key as keyof typeof postForm] ? 'translate-x-4' : 'translate-x-0.5'
                        )} />
                      </div>
                    </label>
                  ))}
                </div>

                {postError && (
                  <div className="px-3 py-2 bg-red-bg border border-red-border rounded-forge text-xs text-red">
                    {postError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={posting}
                  className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {posting && (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                    </svg>
                  )}
                  Post Request — $75
                </button>

                <p className="text-[10px] text-ink4 text-center">
                  One-time listing fee. Request stays live for {postForm.deadline_days} days.
                </p>
              </form>
            )}
          </div>
        )}

        {/* My submissions tab */}
        {tab === 'mine' && (
          <div className="space-y-4">
            {loading ? (
              <div className="shimmer-bar rounded-full" />
            ) : myRequests.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-ink4 mb-2">No requests or submissions yet.</p>
                <button onClick={() => setTab('post')} className="text-sm text-amber hover:underline">
                  Post a request
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-ink4 mb-3">Your posted requests</p>
                <div className="space-y-2">
                  {myRequests.map((req) => (
                    <div key={req.id} className="bg-surface border border-border rounded-forge p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-ink">{req.title}</p>
                        <span className={cn('tag', statusColors[req.status])}>{req.status}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="tag tag-amber">{req.budget}</span>
                        <span className="tag tag-gray">{req.category}</span>
                        <span className="text-[10px] text-ink4 ml-auto">{formatRelativeTime(req.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {submitModal && selected && (
        <SubmitBuildModal
          requestId={selected.id}
          requestTitle={selected.title}
          onClose={() => setSubmitModal(false)}
          onSuccess={() => loadSubmissions(selected)}
        />
      )}
    </>
  )
}
